import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  Clock,
  Plane,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import type {
  SimulatedConnection,
  SimulatedCrew,
  SimulationResult,
  FlightNetworkData,
} from '../types/index.ts';
import { formatDuration } from '../utils/timeUtils.ts';

interface PassengerCrewImpactProps {
  currentResult: SimulationResult;
  dataset: FlightNetworkData;
}

export const PassengerCrewImpact: React.FC<PassengerCrewImpactProps> = ({
  currentResult,
  dataset,
}) => {
  const [activeTab, setActiveTab] = useState<'connections' | 'crews'>('connections');
  const [filterMissedOnly, setFilterMissedOnly] = useState<boolean>(false);
  const [filterViolationOnly, setFilterViolationOnly] = useState<boolean>(false);

  const { connections, crews, summary } = currentResult;

  const filteredConnections = filterMissedOnly
    ? connections.filter((c) => c.is_missed)
    : connections;

  const filteredCrews = filterViolationOnly
    ? crews.filter((c) => c.is_violation)
    : crews;

  const successfulConnectionsCount =
    summary.total_connections_count - summary.missed_connections_count;
  const compliantCrewsCount =
    summary.total_crews_count - summary.crew_duty_violations_count;

  return (
    <div className="space-y-6">
      {/* Top Impact KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Protection Rate */}
        <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Connection Integrity</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {successfulConnectionsCount}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {summary.total_connections_count} Banks Protected
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Missed Connections:</span>
            <span
              className={`font-mono font-bold ${
                summary.missed_connections_count > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {summary.missed_connections_count} banks
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.missed_connections_count === 0
                  ? 'bg-emerald-500'
                  : 'bg-red-500'
              }`}
              style={{
                width: `${Math.round(
                  (successfulConnectionsCount / summary.total_connections_count) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Affected Connection Passengers */}
        <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Affected Connection Passengers</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`mt-2 text-2xl font-bold font-mono ${
              summary.affected_connection_pax > 0 ? 'text-red-400' : 'text-slate-200'
            }`}
          >
            {summary.affected_connection_pax}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {summary.total_connecting_pax} Connecting Pax
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Protected Transfer Pax:</span>
            <span className="font-mono text-emerald-400 font-bold">
              {summary.total_connecting_pax - summary.affected_connection_pax} pax
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            *Sum across severed connecting-passenger records
          </div>
        </div>

        {/* Crew Duty Compliance */}
        <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Crew Statutory Duty Compliance</span>
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {compliantCrewsCount}{' '}
            <span className="text-xs font-normal text-slate-400">
              / {summary.total_crews_count} Compliant Rosters
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Statutory Rest Breaches:</span>
            <span
              className={`font-mono font-bold ${
                summary.crew_duty_violations_count > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {summary.crew_duty_violations_count}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.crew_duty_violations_count === 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{
                width: `${Math.round(
                  (compliantCrewsCount / summary.total_crews_count) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Max Duty Limit Reference */}
        <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Flight Duty Period (FDP) Limit</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
            600 <span className="text-xs font-normal text-slate-400">mins (10h 00m)</span>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Civil Aviation DGCA standard duty window
          </div>
          <div className="mt-1 text-[10px] text-slate-500 font-mono">
            Rosters exceeding limit require flight cancellation or relief crew
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-[#1e2f47] pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition ${
              activeTab === 'connections'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
            }`}
          >
            Passenger Connections Bank ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('crews')}
            className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition ${
              activeTab === 'crews'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-transparent'
            }`}
          >
            Crew Roster & Duty Logs ({crews.length})
          </button>
        </div>

        {/* Filter Toggle */}
        {activeTab === 'connections' ? (
          <label htmlFor="filter-missed-conn-checkbox" className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              id="filter-missed-conn-checkbox"
              type="checkbox"
              checked={filterMissedOnly}
              onChange={(e) => setFilterMissedOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Show Missed Only ({summary.missed_connections_count})</span>
          </label>
        ) : (
          <label htmlFor="filter-crew-violations-checkbox" className="flex items-center gap-2 text-xs font-mono text-slate-300 cursor-pointer">
            <input
              id="filter-crew-violations-checkbox"
              type="checkbox"
              checked={filterViolationOnly}
              onChange={(e) => setFilterViolationOnly(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Show Violations Only ({summary.crew_duty_violations_count})</span>
          </label>
        )}
      </div>

      {/* Tab 1: Connections Table with Visual Time Buffers */}
      {activeTab === 'connections' && (
        <div className="rounded-xl border border-[#1e2f47] bg-[#0d1522] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <caption className="sr-only">
                Passenger Transfer Connections Bank and Delay Impact Analysis
              </caption>
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 border-b border-[#1e2f47] uppercase text-[10px] tracking-wider select-none">
                  <th scope="col" className="py-3 px-3.5">Connection ID</th>
                  <th scope="col" className="py-3 px-3">Hub Airport</th>
                  <th scope="col" className="py-3 px-3">Inbound Flight</th>
                  <th scope="col" className="py-3 px-3">Connecting Flight</th>
                  <th scope="col" className="py-3 px-3">Transfer Pax</th>
                  <th scope="col" className="py-3 px-3">Connect Time (Avail vs Req)</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3.5">Causal Operational Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredConnections.map((conn) => {
                  const bufferMins = conn.available_connect_minutes - conn.min_connect_minutes;

                  return (
                    <tr
                      key={conn.connection_id}
                      className={`hover:bg-slate-800/40 transition ${
                        conn.is_missed ? 'bg-red-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-bold text-white">
                        {conn.connection_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-cyan-300">
                        {conn.airport}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="font-bold text-white">{conn.from_flight}</span>
                        <span className="text-[10px] text-slate-400 block">
                          Arr: {conn.from_revised_arr}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <span className="font-bold text-white">{conn.to_flight}</span>
                        <span className="text-[10px] text-slate-400 block">
                          Dep: {conn.to_revised_dep}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {conn.passengers} pax
                      </td>
                      <td className="py-2.5 px-3 min-w-[160px]">
                        {conn.available_connect_minutes < 0 ? (
                          <span className="text-red-400 font-bold">Flight Infeasible</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={`font-bold ${
                                  conn.is_missed ? 'text-red-400' : 'text-emerald-400'
                                }`}
                              >
                                {conn.available_connect_minutes}m avail
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                Req: {conn.min_connect_minutes}m
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  conn.is_missed ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      10,
                                      (conn.available_connect_minutes / (conn.min_connect_minutes * 2)) * 100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {conn.is_missed ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950/80 text-red-300 border border-red-700 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3 text-red-400" />
                            MISSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            PROTECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-300 max-w-xs truncate text-[11px]">
                        {conn.miss_reason || `Safe connect buffer (+${bufferMins}m margin).`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Crew Roster Table with Visual Duty Progress Bars */}
      {activeTab === 'crews' && (
        <div className="rounded-xl border border-[#1e2f47] bg-[#0d1522] overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <caption className="sr-only">
                Flight Crew Roster and Maximum Flight Duty Period Compliance Log
              </caption>
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 border-b border-[#1e2f47] uppercase text-[10px] tracking-wider select-none">
                  <th scope="col" className="py-3 px-3.5">Crew ID</th>
                  <th scope="col" className="py-3 px-3">Tail ID</th>
                  <th scope="col" className="py-3 px-3">Crew Base</th>
                  <th scope="col" className="py-3 px-3">Duty Start</th>
                  <th scope="col" className="py-3 px-3">Assigned Rotations</th>
                  <th scope="col" className="py-3 px-3">Duty Duration vs Max (600m)</th>
                  <th scope="col" className="py-3 px-3">Compliance</th>
                  <th scope="col" className="py-3 px-3.5">Violation Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCrews.map((crew) => {
                  const dutyPercentage = Math.round((crew.revised_duty_duration_mins / crew.max_duty_mins) * 100);
                  const isNearLimit = dutyPercentage >= 90 && !crew.is_violation;

                  return (
                    <tr
                      key={crew.crew_id}
                      className={`hover:bg-slate-800/40 transition ${
                        crew.is_violation ? 'bg-red-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 font-bold text-white">
                        {crew.crew_id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-300">
                        {crew.tail_id}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">
                        {crew.base}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {crew.duty_start}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        <span className="text-white font-bold">
                          {crew.flight_ids.length} legs:
                        </span>{' '}
                        {crew.flight_ids.join(' → ')}
                      </td>
                      <td className="py-2.5 px-3 min-w-[170px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-bold ${
                                crew.is_violation
                                  ? 'text-red-400'
                                  : isNearLimit
                                  ? 'text-amber-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              {crew.revised_duty_duration_mins}m ({formatDuration(crew.revised_duty_duration_mins)})
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              {dutyPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                crew.is_violation
                                  ? 'bg-red-500'
                                  : isNearLimit
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, dutyPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {crew.is_violation ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950/80 text-red-300 border border-red-700 flex items-center gap-1 w-fit">
                            <ShieldAlert className="w-3 h-3 text-red-400" />
                            EXCEEDED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            LEGAL
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {crew.is_violation ? (
                          <span className="text-red-400 font-bold font-mono">
                            +{crew.violation_margin_mins}m over limit
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono">
                            {crew.max_duty_mins - crew.revised_duty_duration_mins}m buffer
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
