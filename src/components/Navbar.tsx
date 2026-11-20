import React from 'react';
import {
  Plane,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Compass,
  GitBranch,
  ListFilter,
  BarChart3,
  Wrench,
  Bot,
  Activity,
  Zap,
} from 'lucide-react';
import type { SimulationResult, ClosureParams } from '../types/index.ts';

export type ActiveTab =
  | 'overview'
  | 'map'
  | 'simulator'
  | 'cascade'
  | 'flights'
  | 'impact'
  | 'recovery'
  | 'comparison'
  | 'ai';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentResult: SimulationResult;
  onReset: () => void;
  onQuickPresetBOM?: () => void;
  onQuickPresetDEL?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentResult,
  onReset,
  onQuickPresetBOM,
  onQuickPresetDEL,
}) => {
  const { summary, scenario_type, closure } = currentResult;

  const isBaseline = scenario_type === 'BASELINE';
  const isDisrupted = scenario_type === 'DISRUPTED';
  const isRecovered = scenario_type === 'RECOVERED';

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'map', label: 'Network Map', icon: <Compass className="w-4 h-4" /> },
    { id: 'simulator', label: 'Simulator', icon: <Clock className="w-4 h-4" /> },
    {
      id: 'cascade',
      label: 'Cascade Trace',
      icon: <GitBranch className="w-4 h-4" />,
      badge: currentResult.cascade_trace.length > 0 ? currentResult.cascade_trace.length : undefined,
    },
    {
      id: 'flights',
      label: 'Flight Ops',
      icon: <ListFilter className="w-4 h-4" />,
      badge: summary.delayed_flights_count > 0 ? summary.delayed_flights_count : undefined,
    },
    {
      id: 'impact',
      label: 'Pax & Crew',
      icon: <Users className="w-4 h-4" />,
      badge: summary.crew_duty_violations_count > 0 ? 'ALERT' : undefined,
    },
    {
      id: 'recovery',
      label: 'Recovery Centre',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'comparison',
      label: 'Comparison',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'ai',
      label: 'AI Dispatcher',
      icon: <Bot className="w-4 h-4" />,
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070b12]/95 backdrop-blur-md border-b border-[#1e2f47]">
      {/* Top Operations Bar */}
      <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-900/40 border border-cyan-500/40 shadow-[0_0_18px_rgba(0,229,255,0.25)]">
            <Plane className="w-5 h-5 text-cyan-400 rotate-45 transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-wider text-white font-mono">
                DOMINO<span className="text-cyan-400">SKY</span>
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 rounded-md">
                OPS-CENTER 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Airline Disruption Cascade & Recovery Simulator
            </p>
          </div>
        </div>

        {/* Center: Interactive Scenario Status Pill */}
        <div className="flex items-center gap-2">
          {isBaseline && (
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-300 text-xs font-mono font-semibold shadow-[0_0_12px_rgba(59,130,246,0.15)]">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              STATUS: BASELINE SCHEDULE (NOMINAL)
            </div>
          )}

          {isDisrupted && (
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/70 border border-red-500/60 text-red-300 text-xs font-mono font-semibold shadow-[0_0_15px_rgba(239,68,68,0.25)]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              STATUS: DISRUPTED ({closure?.airport} {closure?.start_str}-{closure?.end_str})
            </div>
          )}

          {isRecovered && (
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              STATUS: RECOVERY APPLIED
            </div>
          )}
        </div>

        {/* Right: Quick Scenario Shortcuts & Reset Button */}
        <div className="flex items-center gap-2.5">
          {/* Quick Presets for Instant Demo */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <button
              onClick={onQuickPresetBOM}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                closure?.airport === 'BOM'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Test Spec: BOM 09:00 - 10:30"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              BOM Fog (90m)
            </button>
            <button
              onClick={onQuickPresetDEL}
              className={`px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 ${
                closure?.airport === 'DEL'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="DEL Thunderstorm: 11:00 - 13:00"
            >
              DEL Storm
            </button>
          </div>

          {!isBaseline && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition shadow-sm"
              title="Reset simulation to initial baseline schedule"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset Baseline
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-[1700px] mx-auto px-4 flex space-x-1 overflow-x-auto scrollbar-none border-t border-[#141f30]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/25 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
                    item.badge === 'ALERT'
                      ? 'bg-red-900/80 text-red-200 border border-red-700'
                      : 'bg-cyan-900/60 text-cyan-200 border border-cyan-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
