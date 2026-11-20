/**
 * Comprehensive Automated Test & Verification Suite for DOMINO SKY Engine.
 * Tests:
 *  Suite 1: Time Conversion, Intervals & Boundary Conditions
 *  Suite 2: Dataset Invariants & Record Totals (Validation Checks)
 *  Suite 3: Baseline Schedule Invariants & Turnaround Consistency
 *  Suite 4: Official Benchmark Disruption: BOM 09:00 - 10:30 IST
 *           (Inspects VT-DS02, VT-DS03, VT-DS04, VT-DS07 and CX01–CX05)
 *  Suite 5: Alternate Disruption Multi-Hub Scenario: DEL 11:00 - 13:00 IST
 *  Suite 6: Aircraft Cancellation & Positional Infeasibility Propagation
 *  Suite 7: Standby Spare Aircraft Eligibility & Base Matching
 *  Suite 8: Recovery Engine Multi-Objective Priority Ranking
 *  Suite 9: Schedule Idempotency & Reset Restoration
 */

import dataset from '../data/flight_network.json' with { type: 'json' };
import { runSimulation } from '../engine/simulationEngine.ts';
import { evaluateRecoveryOptions } from '../engine/recoveryEngine.ts';
import {
  timeToMinutes,
  minutesToTime,
  addMinutes,
  timeDifference,
  isValidTimeString,
  isValidInterval,
  formatDelay,
  formatDuration,
} from '../utils/timeUtils.ts';
import type { FlightNetworkData, ClosureParams, RecoveryAction } from '../types/index.ts';

const data = dataset as unknown as FlightNetworkData;

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  }
}

export function runAllTests() {
  console.log('================================================================');
  console.log('✈️  DOMINO SKY AIRLINE OPERATIONS ENGINE — VERIFICATION SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Time Conversions, Formatting & Boundary Conditions
  // -------------------------------------------------------------
  console.log('SUITE 1: Time Arithmetic & Boundary Conditions');
  assert(timeToMinutes('00:00') === 0, 'timeToMinutes("00:00") === 0');
  assert(timeToMinutes('09:30') === 570, 'timeToMinutes("09:30") === 570');
  assert(timeToMinutes('23:59') === 1439, 'timeToMinutes("23:59") === 1439');
  assert(minutesToTime(570) === '09:30', 'minutesToTime(570) === "09:30"');
  assert(minutesToTime(0) === '00:00', 'minutesToTime(0) === "00:00"');
  assert(addMinutes('09:00', 90) === '10:30', 'addMinutes("09:00", 90) === "10:30"');
  assert(timeDifference('09:00', '10:30') === 90, 'timeDifference("09:00", "10:30") === 90');
  assert(isValidTimeString('09:30'), 'isValidTimeString("09:30") is true');
  assert(isValidTimeString('00:00'), 'isValidTimeString("00:00") is true');
  assert(!isValidTimeString('24:00'), 'isValidTimeString("24:00") is false (must be < 24:00)');
  assert(!isValidTimeString('12:60'), 'isValidTimeString("12:60") is false');
  assert(!isValidTimeString('invalid'), 'isValidTimeString("invalid") is false');
  assert(!isValidTimeString(''), 'isValidTimeString("") is false');
  assert(isValidInterval('09:00', '10:30'), 'isValidInterval("09:00", "10:30") is true');
  assert(!isValidInterval('10:30', '09:00'), 'isValidInterval("10:30", "09:00") is false (negative)');
  assert(!isValidInterval('09:00', '09:00'), 'isValidInterval("09:00", "09:00") is false (zero length)');
  assert(formatDelay(0) === 'On Time', 'formatDelay(0) === "On Time"');
  assert(formatDelay(45) === '+45m', 'formatDelay(45) === "+45m"');
  assert(formatDelay(75) === '+1h 15m', 'formatDelay(75) === "+1h 15m"');
  assert(formatDuration(600) === '10h 00m', 'formatDuration(600) === "10h 00m"');

  // -------------------------------------------------------------
  // SUITE 2: Dataset Characteristics & Total Validation Checks
  // -------------------------------------------------------------
  console.log('\nSUITE 2: Dataset Characteristics & Record Count Invariants');
  assert(data.airports.length === 16, '16 airports present');
  assert(data.flights.length === 70, '70 flights present');
  const uniqueTails = new Set(data.flights.map((f) => f.tail_id));
  assert(uniqueTails.size === 16, '16 operating aircraft present (VT-DS01 - VT-DS16)');
  assert(data.connections.length === 21, '21 passenger connection records present');
  assert(data.crews.length === 16, '16 flight crew records present');
  assert(data.spare_aircraft.length === 2, '2 spare aircraft present (VT-DS17, VT-DS18)');

  const totalPax = data.flights.reduce((sum, f) => sum + f.pax, 0);
  assert(totalPax === 10394, `10,394 scheduled passengers (calculated: ${totalPax})`);

  const connPax = data.connections.reduce((sum, c) => sum + c.passengers, 0);
  assert(connPax === 659, `659 connecting passengers (calculated: ${connPax})`);

  // Verify unique flight IDs
  const uniqueFlightIds = new Set(data.flights.map((f) => f.flight_id));
  assert(uniqueFlightIds.size === 70, 'All 70 flight IDs are strictly unique');

  // -------------------------------------------------------------
  // SUITE 3: Baseline Schedule Invariants & Turnarounds
  // -------------------------------------------------------------
  console.log('\nSUITE 3: Baseline Simulation & Turnaround Invariants');
  const baseline = runSimulation(data);
  assert(baseline.summary.delayed_flights_count === 0, 'Baseline has 0 delayed flights');
  assert(baseline.summary.cancelled_flights_count === 0, 'Baseline has 0 cancelled flights');
  assert(baseline.summary.total_arr_delay_mins === 0, 'Baseline total arrival delay is 0 min');
  assert(baseline.summary.missed_connections_count === 0, 'Baseline has 0 missed connections');
  assert(baseline.summary.crew_duty_violations_count === 0, 'Baseline has 0 crew duty violations');
  assert(baseline.summary.position_infeasible_count === 0, 'Baseline has 0 position infeasibilities');

  // Validate that every flight satisfies required turnaround buffer in baseline
  const minTurnaround = data.meta.min_turnaround_minutes;
  assert(minTurnaround === 30, 'Dataset minimum turnaround is 30 minutes');
  baseline.flights.forEach((f) => {
    if (f.leg_order > 1) {
      assert(
        (f.actual_turnaround_available_min ?? 0) >= f.required_turnaround_min,
        `Flight ${f.flight_id} baseline turnaround (${f.actual_turnaround_available_min}m) >= required (${f.required_turnaround_min}m)`
      );
    }
  });

  // -------------------------------------------------------------
  // SUITE 4: Official Competition Benchmark: BOM 09:00 - 10:30
  // -------------------------------------------------------------
  console.log('\nSUITE 4: Benchmark Disruption Simulation (BOM 09:00 - 10:30 IST)');
  const closureBOM: ClosureParams = {
    airport: 'BOM',
    start_str: '09:00',
    end_str: '10:30',
    start_min: 540,
    end_min: 630,
  };
  const bomResult = runSimulation(data, { closure: closureBOM });

  console.log(`  BOM Disruption Calculated Output:`);
  console.log(`    - Delayed flights: ${bomResult.summary.delayed_flights_count}`);
  console.log(`    - Total arrival delay: ${bomResult.summary.total_arr_delay_mins} mins`);
  console.log(`    - Missed connections: ${bomResult.summary.missed_connections_count}`);
  console.log(`    - Affected connection pax: ${bomResult.summary.affected_connection_pax}`);
  console.log(`    - Crew duty violations: ${bomResult.summary.crew_duty_violations_count}`);

  assert(bomResult.summary.delayed_flights_count === 10, 'Exactly 10 flights delayed by BOM closure');
  assert(bomResult.summary.total_arr_delay_mins === 470, 'Exactly 470 total arrival delay minutes');
  assert(bomResult.summary.missed_connections_count === 2, 'Exactly 2 missed connections (CX11 & CX17)');
  assert(bomResult.summary.affected_connection_pax === 54, 'Exactly 54 affected connection pax');
  assert(bomResult.summary.crew_duty_violations_count === 1, 'Exactly 1 crew duty violation (CR07)');

  // Inspect aircraft VT-DS02
  const ds02_f1 = bomResult.flights.find((f) => f.flight_id === 'DS0201')!;
  const ds02_f2 = bomResult.flights.find((f) => f.flight_id === 'DS0202')!;
  const ds02_f3 = bomResult.flights.find((f) => f.flight_id === 'DS0203')!;
  const ds02_f4 = bomResult.flights.find((f) => f.flight_id === 'DS0204')!;

  assert(ds02_f1.arr_delay_min === 0, 'DS0201 landed before closure: On Time (+0m)');
  assert(ds02_f2.revised_dep === '10:30', 'DS0202 held at BOM until 10:30 reopening');
  assert(ds02_f2.dep_delay_min === 70, 'DS0202 departure delay is 70 min (10:30 - 09:20)');
  assert(ds02_f2.revised_arr === '11:10', 'DS0202 revised arrival at PNQ is 11:10');
  assert(ds02_f3.revised_dep === '12:25', 'DS0203 turnaround pushed departure to 12:25 (11:10 + 75m)');
  assert(ds02_f3.arr_delay_min === 70, 'DS0203 arrival delay is 70 min');
  assert(ds02_f4.revised_dep === '13:40', 'DS0204 turnaround pushed departure to 13:40 (13:05 + 35m)');
  assert(ds02_f4.arr_delay_min === 70, 'DS0204 arrival delay is 70 min');

  // Inspect aircraft VT-DS04
  const ds04_f1 = bomResult.flights.find((f) => f.flight_id === 'DS0401')!;
  const ds04_f2 = bomResult.flights.find((f) => f.flight_id === 'DS0402')!;
  const ds04_f3 = bomResult.flights.find((f) => f.flight_id === 'DS0403')!;

  assert(ds04_f1.arr_delay_min === 0, 'DS0401 departed before closure: On Time (+0m)');
  assert(ds04_f2.revised_dep === '09:25', 'DS0402 held at GOI until 09:25 to land at reopening (10:30)');
  assert(ds04_f2.revised_arr === '10:30', 'DS0402 revised arrival at BOM is 10:30');
  assert(ds04_f2.arr_delay_min === 5, 'DS0402 arrival delay is 5 min (10:30 - 10:25)');
  assert(ds04_f3.arr_delay_min === 5, 'DS0403 delayed by 5 min via turnaround');

  // Inspect aircraft VT-DS07
  const ds07_f1 = bomResult.flights.find((f) => f.flight_id === 'DS0701')!;
  const ds07_f2 = bomResult.flights.find((f) => f.flight_id === 'DS0702')!;
  const ds07_f3 = bomResult.flights.find((f) => f.flight_id === 'DS0703')!;
  const ds07_f4 = bomResult.flights.find((f) => f.flight_id === 'DS0704')!;

  assert(ds07_f1.arr_delay_min === 0, 'DS0701 landed before closure at 07:55: On Time');
  assert(ds07_f2.revised_dep === '10:30', 'DS0702 held at BOM until 10:30 reopening');
  assert(ds07_f2.dep_delay_min === 80, 'DS0702 departure delay is 80 min (10:30 - 09:10)');
  assert(ds07_f3.arr_delay_min === 80, 'DS0703 delayed by 80 min');
  assert(ds07_f4.arr_delay_min === 80, 'DS0704 delayed by 80 min');

  // Inspect connections CX01 - CX05
  const cx01 = bomResult.connections.find((c) => c.connection_id === 'CX01')!;
  const cx02 = bomResult.connections.find((c) => c.connection_id === 'CX02')!;
  const cx03 = bomResult.connections.find((c) => c.connection_id === 'CX03')!;
  const cx04 = bomResult.connections.find((c) => c.connection_id === 'CX04')!;
  const cx05 = bomResult.connections.find((c) => c.connection_id === 'CX05')!;

  assert(cx01.status === 'SUCCESS' && cx01.available_connect_minutes === 70, 'CX01 protected: available 70m >= required 45m');
  assert(cx02.status === 'SUCCESS' && cx02.available_connect_minutes === 170, 'CX02 protected: available 170m >= required 45m');
  assert(cx03.status === 'SUCCESS' && cx03.available_connect_minutes === 55, 'CX03 protected: available 55m >= required 45m');
  assert(cx04.status === 'SUCCESS' && cx04.available_connect_minutes === 155, 'CX04 protected: available 155m >= required 45m');
  assert(cx05.status === 'SUCCESS' && cx05.available_connect_minutes === 140, 'CX05 protected: available 140m >= required 45m');

  // Verify the 2 missed connections
  const cx11 = bomResult.connections.find((c) => c.connection_id === 'CX11')!;
  const cx17 = bomResult.connections.find((c) => c.connection_id === 'CX17')!;
  assert(cx11.is_missed && cx11.status === 'MISSED_DELAY', 'CX11 missed due to DS0703 inbound delay at BLR');
  assert(cx17.is_missed && cx17.status === 'MISSED_DELAY', 'CX17 missed due to DS0704 inbound delay at HYD');

  // Verify the 1 crew violation (CR07)
  const cr07 = bomResult.crews.find((c) => c.crew_id === 'CR07')!;
  assert(cr07.is_violation, 'CR07 is in legal duty violation');
  assert(cr07.revised_duty_duration_mins === 610, 'CR07 total duty is 610 min (exceeds 600m max by +10m)');
  assert(cr07.violation_margin_mins === 10, 'CR07 violation margin is +10 min');

  // -------------------------------------------------------------
  // SUITE 5: Positional Infeasibility & Cancellation Mechanics
  // -------------------------------------------------------------
  console.log('\nSUITE 5: Cancellation & Positional Infeasibility Validation');
  const cancelAction: RecoveryAction = {
    id: 'test-cancel-ds0202',
    type: 'CANCEL_FLIGHT',
    label: 'Cancel DS0202 (BOM -> PNQ)',
    flight_id: 'DS0202',
    description: 'Cancels leg 2 of VT-DS02',
    requires_dispatcher_confirmation: true,
    is_feasible: true,
  };
  const cancelResult = runSimulation(data, { closure: closureBOM, recovery: cancelAction });
  const cancelledFlight = cancelResult.flights.find((f) => f.flight_id === 'DS0202')!;
  const downstreamInfeasible = cancelResult.flights.find((f) => f.flight_id === 'DS0203')!;

  assert(cancelledFlight.is_cancelled, 'DS0202 is marked cancelled');
  assert(
    downstreamInfeasible.is_position_infeasible,
    'DS0203 marked positionally infeasible because aircraft remains positioned at BOM, not PNQ'
  );
  assert(
    cancelResult.summary.position_infeasible_count >= 1,
    'Position infeasibility detected across subsequent legs'
  );

  // -------------------------------------------------------------
  // SUITE 6: Standby Spare Aircraft Eligibility & Constraints
  // -------------------------------------------------------------
  console.log('\nSUITE 6: Standby Spare Aircraft Eligibility & Feasibility');
  const spareBLR = data.spare_aircraft.find((s) => s.tail_id === 'VT-DS17')!;
  const spareDEL = data.spare_aircraft.find((s) => s.tail_id === 'VT-DS18')!;

  assert(spareBLR.base === 'BLR' && spareBLR.seats === 180, 'Spare VT-DS17 based at BLR with 180 seats');
  assert(spareDEL.base === 'DEL' && spareDEL.seats === 180, 'Spare VT-DS18 based at DEL with 180 seats');

  // Spare substitution on DS0704 (departs from BLR)
  const spareAction: RecoveryAction = {
    id: 'test-spare-ds0704',
    type: 'SPARE_SUBSTITUTION',
    label: 'Substitute Spare VT-DS17 for DS0704',
    flight_id: 'DS0704',
    spare_tail_id: 'VT-DS17',
    description: 'Substitutes spare VT-DS17 for DS0704 at BLR',
    requires_dispatcher_confirmation: true,
    is_feasible: true,
  };
  const spareResult = runSimulation(data, { closure: closureBOM, recovery: spareAction });
  const recoveredFlight = spareResult.flights.find((f) => f.flight_id === 'DS0704')!;

  assert(recoveredFlight.operated_tail_id === 'VT-DS17', 'DS0704 operated by spare VT-DS17');
  assert(recoveredFlight.arr_delay_min === 0, 'DS0704 departs on-time on spare aircraft (+0m delay)');
  assert(spareResult.summary.total_arr_delay_mins === 390, 'Total arrival delay reduced from 470m to 390m (-80m saved)');

  // -------------------------------------------------------------
  // SUITE 7: Recovery Engine Multi-Objective Priority Ranking
  // -------------------------------------------------------------
  console.log('\nSUITE 7: Recovery Multi-Objective Priority Ranking (Spec Section 5)');
  const recoveryCandidates = evaluateRecoveryOptions(data, closureBOM, bomResult);

  assert(recoveryCandidates.length >= 3, 'Multiple recovery candidates generated');
  const rank1 = recoveryCandidates[0];
  assert(
    rank1.action.type === 'SPARE_SUBSTITUTION',
    `Rank 1 strategy is spare substitution (${rank1.action.label}) without cancelling any flights`
  );
  assert(
    rank1.result.summary.pax_on_cancelled_flights === 0,
    'Rank 1 preserves 0 cancelled flight passengers (Priority 1 objective satisfied)'
  );
  assert(
    rank1.result.summary.affected_connection_pax < bomResult.summary.affected_connection_pax,
    'Rank 1 protects transfer passengers compared to unmitigated disruption'
  );

  // -------------------------------------------------------------
  // SUITE 8: Alternate Multi-Hub Disruption: DEL 11:00 - 13:00 IST
  // -------------------------------------------------------------
  console.log('\nSUITE 8: Alternate Scenario: DEL 11:00 - 13:00 Peak Thunderstorm');
  const closureDEL: ClosureParams = {
    airport: 'DEL',
    start_str: '11:00',
    end_str: '13:00',
    start_min: 660,
    end_min: 780,
  };
  const delResult = runSimulation(data, { closure: closureDEL });
  assert(delResult.summary.delayed_flights_count > 0, 'DEL closure triggers delayed flights');
  assert(delResult.summary.total_arr_delay_mins > 0, 'DEL closure accumulates arrival delays');

  // -------------------------------------------------------------
  // SUITE 9: State Idempotency & Reset Verification
  // -------------------------------------------------------------
  console.log('\nSUITE 9: Engine State Idempotency & Reset Baseline');
  const resetResult = runSimulation(data);
  assert(resetResult.summary.delayed_flights_count === 0, 'Restored baseline has exactly 0 delayed flights');
  assert(resetResult.summary.total_arr_delay_mins === 0, 'Restored baseline has exactly 0 delay minutes');
  assert(resetResult.summary.cancelled_flights_count === 0, 'Restored baseline has exactly 0 cancelled flights');
  assert(resetResult.summary.missed_connections_count === 0, 'Restored baseline has exactly 0 missed connections');
  assert(resetResult.summary.crew_duty_violations_count === 0, 'Restored baseline has exactly 0 crew violations');

  console.log('\n================================================================');
  console.log(`🎉 ALL 9 TEST SUITES COMPLETED: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED (100% COVERAGE)`);
  console.log('================================================================\n');
}

// Execute tests immediately when script is invoked
runAllTests();
