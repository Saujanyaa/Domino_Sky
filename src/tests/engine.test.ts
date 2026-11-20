// @ts-nocheck
/**
 * @fileoverview Node.js standard unit test suite for DOMINO SKY deterministic engines.
 * Uses native node:test and node:assert/strict supported out-of-the-box in Node 24.
 * @module tests/engine.test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dataset from '../data/flight_network.json' with { type: 'json' };
import type { FlightNetworkData } from '../types/index.ts';
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
import { runSimulation } from '../engine/simulationEngine.ts';
import { evaluateRecoveryOptions } from '../engine/recoveryEngine.ts';
import { projectCoordinates, generateArcPath } from '../utils/geoUtils.ts';
import {
  DEFAULT_MIN_TURNAROUND_MINUTES,
  MAX_CREW_DUTY_MINUTES,
  SPARE_CREW_WARNING_MESSAGE,
} from '../constants/operations.ts';

const data = dataset as unknown as FlightNetworkData;

describe('Time Arithmetic Utilities (Section 4.A)', () => {
  it('converts HH:MM strings to numerical minutes accurately', () => {
    assert.strictEqual(timeToMinutes('00:00'), 0);
    assert.strictEqual(timeToMinutes('06:15'), 375);
    assert.strictEqual(timeToMinutes('09:30'), 570);
    assert.strictEqual(timeToMinutes('12:00'), 720);
    assert.strictEqual(timeToMinutes('23:59'), 1439);
  });

  it('converts numerical minutes back to 24-hour HH:MM strings', () => {
    assert.strictEqual(minutesToTime(0), '00:00');
    assert.strictEqual(minutesToTime(375), '06:15');
    assert.strictEqual(minutesToTime(570), '09:30');
    assert.strictEqual(minutesToTime(1439), '23:59');
  });

  it('adds minutes correctly and handles boundary arithmetic', () => {
    assert.strictEqual(addMinutes('09:00', 90), '10:30');
    assert.strictEqual(addMinutes('10:30', 45), '11:15');
    assert.strictEqual(timeDifference('09:00', '10:30'), 90);
    assert.strictEqual(timeDifference('10:30', '09:00'), -90);
  });

  it('validates 24-hour time strings and interval boundaries', () => {
    assert.strictEqual(isValidTimeString('09:30'), true);
    assert.strictEqual(isValidTimeString('00:00'), true);
    assert.strictEqual(isValidTimeString('23:59'), true);
    assert.strictEqual(isValidTimeString('24:00'), false);
    assert.strictEqual(isValidTimeString('12:60'), false);
    assert.strictEqual(isValidTimeString('invalid'), false);
    assert.strictEqual(isValidTimeString(''), false);

    assert.strictEqual(isValidInterval('09:00', '10:30'), true);
    assert.strictEqual(isValidInterval('10:30', '09:00'), false);
    assert.strictEqual(isValidInterval('09:00', '09:00'), false);
  });

  it('formats delay and duration labels', () => {
    assert.strictEqual(formatDelay(0), 'On Time');
    assert.strictEqual(formatDelay(15), '+15m');
    assert.strictEqual(formatDelay(75), '+1h 15m');
    assert.strictEqual(formatDuration(600), '10h 00m');
    assert.strictEqual(formatDuration(610), '10h 10m');
  });
});

describe('Dataset Invariants & Validation Totals (Section 2)', () => {
  it('contains exact counts matching specification', () => {
    assert.strictEqual(data.airports.length, 16);
    assert.strictEqual(data.flights.length, 70);
    const uniqueTails = new Set(data.flights.map((f) => f.tail_id));
    assert.strictEqual(uniqueTails.size, 16);
    assert.strictEqual(data.connections.length, 21);
    assert.strictEqual(data.crews.length, 16);
    assert.strictEqual(data.spare_aircraft.length, 2);
  });

  it('validates passenger totals across flights and connections', () => {
    const totalScheduledPax = data.flights.reduce((sum, f) => sum + f.pax, 0);
    assert.strictEqual(totalScheduledPax, 10394);

    const totalConnectingPax = data.connections.reduce((sum, c) => sum + c.passengers, 0);
    assert.strictEqual(totalConnectingPax, 659);
  });

  it('validates spare aircraft configurations', () => {
    const blrSpare = data.spare_aircraft.find((s) => s.tail_id === 'VT-DS17');
    const delSpare = data.spare_aircraft.find((s) => s.tail_id === 'VT-DS18');

    assert.ok(blrSpare, 'VT-DS17 must exist');
    assert.strictEqual(blrSpare?.base, 'BLR');
    assert.strictEqual(blrSpare?.seats, 180);

    assert.ok(delSpare, 'VT-DS18 must exist');
    assert.strictEqual(delSpare?.base, 'DEL');
    assert.strictEqual(delSpare?.seats, 180);
  });
});

describe('Baseline Simulation & Turnaround Invariants (Section 4.B)', () => {
  it('runs nominal schedule with zero delays, cancellations, or violations', () => {
    const baseline = runSimulation(data);
    assert.strictEqual(baseline.summary.total_flights, 70);
    assert.strictEqual(baseline.summary.delayed_flights_count, 0);
    assert.strictEqual(baseline.summary.cancelled_flights_count, 0);
    assert.strictEqual(baseline.summary.total_arr_delay_mins, 0);
    assert.strictEqual(baseline.summary.missed_connections_count, 0);
    assert.strictEqual(baseline.summary.affected_connection_pax, 0);
    assert.strictEqual(baseline.summary.crew_duty_violations_count, 0);
    assert.strictEqual(baseline.summary.position_infeasible_count, 0);
  });

  it('verifies every flight turnaround respects max(dataset.min_turnaround, turnaround_before_min)', () => {
    const baseline = runSimulation(data);
    const flightsByTail = new Map<string, typeof baseline.flights>();
    baseline.flights.forEach((f) => {
      const list = flightsByTail.get(f.tail_id) || [];
      list.push(f);
      flightsByTail.set(f.tail_id, list);
    });

    flightsByTail.forEach((tailFlights) => {
      tailFlights.sort((a, b) => a.leg_order - b.leg_order);
      for (let i = 1; i < tailFlights.length; i++) {
        const prev = tailFlights[i - 1];
        const curr = tailFlights[i];
        const availableTurnaround = curr.sched_dep_min - prev.sched_arr_min;
        const requiredTurnaround = Math.max(
          DEFAULT_MIN_TURNAROUND_MINUTES,
          curr.turnaround_before_min || DEFAULT_MIN_TURNAROUND_MINUTES
        );
        assert.ok(
          availableTurnaround >= requiredTurnaround,
          `Turnaround on ${curr.flight_id} (${availableTurnaround}m) must be >= required (${requiredTurnaround}m)`
        );
      }
    });
  });
});

describe('Benchmark Disruption Simulation: BOM 09:00 - 10:30 (Section 4.C)', () => {
  const closure = {
    airport: 'BOM',
    start_str: '09:00',
    end_str: '10:30',
    start_min: 540,
    end_min: 630,
  };

  it('accurately computes benchmark delay cascade outputs', () => {
    const res = runSimulation(data, { closure });
    assert.strictEqual(res.summary.delayed_flights_count, 10);
    assert.strictEqual(res.summary.total_arr_delay_mins, 470);
    assert.strictEqual(res.summary.cancelled_flights_count, 0);
    assert.strictEqual(res.summary.missed_connections_count, 2);
    assert.strictEqual(res.summary.affected_connection_pax, 54);
    assert.strictEqual(res.summary.crew_duty_violations_count, 1);
  });

  it('verifies rotation propagation for VT-DS02', () => {
    const res = runSimulation(data, { closure });
    const getFlight = (id: string) => res.flights.find((f) => f.flight_id === id)!;

    const f1 = getFlight('DS0201');
    const f2 = getFlight('DS0202');
    const f3 = getFlight('DS0203');
    const f4 = getFlight('DS0204');

    assert.strictEqual(f1.arr_delay_min, 0);
    assert.strictEqual(f2.status, 'HELD_ORIGIN');
    assert.strictEqual(f2.revised_dep, '10:30');
    assert.strictEqual(f2.dep_delay_min, 70);
    assert.strictEqual(f2.revised_arr, '11:10');

    assert.strictEqual(f3.revised_dep, '12:25');
    assert.strictEqual(f3.arr_delay_min, 70);

    assert.strictEqual(f4.revised_dep, '13:40');
    assert.strictEqual(f4.arr_delay_min, 70);
  });

  it('verifies origin ground-hold for arriving flight VT-DS04 (DS0402)', () => {
    const res = runSimulation(data, { closure });
    const f = res.flights.find((x) => x.flight_id === 'DS0402')!;

    assert.strictEqual(f.status, 'HELD_DESTINATION');
    assert.strictEqual(f.revised_dep, '09:25');
    assert.strictEqual(f.revised_arr, '10:30');
    assert.strictEqual(f.arr_delay_min, 5);
  });

  it('verifies connection banks: CX01-CX05 protected, CX11 & CX17 missed', () => {
    const res = runSimulation(data, { closure });
    const getConn = (id: string) => res.connections.find((c) => c.connection_id === id)!;

    assert.strictEqual(getConn('CX01').is_missed, false);
    assert.strictEqual(getConn('CX02').is_missed, false);
    assert.strictEqual(getConn('CX03').is_missed, false);
    assert.strictEqual(getConn('CX04').is_missed, false);
    assert.strictEqual(getConn('CX05').is_missed, false);

    const cx11 = getConn('CX11');
    const cx17 = getConn('CX17');

    assert.strictEqual(cx11.is_missed, true);
    assert.strictEqual(cx17.is_missed, true);
    assert.strictEqual(cx11.passengers + cx17.passengers, 54);
  });

  it('verifies crew duty breach for CR07 (Section 4.E)', () => {
    const res = runSimulation(data, { closure });
    const cr07 = res.crews.find((c) => c.crew_id === 'CR07')!;

    assert.strictEqual(cr07.is_violation, true);
    assert.strictEqual(cr07.revised_duty_duration_mins, 610);
    assert.strictEqual(cr07.violation_margin_mins, 10);
    assert.strictEqual(cr07.max_duty_mins, MAX_CREW_DUTY_MINUTES);
  });
});

describe('Standby Spare Aircraft & Recovery Optimization (Sections 4.F & 5)', () => {
  const closure = {
    airport: 'BOM',
    start_str: '09:00',
    end_str: '10:30',
    start_min: 540,
    end_min: 630,
  };

  it('evaluates and ranks recovery candidates according to multi-objective priority tiers', () => {
    const disrupted = runSimulation(data, { closure });
    const options = evaluateRecoveryOptions(data, closure, disrupted);

    assert.ok(options.length >= 2, 'Should generate multiple recovery options');
    const rank1 = options[0];

    // Priority 1: Zero cancellations
    assert.strictEqual(rank1.result.summary.cancelled_flights_count, 0);
    assert.strictEqual(rank1.result.summary.pax_on_cancelled_flights, 0);

    // Spare substitution on DS0704
    assert.strictEqual(rank1.action.type, 'SPARE_SUBSTITUTION');
    assert.strictEqual(rank1.action.flight_id, 'DS0704');
    assert.strictEqual(rank1.action.spare_tail_id, 'VT-DS17');
    assert.strictEqual(rank1.action.confirmation_warning, SPARE_CREW_WARNING_MESSAGE);

    // Delay improvement
    assert.strictEqual(rank1.result.summary.total_arr_delay_mins, 390);
    assert.strictEqual(rank1.result.summary.affected_connection_pax, 31);
  });
});

describe('Geographic Projections & Map Utilities', () => {
  it('projects WGS84 geographic coordinates onto viewport canvas', () => {
    const ptBOM = projectCoordinates(19.0896, 72.8656);
    const ptDEL = projectCoordinates(28.5562, 77.1000);

    assert.ok(ptBOM.x > 0 && ptBOM.x < 800);
    assert.ok(ptBOM.y > 0 && ptBOM.y < 850);
    assert.ok(ptDEL.y < ptBOM.y, 'DEL (north) must have lower Y coordinate than BOM');
  });

  it('generates smooth quadratic Bézier flight route paths', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 400 };
    const path = generateArcPath(p1, p2, 0.15);

    assert.ok(path.startsWith('M 100 100 Q'));
    assert.ok(path.endsWith('300 400'));
  });
});
