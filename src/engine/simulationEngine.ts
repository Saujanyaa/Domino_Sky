import type {
  FlightNetworkData,
  RawFlight,
  SimulatedFlight,
  SimulatedConnection,
  SimulatedCrew,
  CascadeStep,
  ClosureParams,
  RecoveryAction,
  SimulationResult,
  ScenarioSummary,
} from '../types/index.ts';
import {
  timeToMinutes,
  minutesToTime,
} from '../utils/timeUtils.ts';
import {
  DEFAULT_MIN_TURNAROUND_MINUTES,
  MAX_CREW_DUTY_MINUTES,
} from '../constants/operations.ts';

export interface SimulationOptions {
  closure?: ClosureParams | null;
  recovery?: RecoveryAction | null;
}

/**
 * Deterministic Simulation Engine for DOMINO SKY.
 * Computes exact aircraft rotations, ground holds, delay cascades,
 * passenger connections, and crew duty limits.
 */
export function runSimulation(
  dataset: FlightNetworkData,
  options: SimulationOptions = {}
): SimulationResult {
  const { closure, recovery } = options;
  const isBaseline = !closure && (!recovery || recovery.type === 'NONE');

  // 1. Prepare raw flights with scheduled minute baselines
  const flightMap = new Map<string, RawFlight>();
  dataset.flights.forEach((f) => flightMap.set(f.flight_id, f));

  // Determine cancelled flight IDs from recovery
  const cancelledFlightIds = new Set<string>();
  let spareSwappedFlightId: string | null = null;
  let spareTailId: string | null = null;

  if (recovery) {
    if (recovery.type === 'CANCEL_FLIGHT' && recovery.flight_id) {
      cancelledFlightIds.add(recovery.flight_id);
    } else if (
      recovery.type === 'SPARE_SUBSTITUTION' &&
      recovery.flight_id &&
      recovery.spare_tail_id
    ) {
      spareSwappedFlightId = recovery.flight_id;
      spareTailId = recovery.spare_tail_id;
    }
  }

  // Group flights by aircraft tail_id
  const flightsByTail = new Map<string, RawFlight[]>();
  dataset.flights.forEach((f) => {
    const list = flightsByTail.get(f.tail_id) || [];
    list.push(f);
    flightsByTail.set(f.tail_id, list);
  });

  // Sort each tail's flights by leg_order ascending
  flightsByTail.forEach((list) => {
    list.sort((a, b) => a.leg_order - b.leg_order);
  });

  const simulatedFlightsMap = new Map<string, SimulatedFlight>();
  const cascadeSteps: CascadeStep[] = [];
  let stepCounter = 1;

  // Add closure step if active
  if (closure) {
    cascadeSteps.push({
      id: `step-${stepCounter++}`,
      step_number: 1,
      type: 'AIRPORT_CLOSURE',
      airport: closure.airport,
      time_str: `${closure.start_str} - ${closure.end_str}`,
      title: `Airport Closure Declared: ${closure.airport}`,
      description: `All operations suspended at ${closure.airport} from ${closure.start_str} to ${closure.end_str} (${closure.end_min - closure.start_min} min window).`,
      severity: 'critical',
      impact_minutes: closure.end_min - closure.start_min,
    });
  }

  // 2. Simulate rotations per aircraft tail
  // We process all tails deterministically
  const minTurnaroundDataset = dataset.meta.min_turnaround_minutes || DEFAULT_MIN_TURNAROUND_MINUTES;

  flightsByTail.forEach((tailFlights, tailId) => {
    let currentAircraftLocation = tailFlights.length > 0 ? tailFlights[0].origin : '';
    let previousFlightArrivalMin: number | null = null;
    let previousFlight: SimulatedFlight | null = null;
    let aircraftPositionValid = true;

    for (let i = 0; i < tailFlights.length; i++) {
      const flight = tailFlights[i];
      const schedDepMin = timeToMinutes(flight.dep);
      const schedArrMin = timeToMinutes(flight.arr);
      const blockMins = flight.block_minutes;

      // Check if spare substitution applies to this flight
      const isSubstituted = spareSwappedFlightId === flight.flight_id;
      const effectiveTail = isSubstituted && spareTailId ? spareTailId : tailId;

      // Required turnaround
      const requiredTurnaround =
        flight.leg_order === 1
          ? 0
          : Math.max(minTurnaroundDataset, flight.turnaround_before_min ?? 0);

      // Check cancellation
      const isExplicitlyCancelled = cancelledFlightIds.has(flight.flight_id);

      if (isExplicitlyCancelled) {
        // Flight is cancelled
        const simFlight: SimulatedFlight = {
          ...flight,
          sched_dep_min: schedDepMin,
          sched_arr_min: schedArrMin,
          revised_dep_min: schedDepMin,
          revised_arr_min: schedArrMin,
          revised_dep: flight.dep,
          revised_arr: flight.arr,
          dep_delay_min: 0,
          arr_delay_min: 0,
          status: 'CANCELLED',
          delay_reason: 'Flight cancelled by dispatcher recovery action.',
          is_cancelled: true,
          is_position_infeasible: false,
          operated_tail_id: effectiveTail,
          required_turnaround_min: requiredTurnaround,
          actual_turnaround_available_min: null,
          cascade_source: 'DISPATCHER_CANCELLATION',
        };
        simulatedFlightsMap.set(flight.flight_id, simFlight);

        cascadeSteps.push({
          id: `step-${stepCounter++}`,
          step_number: stepCounter,
          type: 'FLIGHT_CANCELLATION',
          flight_id: flight.flight_id,
          tail_id: effectiveTail,
          airport: flight.origin,
          time_str: flight.dep,
          title: `Flight Cancelled: ${flight.flight_id}`,
          description: `Flight ${flight.flight_id} (${flight.origin} → ${flight.destination}) cancelled. Aircraft ${effectiveTail} remains positioned at ${flight.origin}.`,
          severity: 'warning',
          affected_pax: flight.pax,
        });

        // Aircraft remains at origin of cancelled flight
        currentAircraftLocation = flight.origin;
        // Previous flight arrival is reset/stopped for downstream
        previousFlightArrivalMin = null;
        previousFlight = null;
        continue;
      }

      // Check positional feasibility
      // Aircraft must be at flight.origin
      if (flight.leg_order > 1 && currentAircraftLocation !== flight.origin) {
        aircraftPositionValid = false;
      }

      if (!aircraftPositionValid) {
        const simFlight: SimulatedFlight = {
          ...flight,
          sched_dep_min: schedDepMin,
          sched_arr_min: schedArrMin,
          revised_dep_min: schedDepMin,
          revised_arr_min: schedArrMin,
          revised_dep: flight.dep,
          revised_arr: flight.arr,
          dep_delay_min: 0,
          arr_delay_min: 0,
          status: 'POSITION_INFEASIBLE',
          delay_reason: `Positionally infeasible: Aircraft ${effectiveTail} is at ${currentAircraftLocation}, but flight departs from ${flight.origin}.`,
          is_cancelled: true,
          is_position_infeasible: true,
          operated_tail_id: effectiveTail,
          required_turnaround_min: requiredTurnaround,
          actual_turnaround_available_min: null,
          cascade_source: 'AIRCRAFT_MISPOSITION',
        };
        simulatedFlightsMap.set(flight.flight_id, simFlight);
        continue;
      }

      // If substituted with spare, rotation constraint from prior flight on original tail is broken
      // The spare starts fresh at its base
      let readyDepMin: number;
      let actualTurnaround: number | null = null;
      let rotationDelayReason: string | null = null;

      if (isSubstituted) {
        readyDepMin = schedDepMin;
        cascadeSteps.push({
          id: `step-${stepCounter++}`,
          step_number: stepCounter,
          type: 'SPARE_SUBSTITUTION',
          flight_id: flight.flight_id,
          tail_id: effectiveTail,
          airport: flight.origin,
          time_str: flight.dep,
          title: `Spare Aircraft Dispatched: ${effectiveTail}`,
          description: `Spare aircraft ${effectiveTail} from base ${flight.origin} substituted for flight ${flight.flight_id}, decoupling it from inbound delay.`,
          severity: 'recovery',
        });
      } else if (flight.leg_order === 1 || previousFlightArrivalMin === null) {
        readyDepMin = schedDepMin;
      } else {
        actualTurnaround = schedDepMin - previousFlightArrivalMin;
        const earliestFeasibleDep = previousFlightArrivalMin + requiredTurnaround;

        if (earliestFeasibleDep > schedDepMin) {
          readyDepMin = earliestFeasibleDep;
          const diff = earliestFeasibleDep - schedDepMin;
          rotationDelayReason = `Aircraft turnaround constraint: Inbound flight ${previousFlight?.flight_id} arrived at ${minutesToTime(
            previousFlightArrivalMin
          )} (required turnaround: ${requiredTurnaround} min). Earliest feasible departure is ${minutesToTime(
            earliestFeasibleDep
          )}.`;

          cascadeSteps.push({
            id: `step-${stepCounter++}`,
            step_number: stepCounter,
            type: 'ROTATION_PROPAGATION',
            flight_id: flight.flight_id,
            tail_id: effectiveTail,
            airport: flight.origin,
            time_str: minutesToTime(readyDepMin),
            title: `Rotation Delay Propagated: ${flight.flight_id}`,
            description: `Aircraft ${effectiveTail} arrived on ${previousFlight?.flight_id} at ${minutesToTime(
              previousFlightArrivalMin
            )}. Turnaround requires ${requiredTurnaround} min, pushing ${flight.flight_id} departure to ${minutesToTime(
              readyDepMin
            )} (+${diff}m).`,
            severity: diff > 45 ? 'critical' : 'warning',
            impact_minutes: diff,
          });
        } else {
          readyDepMin = schedDepMin;
        }
      }

      // 3. Apply Ground-Hold and Airport Closure logic
      let revisedDepMin = readyDepMin;
      let flightStatus: SimulatedFlight['status'] = 'ON_TIME';
      let delayReason: string | null = rotationDelayReason;
      let cascadeSource: string | null = rotationDelayReason ? previousFlight?.flight_id || 'ROTATION' : null;

      if (closure) {
        const { airport: closedAirport, start_min: cStart, end_min: cEnd, end_str } = closure;

        // Condition A: Flight departs from closed airport
        if (flight.origin === closedAirport) {
          if (readyDepMin >= cStart && readyDepMin < cEnd) {
            revisedDepMin = cEnd;
            flightStatus = 'HELD_ORIGIN';
            const holdMins = cEnd - readyDepMin;
            delayReason = `Ground hold at origin: Airport ${closedAirport} is closed until ${end_str}. Held for ${holdMins} min.`;
            cascadeSource = `CLOSURE_${closedAirport}`;

            cascadeSteps.push({
              id: `step-${stepCounter++}`,
              step_number: stepCounter,
              type: 'GROUND_HOLD_DEP',
              flight_id: flight.flight_id,
              tail_id: effectiveTail,
              airport: flight.origin,
              time_str: minutesToTime(revisedDepMin),
              title: `Ground Hold at Origin: ${flight.flight_id}`,
              description: `Flight ${flight.flight_id} held at ${flight.origin} due to airport closure until ${end_str}. Departure delayed by ${cEnd - schedDepMin} min.`,
              severity: 'critical',
              impact_minutes: cEnd - schedDepMin,
            });
          }
        }

        // Condition B: Flight arrives at closed airport
        if (flight.destination === closedAirport) {
          const estimatedArrAtReady = readyDepMin + blockMins;
          if (estimatedArrAtReady >= cStart && estimatedArrAtReady < cEnd) {
            // Must hold at origin so that arrival is at or after cEnd
            const requiredDepToArriveAfterClosure = cEnd - blockMins;
            const newDepMin = Math.max(readyDepMin, requiredDepToArriveAfterClosure);
            revisedDepMin = newDepMin;
            flightStatus = 'HELD_DESTINATION';
            delayReason = `Ground hold at origin: Destination ${closedAirport} closed until ${end_str}. Held at ${flight.origin} to arrive at reopening.`;
            cascadeSource = `CLOSURE_${closedAirport}`;

            cascadeSteps.push({
              id: `step-${stepCounter++}`,
              step_number: stepCounter,
              type: 'GROUND_HOLD_ARR',
              flight_id: flight.flight_id,
              tail_id: effectiveTail,
              airport: flight.origin,
              time_str: minutesToTime(revisedDepMin),
              title: `Ground Hold (Destination Closed): ${flight.flight_id}`,
              description: `Flight ${flight.flight_id} held at ${flight.origin} because destination ${closedAirport} is closed until ${end_str}. Revised arrival at ${end_str}.`,
              severity: 'critical',
              impact_minutes: revisedDepMin - schedDepMin,
            });
          }
        }
      }

      const revisedArrMin = revisedDepMin + blockMins;
      const depDelayMin = Math.max(0, revisedDepMin - schedDepMin);
      const arrDelayMin = Math.max(0, revisedArrMin - schedArrMin);

      if (flightStatus === 'ON_TIME' && arrDelayMin > 0) {
        flightStatus = 'DELAYED';
      }

      const simFlight: SimulatedFlight = {
        ...flight,
        sched_dep_min: schedDepMin,
        sched_arr_min: schedArrMin,
        revised_dep_min: revisedDepMin,
        revised_arr_min: revisedArrMin,
        revised_dep: minutesToTime(revisedDepMin),
        revised_arr: minutesToTime(revisedArrMin),
        dep_delay_min: depDelayMin,
        arr_delay_min: arrDelayMin,
        status: flightStatus,
        delay_reason: delayReason,
        is_cancelled: false,
        is_position_infeasible: false,
        operated_tail_id: effectiveTail,
        required_turnaround_min: requiredTurnaround,
        actual_turnaround_available_min:
          previousFlightArrivalMin !== null
            ? revisedDepMin - previousFlightArrivalMin
            : actualTurnaround,
        cascade_source: cascadeSource,
      };

      simulatedFlightsMap.set(flight.flight_id, simFlight);

      // Advance aircraft state
      currentAircraftLocation = flight.destination;
      previousFlightArrivalMin = revisedArrMin;
      previousFlight = simFlight;
    }
  });

  // Convert flight map back to array sorted by original order
  const simulatedFlights: SimulatedFlight[] = dataset.flights.map((f) =>
    simulatedFlightsMap.get(f.flight_id)!
  );

  // 4. Evaluate Passenger Connections
  const simulatedConnections: SimulatedConnection[] = dataset.connections.map(
    (conn) => {
      const fromFlight = simulatedFlightsMap.get(conn.from_flight);
      const toFlight = simulatedFlightsMap.get(conn.to_flight);

      if (!fromFlight || !toFlight) {
        return {
          ...conn,
          from_sched_arr: '00:00',
          from_revised_arr: '00:00',
          to_sched_dep: '00:00',
          to_revised_dep: '00:00',
          available_connect_minutes: 0,
          is_missed: true,
          status: 'MISSED_CANCELLED',
          miss_reason: 'Flight record not found in schedule',
        };
      }

      const fromSchedArr = fromFlight.arr;
      const fromRevisedArr = fromFlight.revised_arr;
      const toSchedDep = toFlight.dep;
      const toRevisedDep = toFlight.revised_dep;

      // If either flight is cancelled or positionally infeasible
      if (
        fromFlight.is_cancelled ||
        toFlight.is_cancelled ||
        fromFlight.is_position_infeasible ||
        toFlight.is_position_infeasible
      ) {
        const reason = fromFlight.is_cancelled
          ? `Inbound flight ${fromFlight.flight_id} cancelled.`
          : toFlight.is_cancelled
          ? `Connecting flight ${toFlight.flight_id} cancelled.`
          : 'Flight positionally infeasible.';

        cascadeSteps.push({
          id: `step-${stepCounter++}`,
          step_number: stepCounter,
          type: 'CONNECTION_MISSED',
          flight_id: conn.to_flight,
          airport: conn.airport,
          time_str: toFlight.revised_dep,
          title: `Passenger Connection Lost: ${conn.connection_id}`,
          description: `${conn.passengers} pax connection ${conn.from_flight} → ${conn.to_flight} at ${conn.airport} broken. ${reason}`,
          severity: 'critical',
          affected_pax: conn.passengers,
        });

        return {
          ...conn,
          from_sched_arr: fromSchedArr,
          from_revised_arr: fromRevisedArr,
          to_sched_dep: toSchedDep,
          to_revised_dep: toRevisedDep,
          available_connect_minutes: -999,
          is_missed: true,
          status: 'MISSED_CANCELLED',
          miss_reason: reason,
        };
      }

      // Calculate available connect time
      const availableConnectTime = toFlight.revised_dep_min - fromFlight.revised_arr_min;
      const isMissed = availableConnectTime < conn.min_connect_minutes;

      if (isMissed) {
        const shortfall = conn.min_connect_minutes - availableConnectTime;
        const reason = `Connection time ${availableConnectTime} min is below required ${conn.min_connect_minutes} min (shortfall: ${shortfall} min). Inbound arrived at ${fromRevisedArr}, connecting departs at ${toRevisedDep}.`;

        cascadeSteps.push({
          id: `step-${stepCounter++}`,
          step_number: stepCounter,
          type: 'CONNECTION_MISSED',
          flight_id: conn.to_flight,
          airport: conn.airport,
          time_str: toFlight.revised_dep,
          title: `Passenger Connection Missed: ${conn.connection_id}`,
          description: `${conn.passengers} passengers on ${conn.from_flight} miss connection to ${conn.to_flight} at ${conn.airport}. Available: ${availableConnectTime}m, Required: ${conn.min_connect_minutes}m.`,
          severity: 'critical',
          impact_minutes: shortfall,
          affected_pax: conn.passengers,
        });

        return {
          ...conn,
          from_sched_arr: fromSchedArr,
          from_revised_arr: fromRevisedArr,
          to_sched_dep: toSchedDep,
          to_revised_dep: toRevisedDep,
          available_connect_minutes: availableConnectTime,
          is_missed: true,
          status: 'MISSED_DELAY',
          miss_reason: reason,
        };
      }

      return {
        ...conn,
        from_sched_arr: fromSchedArr,
        from_revised_arr: fromRevisedArr,
        to_sched_dep: toSchedDep,
        to_revised_dep: toRevisedDep,
        available_connect_minutes: availableConnectTime,
        is_missed: false,
        status: 'SUCCESS',
        miss_reason: null,
      };
    }
  );

  // 5. Evaluate Crew Duty
  const simulatedCrews: SimulatedCrew[] = dataset.crews.map((crew) => {
    const dutyStartMin = timeToMinutes(crew.duty_start);

    // Find assigned flights
    const assignedFlights = crew.flight_ids
      .map((fid) => simulatedFlightsMap.get(fid))
      .filter((f): f is SimulatedFlight => f !== undefined);

    // Scheduled duty end = scheduled arrival of last flight
    const lastSchedFlight = assignedFlights[assignedFlights.length - 1];
    const scheduledDutyEndMin = lastSchedFlight ? lastSchedFlight.sched_arr_min : dutyStartMin;
    const scheduledDutyDurationMins = scheduledDutyEndMin - dutyStartMin;

    // Remaining operated flights
    const operatedFlights = assignedFlights.filter(
      (f) => !f.is_cancelled && !f.is_position_infeasible
    );

    if (operatedFlights.length === 0) {
      return {
        ...crew,
        duty_start_min: dutyStartMin,
        scheduled_duty_end_min: scheduledDutyEndMin,
        revised_duty_end_min: dutyStartMin,
        scheduled_duty_duration_mins: scheduledDutyDurationMins,
        revised_duty_duration_mins: 0,
        is_violation: false,
        violation_margin_mins: 0,
        operated_flights_count: 0,
        last_operated_flight_id: null,
      };
    }

    const lastOperatedFlight = operatedFlights[operatedFlights.length - 1];
    const revisedDutyEndMin = lastOperatedFlight.revised_arr_min;
    const revisedDutyDurationMins = revisedDutyEndMin - dutyStartMin;
    const maxDutyLimit = crew.max_duty_mins || MAX_CREW_DUTY_MINUTES;
    const isViolation = revisedDutyDurationMins > maxDutyLimit;
    const violationMarginMins = Math.max(0, revisedDutyDurationMins - maxDutyLimit);

    if (isViolation) {
      cascadeSteps.push({
        id: `step-${stepCounter++}`,
        step_number: stepCounter,
        type: 'CREW_DUTY_VIOLATION',
        tail_id: crew.tail_id,
        airport: crew.base,
        time_str: minutesToTime(revisedDutyEndMin),
        title: `Crew Duty Violation: ${crew.crew_id}`,
        description: `Crew ${crew.crew_id} (Base: ${crew.base}, Aircraft: ${crew.tail_id}) exceeds statutory limit. Total duty: ${revisedDutyDurationMins} min vs max ${crew.max_duty_mins} min (breached by +${violationMarginMins} min).`,
        severity: 'critical',
        impact_minutes: violationMarginMins,
      });
    }

    return {
      ...crew,
      duty_start_min: dutyStartMin,
      scheduled_duty_end_min: scheduledDutyEndMin,
      revised_duty_end_min: revisedDutyEndMin,
      scheduled_duty_duration_mins: scheduledDutyDurationMins,
      revised_duty_duration_mins: revisedDutyDurationMins,
      is_violation: isViolation,
      violation_margin_mins: violationMarginMins,
      operated_flights_count: operatedFlights.length,
      last_operated_flight_id: lastOperatedFlight.flight_id,
    };
  });

  // 6. Compute Aggregated Metrics & Summary
  const delayedFlights = simulatedFlights.filter(
    (f) => !f.is_cancelled && !f.is_position_infeasible && f.arr_delay_min > 0
  );
  const cancelledFlights = simulatedFlights.filter(
    (f) => f.is_cancelled && !f.is_position_infeasible
  );
  const infeasibleFlights = simulatedFlights.filter((f) => f.is_position_infeasible);

  const totalArrDelayMins = delayedFlights.reduce((sum, f) => sum + f.arr_delay_min, 0);
  const maxArrDelayMins = delayedFlights.reduce(
    (max, f) => Math.max(max, f.arr_delay_min),
    0
  );
  const avgDelayPerDelayedFlight =
    delayedFlights.length > 0 ? Math.round(totalArrDelayMins / delayedFlights.length) : 0;

  const missedConnections = simulatedConnections.filter((c) => c.is_missed);
  const affectedConnectionPax = missedConnections.reduce(
    (sum, c) => sum + c.passengers,
    0
  );

  const crewViolations = simulatedCrews.filter((c) => c.is_violation);
  const paxOnCancelledFlights = [...cancelledFlights, ...infeasibleFlights].reduce(
    (sum, f) => sum + f.pax,
    0
  );

  // Group delays by tail_id for most affected aircraft ranking
  const tailDelayMap = new Map<string, { total_delay: number; count: number }>();
  simulatedFlights.forEach((f) => {
    if (f.arr_delay_min > 0) {
      const entry = tailDelayMap.get(f.operated_tail_id) || { total_delay: 0, count: 0 };
      entry.total_delay += f.arr_delay_min;
      entry.count += 1;
      tailDelayMap.set(f.operated_tail_id, entry);
    }
  });

  const mostAffectedTails = Array.from(tailDelayMap.entries())
    .map(([tail_id, stats]) => ({
      tail_id,
      total_delay_mins: stats.total_delay,
      delayed_legs: stats.count,
    }))
    .sort((a, b) => b.total_delay_mins - a.total_delay_mins);

  const totalPax = dataset.flights.reduce((sum, f) => sum + f.pax, 0);
  const totalConnectingPax = dataset.connections.reduce(
    (sum, c) => sum + c.passengers,
    0
  );

  const summary: ScenarioSummary = {
    total_flights: dataset.flights.length,
    total_pax: totalPax,
    delayed_flights_count: delayedFlights.length,
    cancelled_flights_count: cancelledFlights.length + infeasibleFlights.length,
    position_infeasible_count: infeasibleFlights.length,
    total_arr_delay_mins: totalArrDelayMins,
    max_arr_delay_mins: maxArrDelayMins,
    avg_delay_per_delayed_flight: avgDelayPerDelayedFlight,
    missed_connections_count: missedConnections.length,
    total_connections_count: dataset.connections.length,
    affected_connection_pax: affectedConnectionPax,
    total_connecting_pax: totalConnectingPax,
    crew_duty_violations_count: crewViolations.length,
    total_crews_count: dataset.crews.length,
    pax_on_cancelled_flights: paxOnCancelledFlights,
    most_affected_tails: mostAffectedTails,
  };

  const scenarioType = isBaseline ? 'BASELINE' : recovery && recovery.type !== 'NONE' ? 'RECOVERED' : 'DISRUPTED';

  return {
    scenario_type: scenarioType,
    closure: closure || null,
    recovery_action: recovery || null,
    flights: simulatedFlights,
    connections: simulatedConnections,
    crews: simulatedCrews,
    cascade_trace: cascadeSteps,
    summary,
  };
}
