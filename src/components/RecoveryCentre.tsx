import React, { useMemo } from 'react';
import {
  Wrench,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Info,
} from 'lucide-react';
import type {
  FlightNetworkData,
  SimulationResult,
  ClosureParams,
  RecoveryAction,
  ScoredRecoveryOption,
} from '../types/index.ts';
import { evaluateRecoveryOptions } from '../engine/recoveryEngine.ts';

interface RecoveryCentreProps {
  dataset: FlightNetworkData;
  closure: ClosureParams | null;
  currentResult: SimulationResult;
  disruptedResult: SimulationResult;
  onApplyRecovery: (action: RecoveryAction) => void;
  onRevertRecovery: () => void;
}

export const RecoveryCentre: React.FC<RecoveryCentreProps> = ({
  dataset,
  closure,
  currentResult,
  disruptedResult,
  onApplyRecovery,
  onRevertRecovery,
}) => {
  // If no closure is active, recovery cannot be evaluated
  if (!closure) {
    return (
      <div className="p-12 text-center rounded-xl bg-[#0d1522] border border-[#1e2f47] space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
          <Wrench className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold font-mono text-white">
          NO ACTIVE DISRUPTION TO RECOVER
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The network is currently operating at baseline with 0 delays. Define an airport closure in the Disruption Simulator to activate recovery evaluations.
        </p>
      </div>
    );
  }

  // Evaluate candidate options deterministically
  const recoveryOptions: ScoredRecoveryOption[] = useMemo(() => {
    return evaluateRecoveryOptions(dataset, closure, disruptedResult);
  }, [dataset, closure, disruptedResult]);

  const activeRecovery = currentResult.recovery_action;
  const isRecovered = currentResult.scenario_type === 'RECOVERED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              Airline Operations Recovery Centre
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
              {recoveryOptions.length} Evaluated Candidates
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic operations research engine scoring recovery options against the {closure.airport} disruption.
          </p>
        </div>

        {isRecovered && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-mono text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Active: {activeRecovery?.label}
            </div>
            <button
              type="button"
              onClick={onRevertRecovery}
              className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Revert to Disrupted
            </button>
          </div>
        )}
      </div>

      {/* Priority Hierarchy Reference */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider mb-2">
          <Info className="w-4 h-4" aria-hidden="true" />
          Recovery Engine Priority Ordering (Spec Section 5):
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white">
            1. Min Cancelled Pax
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white">
            2. Min Missed Conn Pax
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white">
            3. Min Crew Violations
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white">
            4. Min Delay Mins
          </span>
          <span className="text-slate-400">→</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-white">
            5. Min Cancellations
          </span>
        </div>
      </div>

      {/* Ranked Candidate Cards */}
      <div className="space-y-4">
        {recoveryOptions.map((opt) => {
          const isSelected = activeRecovery?.id === opt.action.id;
          const s = opt.result.summary;
          const baseDisrupt = disruptedResult.summary;

          const isSpare = opt.action.type === 'SPARE_SUBSTITUTION';
          const isCancel = opt.action.type === 'CANCEL_FLIGHT';

          return (
            <div
              key={opt.action.id}
              className={`p-5 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : opt.rank === 1
                  ? 'bg-[#0e1726] border-cyan-500/60 shadow-[0_0_15px_rgba(0,229,255,0.1)]'
                  : 'bg-[#0d1522] border-[#1e2f47] hover:border-slate-700'
              }`}
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                      opt.rank === 1
                        ? 'bg-cyan-500 text-black shadow-md'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    #{opt.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-mono text-white">
                        {opt.action.label}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded border ${
                          isSpare
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : isCancel
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {opt.action.type.replace(/_/g, ' ')}
                      </span>
                      {opt.rank === 1 && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          RECOMMENDED STRATEGY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {opt.action.description}
                    </p>
                  </div>
                </div>

                {/* Apply Button */}
                <div>
                  {isSelected ? (
                    <div className="px-3.5 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Currently Applied
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApplyRecovery(opt.action)}
                      aria-label={`Apply recovery option: ${opt.action.label}`}
                      className={`px-4 py-2 rounded-lg font-mono text-xs font-bold transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        opt.rank === 1
                          ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                      }`}
                    >
                      Apply Recovery <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 py-3 text-xs font-mono">
                {/* Total Delay */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Total Delay:</span>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    +{s.total_arr_delay_mins}m
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {s.total_arr_delay_mins < baseDisrupt.total_arr_delay_mins ? (
                      <span className="text-emerald-400 font-bold">
                        -{baseDisrupt.total_arr_delay_mins - s.total_arr_delay_mins}m saved
                      </span>
                    ) : (
                      'Baseline delay'
                    )}
                  </div>
                </div>

                {/* Delayed Flights */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Delayed Flights:</span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {s.delayed_flights_count} flts
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Max: {s.max_arr_delay_mins}m
                  </div>
                </div>

                {/* Cancelled Pax */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Cancelled Pax:</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      s.pax_on_cancelled_flights > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {s.pax_on_cancelled_flights} pax
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {s.cancelled_flights_count} cancellations
                  </div>
                </div>

                {/* Missed Connections */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Missed Conn:</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      s.missed_connections_count > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {s.missed_connections_count} banks
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {s.total_connections_count - s.missed_connections_count} protected
                  </div>
                </div>

                {/* Affected Conn Pax */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Affected Conn Pax:</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      s.affected_connection_pax > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {s.affected_connection_pax} pax
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {s.affected_connection_pax < baseDisrupt.affected_connection_pax ? (
                      <span className="text-emerald-400 font-bold">
                        -{baseDisrupt.affected_connection_pax - s.affected_connection_pax} protected
                      </span>
                    ) : (
                      'Unprotected'
                    )}
                  </div>
                </div>

                {/* Crew Duty Violations */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Crew Violations:</span>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      s.crew_duty_violations_count > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {s.crew_duty_violations_count} rosters
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Limit: 600m
                  </div>
                </div>
              </div>

              {/* Feasibility Warning & Dispatcher Confirmation (Spec Section 4.F) */}
              {opt.action.confirmation_warning && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/50 text-amber-300 text-xs font-mono flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{opt.action.confirmation_warning}</span>
                </div>
              )}

              {/* Trade-off Breakdown & Reasoning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60 text-xs font-mono">
                {opt.pros.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-emerald-400 font-bold text-[10px] uppercase">
                      Operational Advantages:
                    </span>
                    {opt.pros.map((pro, i) => (
                      <div key={i} className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <span className="text-emerald-400">✓</span> {pro}
                      </div>
                    ))}
                  </div>
                )}

                {opt.cons.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-amber-400 font-bold text-[10px] uppercase">
                      Operational Penalties / Constraints:
                    </span>
                    {opt.cons.map((con, i) => (
                      <div key={i} className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                        <span className="text-amber-400">⚠</span> {con}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
