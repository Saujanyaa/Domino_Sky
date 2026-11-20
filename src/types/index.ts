export type Tier = 'mega_hub' | 'regional_hub' | 'spoke';

export interface Airport {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tier: Tier;
  capacity_per_hour: number;
}

export interface RawFlight {
  flight_id: string;
  tail_id: string;
  leg_order: number;
  origin: string;
  destination: string;
  dep: string; // HH:MM
  arr: string; // HH:MM
  block_minutes: number;
  pax: number;
  turnaround_before_min: number | null;
}

export interface Connection {
  connection_id: string;
  airport: string;
  from_flight: string;
  to_flight: string;
  passengers: number;
  min_connect_minutes: number;
}

export interface Crew {
  crew_id: string;
  tail_id: string;
  base: string;
  duty_start: string; // HH:MM
  max_duty_mins: number;
  flight_ids: string[];
}

export interface SpareAircraft {
  tail_id: string;
  base: string;
  available_from: string; // HH:MM
  seats: number;
}

export interface Meta {
  dataset: string;
  operating_day: string;
  min_turnaround_minutes: number;
  seats_per_aircraft: number;
  notes: string[];
}

export interface FlightNetworkData {
  meta: Meta;
  airports: Airport[];
  flights: RawFlight[];
  connections: Connection[];
  crews: Crew[];
  spare_aircraft: SpareAircraft[];
}

export type FlightOperationalStatus =
  | 'ON_TIME'
  | 'DELAYED'
  | 'CANCELLED'
  | 'HELD_ORIGIN'
  | 'HELD_DESTINATION'
  | 'POSITION_INFEASIBLE';

export interface SimulatedFlight extends RawFlight {
  sched_dep_min: number;
  sched_arr_min: number;
  revised_dep_min: number;
  revised_arr_min: number;
  revised_dep: string;
  revised_arr: string;
  dep_delay_min: number;
  arr_delay_min: number;
  status: FlightOperationalStatus;
  delay_reason: string | null;
  is_cancelled: boolean;
  is_position_infeasible: boolean;
  operated_tail_id: string;
  required_turnaround_min: number;
  actual_turnaround_available_min: number | null;
  cascade_source?: string | null;
}

export interface SimulatedConnection extends Connection {
  from_sched_arr: string;
  from_revised_arr: string;
  to_sched_dep: string;
  to_revised_dep: string;
  available_connect_minutes: number;
  is_missed: boolean;
  status: 'SUCCESS' | 'MISSED_DELAY' | 'MISSED_CANCELLED';
  miss_reason: string | null;
}

export interface SimulatedCrew extends Crew {
  duty_start_min: number;
  scheduled_duty_end_min: number;
  revised_duty_end_min: number;
  scheduled_duty_duration_mins: number;
  revised_duty_duration_mins: number;
  is_violation: boolean;
  violation_margin_mins: number;
  operated_flights_count: number;
  last_operated_flight_id: string | null;
}

export interface CascadeStep {
  id: string;
  step_number: number;
  type:
    | 'AIRPORT_CLOSURE'
    | 'GROUND_HOLD_DEP'
    | 'GROUND_HOLD_ARR'
    | 'ROTATION_PROPAGATION'
    | 'CONNECTION_MISSED'
    | 'CREW_DUTY_VIOLATION'
    | 'SPARE_SUBSTITUTION'
    | 'FLIGHT_CANCELLATION';
  flight_id?: string;
  tail_id?: string;
  airport?: string;
  time_str: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'recovery';
  impact_minutes?: number;
  affected_pax?: number;
}

export interface ClosureParams {
  airport: string;
  start_str: string;
  end_str: string;
  start_min: number;
  end_min: number;
}

export type RecoveryType =
  | 'NONE'
  | 'CANCEL_FLIGHT'
  | 'SPARE_SUBSTITUTION';

export interface RecoveryAction {
  id: string;
  type: RecoveryType;
  label: string;
  flight_id?: string;
  spare_tail_id?: string;
  description: string;
  requires_dispatcher_confirmation: boolean;
  confirmation_warning?: string;
  is_feasible: boolean;
  infeasibility_reason?: string;
}

export interface ScenarioSummary {
  total_flights: number;
  total_pax: number;
  delayed_flights_count: number;
  cancelled_flights_count: number;
  position_infeasible_count: number;
  total_arr_delay_mins: number;
  max_arr_delay_mins: number;
  avg_delay_per_delayed_flight: number;
  missed_connections_count: number;
  total_connections_count: number;
  affected_connection_pax: number;
  total_connecting_pax: number;
  crew_duty_violations_count: number;
  total_crews_count: number;
  pax_on_cancelled_flights: number;
  most_affected_tails: { tail_id: string; total_delay_mins: number; delayed_legs: number }[];
}

export interface SimulationResult {
  scenario_type: 'BASELINE' | 'DISRUPTED' | 'RECOVERED';
  closure: ClosureParams | null;
  recovery_action: RecoveryAction | null;
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  cascade_trace: CascadeStep[];
  summary: ScenarioSummary;
}

export interface ScoredRecoveryOption {
  action: RecoveryAction;
  result: SimulationResult;
  score: number;
  rank: number;
  pros: string[];
  cons: string[];
  reasoning: string;
}
