import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  ShieldAlert,
  Clock,
  Plane,
  Users,
  AlertTriangle,
  ArrowDown,
  Filter,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Layers,
  Search,
} from 'lucide-react';
import type { CascadeStep, SimulationResult, FlightNetworkData } from '../types/index.ts';

interface CascadeTraceProps {
  currentResult: SimulationResult;
  dataset: FlightNetworkData;
  onNavigateTab: (tab: any) => void;
}

export const CascadeTrace: React.FC<CascadeTraceProps> = ({
  currentResult,
  dataset,
  onNavigateTab,
}) => {
  const [selectedTail, setSelectedTail] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const { cascade_trace, scenario_type, closure, summary } = currentResult;

  // Extract unique tails from trace with step counts
  const tailStats = useMemo(() => {
    const map = new Map<string, number>();
    cascade_trace.forEach((step) => {
      if (step.tail_id) {
        map.set(step.tail_id, (map.get(step.tail_id) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [cascade_trace]);

  // Filter trace
  const filteredTrace = useMemo(() => {
    return cascade_trace.filter((step) => {
      if (selectedTail !== 'all' && step.tail_id && step.tail_id !== selectedTail) {
        return false;
      }
      if (selectedType !== 'all') {
        if (selectedType === 'closure' && step.type !== 'AIRPORT_CLOSURE') return false;
        if (
          selectedType === 'ground_hold' &&
          step.type !== 'GROUND_HOLD_DEP' &&
          step.type !== 'GROUND_HOLD_ARR'
        )
          return false;
        if (selectedType === 'rotation' && step.type !== 'ROTATION_PROPAGATION') return false;
        if (selectedType === 'connection' && step.type !== 'CONNECTION_MISSED') return false;
        if (selectedType === 'crew' && step.type !== 'CREW_DUTY_VIOLATION') return false;
      }
      if (searchFilter.trim() !== '') {
        const q = searchFilter.toLowerCase();
        const matches =
          step.title.toLowerCase().includes(q) ||
          step.description.toLowerCase().includes(q) ||
          (step.flight_id && step.flight_id.toLowerCase().includes(q)) ||
          (step.tail_id && step.tail_id.toLowerCase().includes(q)) ||
          (step.airport && step.airport.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [cascade_trace, selectedTail, selectedType, searchFilter]);

  const isBaseline = scenario_type === 'BASELINE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              Domino Disruption Cascade Trace
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full">
              {filteredTrace.length} Causal Events
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Chronological root-cause chain: Airport Closure → Ground Hold → Turnaround Violated → Downstream Delay → Missed Connection → Crew Exceeded.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Search in trace */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search flight, tail..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Plane className="w-4 h-4 text-cyan-400" />
            <label className="text-slate-300">Tail:</label>
            <select
              value={selectedTail}
              onChange={(e) => setSelectedTail(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Fleet ({cascade_trace.length} events)</option>
              {tailStats.map(([t, count]) => (
                <option key={t} value={t}>
                  {t} ({count} events)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <label className="text-slate-300">Class:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Event Types</option>
              <option value="closure">Airport Closures</option>
              <option value="ground_hold">Ground Holds (Dep / Arr)</option>
              <option value="rotation">Aircraft Rotation Propagation</option>
              <option value="connection">Missed Passenger Connections</option>
              <option value="crew">Crew Duty Exceeded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Cascade Content */}
      {isBaseline ? (
        <div className="p-12 text-center rounded-xl bg-[#0d1522] border border-[#1e2f47] space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold font-mono text-white">
            BASELINE SCHEDULE ACTIVE — NO CASCADE DETECTED
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All rotations are operating cleanly within required minimum turnarounds. Inject an airport disruption to observe the live domino cascade trace.
          </p>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="mt-2 px-4 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black transition shadow-lg"
          >
            Launch Disruption Simulator →
          </button>
        </div>
      ) : filteredTrace.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-[#0d1522] border border-[#1e2f47] text-xs font-mono text-slate-400">
          No cascade events match your current filter selection. Try selecting "All Fleet".
        </div>
      ) : (
        <div className="relative pl-6 md:pl-10 space-y-4 before:absolute before:left-3 md:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:via-amber-500 before:to-cyan-500">
          {filteredTrace.map((step, index) => {
            const isClosure = step.type === 'AIRPORT_CLOSURE';
            const isGroundHold = step.type === 'GROUND_HOLD_DEP' || step.type === 'GROUND_HOLD_ARR';
            const isRotation = step.type === 'ROTATION_PROPAGATION';
            const isConnection = step.type === 'CONNECTION_MISSED';
            const isCrew = step.type === 'CREW_DUTY_VIOLATION';
            const isSpare = step.type === 'SPARE_SUBSTITUTION';
            const isCancel = step.type === 'FLIGHT_CANCELLATION';

            let icon = <Clock className="w-4 h-4" />;
            let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
            let cardBorder = 'border-slate-800 hover:border-slate-700';

            if (isClosure) {
              icon = <ShieldAlert className="w-4 h-4 text-red-400" />;
              badgeBg = 'bg-red-950/80 text-red-300 border-red-700';
              cardBorder = 'border-red-500/60 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
            } else if (isGroundHold) {
              icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
              badgeBg = 'bg-amber-950/80 text-amber-300 border-amber-700';
              cardBorder = 'border-amber-600/50 bg-amber-950/15';
            } else if (isRotation) {
              icon = <Plane className="w-4 h-4 text-cyan-400" />;
              badgeBg = 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
              cardBorder = 'border-cyan-800/60 bg-cyan-950/10';
            } else if (isConnection) {
              icon = <Users className="w-4 h-4 text-red-400" />;
              badgeBg = 'bg-red-950/80 text-red-300 border-red-700';
              cardBorder = 'border-red-600/50 bg-red-950/15 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            } else if (isCrew) {
              icon = <ShieldAlert className="w-4 h-4 text-red-400" />;
              badgeBg = 'bg-red-950/80 text-red-300 border-red-700';
              cardBorder = 'border-red-500/70 bg-red-950/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            } else if (isSpare) {
              icon = <Sparkles className="w-4 h-4 text-emerald-400" />;
              badgeBg = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
              cardBorder = 'border-emerald-500/60 bg-emerald-950/20';
            } else if (isCancel) {
              icon = <AlertTriangle className="w-4 h-4 text-red-400" />;
              badgeBg = 'bg-red-950/80 text-red-300 border-red-700';
              cardBorder = 'border-red-600/60 bg-red-950/20';
            }

            return (
              <div key={step.id} className="relative group">
                {/* Timeline Node Pip */}
                <div
                  className={`absolute -left-6 md:-left-10 top-3.5 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#070b12] shadow-md z-10 ${
                    isClosure
                      ? 'bg-red-500'
                      : isCrew || isConnection
                      ? 'bg-red-500'
                      : isGroundHold
                      ? 'bg-amber-500'
                      : isSpare
                      ? 'bg-emerald-500'
                      : 'bg-cyan-500'
                  }`}
                >
                  <span className="text-[10px] font-bold text-black font-mono">
                    {index + 1}
                  </span>
                </div>

                {/* Event Card */}
                <div
                  className={`p-4 rounded-xl border ${cardBorder} bg-[#0d1522] transition-all duration-200 group-hover:scale-[1.005]`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-slate-900 border border-slate-800">
                        {icon}
                      </div>
                      <span className="text-xs font-mono font-bold text-white">
                        {step.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase border rounded ${badgeBg}`}
                      >
                        {step.type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      {step.tail_id && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-slate-800 font-bold">
                          Tail: {step.tail_id}
                        </span>
                      )}
                      {step.time_str && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {step.time_str}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-mono mt-2.5 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Impact Pills */}
                  {(step.impact_minutes !== undefined || step.affected_pax !== undefined) && (
                    <div className="mt-3 pt-2 border-t border-slate-800/50 flex flex-wrap items-center gap-3 text-xs font-mono">
                      {step.impact_minutes !== undefined && (
                        <span className="text-amber-400 font-bold">
                          Impact Delay: +{step.impact_minutes} min
                        </span>
                      )}
                      {step.affected_pax !== undefined && (
                        <span className="text-red-400 font-bold">
                          Disrupted Passengers: {step.affected_pax} pax
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
