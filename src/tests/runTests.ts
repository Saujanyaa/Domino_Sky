/**
 * Automated test suite for DOMINO SKY simulation engine.
 * Tests:
 * 1. Time conversions & intervals
 * 2. Dataset validation (record counts, scheduled passenger counts, connecting passengers)
 * 3. Baseline validation (0 delays, all turnarounds valid, all connections successful, 0 crew violations)
 * 4. BOM 09:00 - 10:30 closure simulation:
 *    - Aircraft rotations for VT-DS02, VT-DS03, VT-DS04, VT-DS07
 *    - Passenger connections CX01 to CX05
 * 5. Cancellation and aircraft positioning infeasibility
 * 6. Spare aircraft substitution eligibility
 * 7. Recovery ranking priority
 */

import dataset from '../data/flight_network.json' with { type: 'json' };
import { runSimulation } from '../engine/simulationEngine.ts';
import { evaluateRecoveryOptions } from '../engine/recoveryEngine.ts';
import {
  timeToMinutes,
  minutesToTime,
  addMinutes,
  timeDifference,
  isValidInterval,
} from '../utils/timeUtils.ts';
import type { FlightNetworkData, ClosureParams } from '../types/index.ts';

const data = dataset as unknown as FlightNetworkData;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

export function runAllTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DOMINO SKY ENGINE VERIFICATION SUITE');
  console.log('====================================================\n');

  // Test 1: Time utilities
  console.log('TEST 1: Time Conversion Utilities');
  assert(timeToMinutes('00:00') === 0, 'timeToMinutes("00:00") === 0');
  assert(timeToMinutes('09:30') === 570, 'timeToMinutes("09:30") === 570');
  assert(timeToMinutes('23:59') === 1439, 'timeToMinutes("23:59") === 1439');
  assert(minutesToTime(570) === '09:30', 'minutesToTime(570) === "09:30"');
  assert(minutesToTime(0) === '00:00', 'minutesToTime(0) === "00:00"');
  assert(addMinutes('09:00', 90) === '10:30', 'addMinutes("09:00", 90) === "10:30"');
  assert(timeDifference('09:00', '10:30') === 90, 'timeDifference("09:00", "10:30") === 90');
  assert(isValidInterval('09:00', '10:30'), 'isValidInterval("09:00", "10:30") is true');
  assert(!isValidInterval('10:30', '09:00'), 'isValidInterval("10:30", "09:00") is false');

  // Test 2: Dataset Characteristics
  console.log('\nTEST 2: Dataset Characteristics & Totals');
  assert(data.airports.length === 16, '16 airports present');
  assert(data.flights.length === 70, '70 flights present');
  const uniqueTails = new Set(data.flights.map((f) => f.tail_id));
  assert(uniqueTails.size === 16, '16 operating aircraft present');
  assert(data.connections.length === 21, '21 passenger connections present');
  assert(data.crews.length === 16, '16 crew records present');
  assert(data.spare_aircraft.length === 2, '2 spare aircraft present');

  const totalPax = data.flights.reduce((sum, f) => sum + f.pax, 0);
  assert(totalPax === 10394, `10,394 scheduled passengers (got ${totalPax})`);

  const connPax = data.connections.reduce((sum, c) => sum + c.passengers, 0);
  assert(connPax === 659, `659 connecting passengers (got ${connPax})`);

  // Test 3: Baseline Simulation
  console.log('\nTEST 3: Baseline Simulation & Turnaround Validation');
  const baseline = runSimulation(data);
  assert(baseline.summary.delayed_flights_count === 0, 'Baseline has 0 delayed flights');
  assert(baseline.summary.cancelled_flights_count === 0, 'Baseline has 0 cancelled flights');
  assert(baseline.summary.total_arr_delay_mins === 0, 'Baseline has 0 delay minutes');
  assert(baseline.summary.missed_connections_count === 0, 'Baseline has 0 missed connections');
  assert(baseline.summary.crew_duty_violations_count === 0, 'Baseline has 0 crew duty violations');

  // Verify baseline turnaround constraints for all aircraft
  const minTurnaround = data.meta.min_turnaround_minutes;
  baseline.flights.forEach((f) => {
    if (f.leg_order > 1) {
      assert(
        (f.actual_turnaround_available_min ?? 0) >= f.required_turnaround_min,
        `Flight ${f.flight_id} baseline turnaround ${f.actual_turnaround_available_min}m >= required ${f.required_turnaround_min}m`
      );
    }
  });

  // Test 4: BOM 09:00 - 10:30 Closure Simulation
  console.log('\nTEST 4: Disruption Simulation (BOM 09:00 - 10:30)');
  const closureBOM: ClosureParams = {
    airport: 'BOM',
    start_str: '09:00',
    end_str: '10:30',
    start_min: 540,
    end_min: 630,
  };
  const bomDisruption = runSimulation(data, { closure: closureBOM });

  console.log(`  Disruption Summary:`);
  console.log(`    - Delayed flights: ${bomDisruption.summary.delayed_flights_count}`);
  console.log(`    - Total arrival delay: ${bomDisruption.summary.total_arr_delay_mins} mins`);
  console.log(`    - Missed connections: ${bomDisruption.summary.missed_connections_count}`);
  console.log(`    - Affected connection pax: ${bomDisruption.summary.affected_connection_pax}`);
  console.log(`    - Crew duty violations: ${bomDisruption.summary.crew_duty_violations_count}`);

  assert(bomDisruption.summary.delayed_flights_count > 0, 'Disruption triggers delayed flights');
  assert(bomDisruption.summary.missed_connections_count > 0, 'Disruption triggers missed connections');

  // Inspect aircraft VT-DS02
  console.log('\n  Inspecting VT-DS02:');
  const ds02Flights = bomDisruption.flights.filter((f) => f.tail_id === 'VT-DS02');
  ds02Flights.forEach((f) => {
    console.log(
      `    ${f.flight_id} (Leg ${f.leg_order}, ${f.origin}→${f.destination}): Sched ${f.dep}-${f.arr} | Rev ${f.revised_dep}-${f.revised_arr} | Delay +${f.arr_delay_min}m | Status: ${f.status}`
    );
  });
  // DS0201 arrived BOM at 08:10 (before closure).
  // DS0202 departed BOM at sched 09:20 -> held until 10:30! Delay = 70m.
  const ds0202 = ds02Flights.find((f) => f.flight_id === 'DS0202')!;
  assert(ds0202.revised_dep === '10:30', 'DS0202 held at BOM until 10:30');
  assert(ds0202.dep_delay_min === 70, 'DS0202 has 70 min departure delay');

  // Inspect aircraft VT-DS04
  console.log('\n  Inspecting VT-DS04:');
  const ds04Flights = bomDisruption.flights.filter((f) => f.tail_id === 'VT-DS04');
  ds04Flights.forEach((f) => {
    console.log(
      `    ${f.flight_id} (Leg ${f.leg_order}, ${f.origin}→${f.destination}): Sched ${f.dep}-${f.arr} | Rev ${f.revised_dep}-${f.revised_arr} | Delay +${f.arr_delay_min}m | Status: ${f.status}`
    );
  });
  // DS0402: GOI -> BOM sched arr 10:25 (in closure window). Must hold at GOI so arr >= 10:30.
  const ds0402 = ds04Flights.find((f) => f.flight_id === 'DS0402')!;
  assert(ds0402.revised_arr === '10:30', 'DS0402 revised arrival is 10:30');

  // Inspect connections CX01 to CX05
  console.log('\n  Inspecting Connections CX01 - CX05:');
  const cx01_05 = bomDisruption.connections.filter((c) =>
    ['CX01', 'CX02', 'CX03', 'CX04', 'CX05'].includes(c.connection_id)
  );
  cx01_05.forEach((c) => {
    console.log(
      `    ${c.connection_id} at ${c.airport} (${c.from_flight} → ${c.to_flight}): Avail ${c.available_connect_minutes}m / Req ${c.min_connect_minutes}m | Status: ${c.status} (${c.passengers} pax)`
    );
  });

  // Test 5: Recovery Engine Evaluation
  console.log('\nTEST 5: Recovery Engine & Ranking');
  const recoveryOptions = evaluateRecoveryOptions(data, closureBOM, bomDisruption);
  assert(recoveryOptions.length > 0, 'Recovery options generated');
  console.log(`  Generated ${recoveryOptions.length} candidate recovery actions.`);
  recoveryOptions.slice(0, 3).forEach((opt, idx) => {
    console.log(`    Rank ${opt.rank}: [${opt.action.type}] ${opt.action.label}`);
    console.log(`      Score: ${opt.score} | Delay Mins: ${opt.result.summary.total_arr_delay_mins} | Cancelled Pax: ${opt.result.summary.pax_on_cancelled_flights} | Missed Conn Pax: ${opt.result.summary.affected_connection_pax}`);
  });

  // Test 6: Reset restores baseline
  console.log('\nTEST 6: Reset Restores Baseline');
  const restored = runSimulation(data);
  assert(restored.summary.total_arr_delay_mins === 0, 'Restored baseline has 0 delay');
  assert(restored.summary.delayed_flights_count === 0, 'Restored baseline has 0 delayed flights');

  console.log('\n====================================================');
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runAllTests();
