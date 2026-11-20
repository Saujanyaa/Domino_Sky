import React from 'react';
import {
  Plane,
  AlertTriangle,
  Clock,
  Users,
  ShieldAlert,
  Building2,
  GitBranch,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import type { SimulationResult, FlightNetworkData } from '../types/index.ts';
import type { ActiveTab } from './Navbar.tsx';

interface OperationsOverviewProps {
  currentResult: SimulationResult;
  baselineResult: SimulationResult;
  dataset: FlightNetworkData;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectPresetBOM: () => void;
}

/**
 * Operations Overview (Page A):
 * Displays high-density operational KPIs, fleet on-time performance health gauge,
 * live 16-station operational status radar, and most affected aircraft rotations.
 */
export const OperationsOverview: React.FC<OperationsOverviewProps> = ({
  currentResult,
  baselineResult: _baselineResult,
  dataset,
  onNavigateTab,
  onSelectPresetBOM,
}) => {
  const { summary, scenario_type, closure } = currentResult;
  const isBaseline = scenario_type === 'BASELINE';

  // Compute station statuses
  const airportStatusMap = new Map<
    string,
    { delayedInbound: number; delayedOutbound: number; isClosed: boolean }
  >();

  dataset.airports.forEach((apt) => {
    airportStatusMap.set(apt.id, {
      delayedInbound: 0,
      delayedOutbound: 0,
      isClosed: closure?.airport === apt.id,
    });
  });

  currentResult.flights.forEach((f) => {
    if (f.arr_delay_min > 0) {
      const destEntry = airportStatusMap.get(f.destination);
      if (destEntry) destEntry.delayedInbound += 1;
    }
    if (f.dep_delay_min > 0) {
      const origEntry = airportStatusMap.get(f.origin);
      if (origEntry) origEntry.delayedOutbound += 1;
    }
  });

  // Fleet health calculation
  const onTimeFlights =
    summary.total_flights - summary.delayed_flights_count - summary.cancelled_flights_count;
  const onTimePercentage = Math.round((onTimeFlights / summary.total_flights) * 100);

  return (
    <section aria-label="Operations Overview Dashboard" className="space-y-6">
      {/* Top Banner Alert / Welcome */}
      {isBaseline ? (
        <div
          role="region"
          aria-label="System Nominal Status Banner"
          className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-slate-900/60 border border-cyan-800/40 flex flex-wrap items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <CheckCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                FLEET SCHEDULE NOMINAL — ZERO DISRUPTIONS
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                All 70 flights on schedule across 16 stations. Turnarounds verified (min 30m). All 21 passenger connections protected.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectPresetBOM}
              aria-label="Simulate BOM 90-minute Disruption Scenario"
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              Simulate BOM Disruption (09:00 - 10:30)
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('simulator')}
              aria-label="Open Custom Disruption Simulator tab"
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/50 transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Custom Disruption <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 rounded-xl bg-gradient-to-r from-red-950/50 via-slate-900/80 to-amber-950/30 border border-red-500/40 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">
                  ACTIVE AIRPORT CLOSURE: {closure?.airport} ({closure?.start_str} - {closure?.end_str})
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-900/60 text-red-300 border border-red-700 rounded-full">
                  DOMINO CASCADE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                Ground-holds at {closure?.airport} have induced rotation delays across downstream legs, causing{' '}
                <span className="text-amber-300 font-bold">{summary.total_arr_delay_mins} min delay</span>,{' '}
                <span className="text-red-300 font-bold">{summary.missed_connections_count} broken connections ({summary.affected_connection_pax} connecting pax)</span>, and{' '}
                <span className="text-red-300 font-bold">{summary.crew_duty_violations_count} crew duty violations</span>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('cascade')}
              aria-label="View chronological domino cascade trace"
              className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
              View Domino Trace
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('recovery')}
              aria-label="Launch recovery centre to analyze solutions"
              className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Launch Recovery Centre
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div
        role="region"
        aria-label="Key Performance Indicators Grid"
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5"
      >
        {/* Total Flights & OTP */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Scheduled Flights</span>
            <Plane className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {summary.total_flights}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
            <span>On-Time: {onTimePercentage}%</span>
            <span className="text-cyan-400 font-mono font-semibold">{onTimeFlights} / {summary.total_flights}</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={onTimePercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fleet On-Time Performance Percentage"
            className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                onTimePercentage > 90 ? 'bg-emerald-500' : onTimePercentage > 75 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${onTimePercentage}%` }}
            />
          </div>
        </div>

        {/* Delayed Flights */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Delayed Flights</span>
            <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {summary.delayed_flights_count}
          </div>
          <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Total Delay Mins:</span>
            <span className="font-mono text-amber-300 font-bold">+{summary.total_arr_delay_mins}m</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Avg: {summary.avg_delay_per_delayed_flight}m / Max: {summary.max_arr_delay_mins}m
          </div>
        </div>

        {/* Cancelled Flights & Stranded Pax */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-red-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Cancelled Flights</span>
            <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-red-400">
            {summary.cancelled_flights_count}
          </div>
          <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Cancelled Pax:</span>
            <span className="font-mono text-red-300 font-semibold">{summary.pax_on_cancelled_flights}</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Pos. Infeasible: {summary.position_infeasible_count}
          </div>
        </div>

        {/* Missed Connections */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-red-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Missed Connections</span>
            <Users className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${summary.missed_connections_count > 0 ? 'text-red-400' : 'text-slate-200'}`}>
            {summary.missed_connections_count} <span className="text-xs text-slate-400 font-normal">/ {summary.total_connections_count}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Affected Transfer Pax:</span>
            <span className={`font-mono font-bold ${summary.affected_connection_pax > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {summary.affected_connection_pax} <span className="text-[10px] text-slate-400">/ {summary.total_connecting_pax}</span>
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            Bank Success: {summary.total_connections_count - summary.missed_connections_count} banks
          </div>
        </div>

        {/* Crew Duty Violations */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-red-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Crew Duty Exceeded</span>
            <ShieldAlert className="w-4 h-4 text-red-400" aria-hidden="true" />
          </div>
          <div className={`mt-2 text-2xl font-bold font-mono ${summary.crew_duty_violations_count > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {summary.crew_duty_violations_count} <span className="text-xs text-slate-400 font-normal">/ {summary.total_crews_count}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Max Legal Limit:</span>
            <span className="font-mono text-slate-300">600 mins (10h)</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400 font-mono">
            {summary.crew_duty_violations_count === 0 ? 'All 16 rosters compliant' : 'Statutory rest breach'}
          </div>
        </div>

        {/* Fleet Assets & Spares */}
        <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-slate-300 text-xs">
            <span>Fleet & Spares</span>
            <Building2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
            16 <span className="text-xs text-slate-300 font-normal">+ 2 Spares</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-300 flex items-center justify-between">
            <span>Standby Spares:</span>
            <span className="font-mono text-slate-200">BLR & DEL</span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-400 font-mono font-semibold">
            VT-DS17 & VT-DS18 (180 seats)
          </div>
        </div>
      </div>

      {/* Network Station Status & Most Affected Aircraft */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 16 Station Live Radar Matrix */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Network Station Operational Status (16 Stations)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Click station to inspect in Network Map
            </span>
          </div>

          <div
            role="region"
            aria-label="Airport Station Operational Matrix"
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5"
          >
            {dataset.airports.map((apt) => {
              const status = airportStatusMap.get(apt.id);
              const isClosed = status?.isClosed;
              const hasDelays = (status?.delayedInbound ?? 0) > 0 || (status?.delayedOutbound ?? 0) > 0;

              return (
                <div
                  key={apt.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Station ${apt.id} in ${apt.city}. Status: ${isClosed ? 'Closed' : hasDelays ? 'Delays' : 'Nominal'}`}
                  onClick={() => onNavigateTab('map')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigateTab('map');
                    }
                  }}
                  className={`p-2.5 rounded-lg border cursor-pointer transition flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                    isClosed
                      ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                      : hasDelays
                      ? 'bg-amber-950/20 border-amber-600/50 hover:border-amber-400'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isClosed
                            ? 'bg-red-500 animate-ping'
                            : hasDelays
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        aria-hidden="true"
                      />
                      {apt.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono capitalize">
                      {apt.tier === 'mega_hub' ? 'Mega' : apt.tier === 'regional_hub' ? 'Hub' : 'Spoke'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-200 truncate">
                    {apt.city}
                  </div>
                  <div className="mt-1 text-[10px] font-mono flex items-center justify-between text-slate-400">
                    {isClosed ? (
                      <span className="text-red-400 font-bold uppercase">CLOSED</span>
                    ) : hasDelays ? (
                      <span className="text-amber-400 font-semibold">
                        {status?.delayedInbound} in / {status?.delayedOutbound} out
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Nominal</span>
                    )}
                    <span className="text-slate-400">{apt.capacity_per_hour}/hr</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Most Affected Aircraft Tails */}
        <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Most Disrupted Rotations
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">By Delay Minutes</span>
            </div>

            {summary.most_affected_tails.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono border border-dashed border-slate-800 rounded-lg">
                No rotational delays recorded. Fleet operating at 100% on-time performance.
              </div>
            ) : (
              <div className="space-y-2.5">
                {summary.most_affected_tails.slice(0, 5).map((tail, idx) => {
                  const maxDelay = summary.most_affected_tails[0].total_delay_mins;
                  const barWidth = Math.max(10, Math.round((tail.total_delay_mins / maxDelay) * 100));

                  return (
                    <div
                      key={tail.tail_id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Inspect rotation delays for aircraft ${tail.tail_id}: ${tail.total_delay_mins} minutes delay across ${tail.delayed_legs} legs`}
                      onClick={() => onNavigateTab('cascade')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigateTab('cascade');
                        }
                      }}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                          {tail.tail_id}
                        </span>
                        <span className="font-mono font-bold text-amber-400">
                          +{tail.total_delay_mins}m ({tail.delayed_legs} legs)
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={tail.total_delay_mins}
                        aria-valuemin={0}
                        aria-valuemax={maxDelay}
                        aria-label={`Relative delay magnitude for aircraft ${tail.tail_id}`}
                        className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden"
                      >
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">Need immediate resolution?</span>
            <button
              type="button"
              onClick={() => onNavigateTab('recovery')}
              aria-label="Navigate to Recovery Centre to explore solutions"
              className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1 transition focus:outline-none focus:underline"
            >
              Analyze Recovery Options <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
