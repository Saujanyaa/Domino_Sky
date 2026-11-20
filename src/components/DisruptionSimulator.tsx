import React, { useState } from 'react';
import {
  Clock,
  Play,
  RotateCcw,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { FlightNetworkData, ClosureParams } from '../types/index.ts';
import { timeToMinutes, isValidTimeString, isValidInterval } from '../utils/timeUtils.ts';

interface DisruptionSimulatorProps {
  dataset: FlightNetworkData;
  activeClosure: ClosureParams | null;
  onRunSimulation: (closure: ClosureParams) => void;
  onReset: () => void;
}

export const DisruptionSimulator: React.FC<DisruptionSimulatorProps> = ({
  dataset,
  activeClosure,
  onRunSimulation,
  onReset,
}) => {
  const [selectedAirport, setSelectedAirport] = useState<string>(
    activeClosure?.airport || 'BOM'
  );
  const [startTime, setStartTime] = useState<string>(
    activeClosure?.start_str || '09:00'
  );
  const [endTime, setEndTime] = useState<string>(
    activeClosure?.end_str || '10:30'
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Preset scenarios
  const presets = [
    {
      id: 'bom-spec',
      label: 'BOM Morning Fog (Official Spec Test)',
      airport: 'BOM',
      start: '09:00',
      end: '10:30',
      description: 'Chhatrapati Shivaji Maharaj Intl (Mumbai) 90-minute ground stop. Evaluates VT-DS02, VT-DS04, VT-DS07 and CX01–CX05.',
      tag: 'COMPETITION BENCHMARK',
    },
    {
      id: 'del-storm',
      label: 'DEL Peak Thunderstorm',
      airport: 'DEL',
      start: '11:00',
      end: '13:00',
      description: 'Indira Gandhi Intl (Delhi) 2-hour runway convective closure during midday departure push.',
      tag: 'MEGA HUB DISRUPTION',
    },
    {
      id: 'blr-runway',
      label: 'BLR Runway Emergency Inspection',
      airport: 'BLR',
      start: '13:00',
      end: '14:30',
      description: 'Kempegowda Intl (Bengaluru) 90-minute closure impacting southern feeder shuttle loops.',
      tag: 'FEEDER ROTATION',
    },
    {
      id: 'hyd-atc',
      label: 'HYD ATC Radar Outage',
      airport: 'HYD',
      start: '07:00',
      end: '08:30',
      description: 'Rajiv Gandhi Intl (Hyderabad) early morning radar communications reboot.',
      tag: 'EARLY WAVE',
    },
  ];

  const handleApplyPreset = (preset: (typeof presets)[0]) => {
    setSelectedAirport(preset.airport);
    setStartTime(preset.start);
    setEndTime(preset.end);
    setValidationError(null);

    const startMin = timeToMinutes(preset.start);
    const endMin = timeToMinutes(preset.end);

    onRunSimulation({
      airport: preset.airport,
      start_str: preset.start,
      end_str: preset.end,
      start_min: startMin,
      end_min: endMin,
    });
  };

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidTimeString(startTime)) {
      setValidationError('Closure start time must be in valid HH:MM 24-hour format.');
      return;
    }
    if (!isValidTimeString(endTime)) {
      setValidationError('Closure end time must be in valid HH:MM 24-hour format.');
      return;
    }
    if (!isValidInterval(startTime, endTime)) {
      setValidationError('Closure end time must be strictly after closure start time.');
      return;
    }

    setValidationError(null);
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    onRunSimulation({
      airport: selectedAirport,
      start_str: startTime,
      end_str: endTime,
      start_min: startMin,
      end_min: endMin,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              Disruption Scenario Generator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Define a temporary airport operational shutdown to trigger the domino cascade engine.
          </p>
        </div>

        {activeClosure && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 font-mono text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Active: {activeClosure.airport} ({activeClosure.start_str} - {activeClosure.end_str})
            </div>
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          </div>
        )}
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Controls (1 col) */}
        <div className="p-5 rounded-xl bg-[#0d1522] border border-[#1e2f47] space-y-4">
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Custom Closure Parameters
          </h3>

          <form onSubmit={handleRun} className="space-y-4">
            {/* Airport Picker */}
            <div>
              <label htmlFor="simulator-airport-select" className="block text-xs font-mono text-slate-300 mb-1">
                Affected Airport Station:
              </label>
              <select
                id="simulator-airport-select"
                aria-label="Select airport station to close"
                value={selectedAirport}
                onChange={(e) => setSelectedAirport(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                {dataset.airports.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.id} — {apt.city} ({apt.name}) [{apt.tier.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>

            {/* Time Interval Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="simulator-start-time" className="block text-xs font-mono text-slate-300 mb-1">
                  Closure Start (IST):
                </label>
                <input
                  id="simulator-start-time"
                  type="text"
                  placeholder="09:00"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <span className="text-[10px] text-slate-400 font-mono">HH:MM format</span>
              </div>
              <div>
                <label htmlFor="simulator-end-time" className="block text-xs font-mono text-slate-300 mb-1">
                  Closure End (IST):
                </label>
                <input
                  id="simulator-end-time"
                  type="text"
                  placeholder="10:30"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <span className="text-[10px] text-slate-400 font-mono">HH:MM format</span>
              </div>
            </div>

            {/* Validation Message */}
            {validationError && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-2.5 rounded-lg bg-red-950/40 border border-red-700 text-red-300 text-xs font-mono flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Duration Summary */}
            {isValidInterval(startTime, endTime) && (
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Calculated Closure Window:</span>
                <span className="text-cyan-400 font-bold">
                  {timeToMinutes(endTime) - timeToMinutes(startTime)} minutes
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold font-mono text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-black" />
                Run Disruption Simulation
              </button>

              {activeClosure && (
                <button
                  type="button"
                  onClick={onReset}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore Clean Baseline
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Preset Operational Scenarios (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-[#0d1522] border border-[#1e2f47]">
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Verified Disruption Presets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isCurrent =
                  activeClosure?.airport === preset.airport &&
                  activeClosure?.start_str === preset.start &&
                  activeClosure?.end_str === preset.end;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      isCurrent
                        ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white">
                          {preset.label}
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                          {preset.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono w-full">
                      <span className="text-amber-400 font-bold">
                        {preset.airport} • {preset.start} - {preset.end}
                      </span>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1">
                        Run Preset →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operational Engine Assumptions Callout (Explicitly required by specs) */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold uppercase tracking-wider">
              <Info className="w-4 h-4" />
              Operational Ground-Hold Model Assumptions (Spec Section 4.C)
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-200">Full Operational Suspension:</strong> Closed airport cannot permit departures or accept arrivals during closure window [start, end).
              </li>
              <li>
                <strong className="text-slate-200">Origin Ground-Hold:</strong> Flights scheduled to depart from closed airport are held at the gate until reopening time.
              </li>
              <li>
                <strong className="text-slate-200">Destination Ground-Hold:</strong> Flights flying into closed airport are held at their origin stations so they arrive at or after reopening.
              </li>
              <li>
                <strong className="text-slate-200">Deterministic Rotation Propagation:</strong> Turnarounds respect max(dataset minimum 30m, flight turnaround_before_min) and only delay downstream flights when mechanically required.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
