/**
 * @fileoverview Domain operational constants and configurations for the DOMINO SKY simulation engine.
 * @module constants/operations
 * @license MIT
 */

/**
 * Standard minimum aircraft turnaround time in minutes as mandated by dataset specifications.
 * Applied when flight-specific turnaround is either unspecified or less than this threshold.
 */
export const DEFAULT_MIN_TURNAROUND_MINUTES: number = 30;

/**
 * Maximum legal crew flight duty period (FDP) in minutes (10 hours 00 minutes).
 * Prescribed under Civil Aviation Directorate General of Civil Aviation (DGCA) flight duty regulations.
 */
export const MAX_CREW_DUTY_MINUTES: number = 600;

/**
 * Standard minimum connection time (MCT) in minutes for domestic flight passenger transfers.
 */
export const DEFAULT_MIN_CONNECTION_MINUTES: number = 45;

/**
 * Official competition benchmark disruption scenario parameters.
 * Simulates a 90-minute morning fog/ground-stop at Mumbai Chhatrapati Shivaji Maharaj Intl (BOM).
 */
export const BENCHMARK_BOM_SCENARIO = Object.freeze({
  airport: 'BOM',
  start_str: '09:00',
  end_str: '10:30',
  start_min: 540,
  end_min: 630,
  description: 'Chhatrapati Shivaji Maharaj Intl (Mumbai) 90-minute ground stop. Evaluates VT-DS02, VT-DS04, VT-DS07 and CX01–CX05.',
  label: 'BOM Morning Fog (Official Spec Test)',
  tag: 'COMPETITION BENCHMARK',
});

/**
 * Secondary benchmark disruption scenario parameters.
 * Simulates a 120-minute convective thunderstorm at Delhi Indira Gandhi Intl (DEL).
 */
export const BENCHMARK_DEL_SCENARIO = Object.freeze({
  airport: 'DEL',
  start_str: '11:00',
  end_str: '13:00',
  start_min: 660,
  end_min: 780,
  description: 'Indira Gandhi Intl (Delhi) 2-hour runway convective closure during midday departure push.',
  label: 'DEL Peak Thunderstorm',
  tag: 'MEGA HUB DISRUPTION',
});

/**
 * Mandatory operational warning message displayed whenever a spare aircraft substitution is evaluated.
 * Prescribed verbatim by Section 4.F of the competition specification.
 */
export const SPARE_CREW_WARNING_MESSAGE =
  'Aircraft feasibility checked — crew assignment requires dispatcher confirmation.';

/**
 * Multi-objective recovery prioritization tiers as defined in Section 5 of the competition specification:
 * 1. Minimize passengers on cancelled flights.
 * 2. Minimize affected connection passengers.
 * 3. Minimize crew duty violations.
 * 4. Minimize total arrival delay minutes.
 * 5. Minimize number of cancellations.
 */
export const RECOVERY_PRIORITY_TIERS = Object.freeze([
  '1. Minimize passengers on cancelled flights',
  '2. Minimize affected connection passengers',
  '3. Minimize crew duty violations',
  '4. Minimize total arrival delay minutes',
  '5. Minimize number of cancellations',
] as const);

/**
 * Operating network baseline validation numbers.
 */
export const DATASET_VALIDATION_INVARIANTS = Object.freeze({
  AIRPORTS_COUNT: 16,
  FLIGHTS_COUNT: 70,
  OPERATING_AIRCRAFT_COUNT: 16,
  CONNECTIONS_COUNT: 21,
  CREWS_COUNT: 16,
  SPARE_AIRCRAFT_COUNT: 2,
  SCHEDULED_PASSENGERS: 10394,
  CONNECTING_PASSENGERS: 659,
});
