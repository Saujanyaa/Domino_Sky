import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  ShieldAlert,
  Plane,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { SimulationResult } from '../types/index.ts';

interface BeforeAfterComparisonProps {
  baselineResult: SimulationResult;
  disruptedResult: SimulationResult;
  recoveredResult: SimulationResult | null;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  baselineResult,
  disruptedResult,
  recoveredResult,
}) => {
  const b = baselineResult.summary;
  const d = disruptedResult.summary;
  const r = recoveredResult?.summary || null;

  const comparisonRows = [
    {
      metric: 'Delayed Flights',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      baseline: `${b.delayed_flights_count} flts`,
      disrupted: `${d.delayed_flights_count} flts`,
      recovered: r ? `${r.delayed_flights_count} flts` : '—',
      deltaRecoveredVsDisrupted: r ? r.delayed_flights_count - d.delayed_flights_count : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} flts` : `+${val} flts`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Total Arrival Delay',
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      baseline: `${b.total_arr_delay_mins} min`,
      disrupted: `+${d.total_arr_delay_mins} min`,
      recovered: r ? `+${r.total_arr_delay_mins} min` : '—',
      deltaRecoveredVsDisrupted: r ? r.total_arr_delay_mins - d.total_arr_delay_mins : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} min` : `+${val} min`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Cancelled Flights',
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      baseline: `${b.cancelled_flights_count} flts`,
      disrupted: `${d.cancelled_flights_count} flts`,
      recovered: r ? `${r.cancelled_flights_count} flts` : '—',
      deltaRecoveredVsDisrupted: r ? r.cancelled_flights_count - d.cancelled_flights_count : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} flts` : `+${val} flts`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Passengers on Cancelled Flights',
      icon: <Users className="w-4 h-4 text-red-400" />,
      baseline: `${b.pax_on_cancelled_flights} pax`,
      disrupted: `${d.pax_on_cancelled_flights} pax`,
      recovered: r ? `${r.pax_on_cancelled_flights} pax` : '—',
      deltaRecoveredVsDisrupted: r ? r.pax_on_cancelled_flights - d.pax_on_cancelled_flights : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} pax` : `+${val} pax`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Missed Connections',
      icon: <Users className="w-4 h-4 text-cyan-400" />,
      baseline: `${b.missed_connections_count} banks`,
      disrupted: `${d.missed_connections_count} banks`,
      recovered: r ? `${r.missed_connections_count} banks` : '—',
      deltaRecoveredVsDisrupted: r ? r.missed_connections_count - d.missed_connections_count : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} banks` : `+${val} banks`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Affected Connection Passengers',
      icon: <Users className="w-4 h-4 text-amber-400" />,
      baseline: `${b.affected_connection_pax} pax`,
      disrupted: `${d.affected_connection_pax} pax`,
      recovered: r ? `${r.affected_connection_pax} pax` : '—',
      deltaRecoveredVsDisrupted: r ? r.affected_connection_pax - d.affected_connection_pax : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} pax` : `+${val} pax`),
      isGoodWhenLower: true,
    },
    {
      metric: 'Crew Duty Limit Violations',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      baseline: `${b.crew_duty_violations_count} crews`,
      disrupted: `${d.crew_duty_violations_count} crews`,
      recovered: r ? `${r.crew_duty_violations_count} crews` : '—',
      deltaRecoveredVsDisrupted: r ? r.crew_duty_violations_count - d.crew_duty_violations_count : 0,
      formatDelta: (val: number) => (val <= 0 ? `${val} rosters` : `+${val} rosters`),
      isGoodWhenLower: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47]">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
            Operational Matrix: Baseline vs Disrupted vs Recovered
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Direct comparative analysis across all 3 scenario states calculated by the deterministic engine.
        </p>
      </div>

      {/* Three Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* Baseline Pillar */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/50">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-blue-400">STATE 1: BASELINE</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-950 text-blue-300 border border-blue-800">
              NOMINAL
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Delay:</span>
              <span className="font-bold text-emerald-400">0 min</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Delayed Flights:</span>
              <span>0 / 70</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Missed Connections:</span>
              <span className="font-bold text-emerald-400">0 / 21</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Crew Violations:</span>
              <span className="font-bold text-emerald-400">0 / 16</span>
            </div>
          </div>
        </div>

        {/* Disrupted Pillar */}
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-red-400">
              STATE 2: DISRUPTED ({disruptedResult.closure?.airport || 'NONE'})
            </span>
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-red-950 text-red-300 border border-red-800">
              CASCADE ACTIVE
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Delay:</span>
              <span className="font-bold text-amber-400">+{d.total_arr_delay_mins} min</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Delayed Flights:</span>
              <span className="text-amber-400 font-bold">{d.delayed_flights_count} / 70</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Missed Connections:</span>
              <span className="text-red-400 font-bold">{d.missed_connections_count} / 21 ({d.affected_connection_pax} pax)</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Crew Violations:</span>
              <span className="text-red-400 font-bold">{d.crew_duty_violations_count} / 16</span>
            </div>
          </div>
        </div>

        {/* Recovered Pillar */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400">STATE 3: RECOVERED</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              {r ? 'RECOVERY ACTIVE' : 'PENDING ACTION'}
            </span>
          </div>
          {r ? (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Delay:</span>
                <span className="font-bold text-emerald-400">+{r.total_arr_delay_mins} min</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Delayed Flights:</span>
                <span className="text-emerald-400 font-bold">{r.delayed_flights_count} / 70</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Missed Connections:</span>
                <span className="text-emerald-400 font-bold">{r.missed_connections_count} / 21 ({r.affected_connection_pax} pax)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Crew Violations:</span>
                <span className="text-emerald-400 font-bold">{r.crew_duty_violations_count} / 16</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 text-center text-xs text-slate-500 py-3">
              Apply a candidate from the Recovery Centre to view recovered scenario metrics.
            </div>
          )}
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Table */}
      <div className="rounded-xl border border-[#1e2f47] bg-[#0d1522] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-[#1e2f47] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Operational Performance Metric</th>
                <th className="py-3 px-4">Baseline (Nominal)</th>
                <th className="py-3 px-4">Disrupted State</th>
                <th className="py-3 px-4">Recovered State</th>
                <th className="py-3 px-4 text-right">Recovery Improvement Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comparisonRows.map((row, idx) => {
                const delta = row.deltaRecoveredVsDisrupted;
                const isImproved = row.isGoodWhenLower ? delta < 0 : delta > 0;
                const isNeutral = delta === 0;

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-white font-semibold flex items-center gap-2">
                      {row.icon}
                      {row.metric}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.baseline}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold">{row.disrupted}</td>
                    <td className="py-3 px-4 text-emerald-300 font-bold">{row.recovered}</td>
                    <td className="py-3 px-4 text-right">
                      {r ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            isImproved
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : isNeutral
                              ? 'text-slate-400'
                              : 'bg-red-950 text-red-300 border border-red-700'
                          }`}
                        >
                          {row.formatDelta(delta)}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
