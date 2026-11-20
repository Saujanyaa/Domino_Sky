import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  Key,
  Send,
  Loader2,
  CheckCircle2,
  Info,
  Terminal,
  AlertTriangle,
} from 'lucide-react';
import type {
  SimulationResult,
  FlightNetworkData,
  ScoredRecoveryOption,
} from '../types/index.ts';
import {
  generateDeterministicBriefing,
  queryGeminiDispatcher,
} from '../utils/aiDispatcher.ts';

interface AiDispatcherProps {
  currentResult: SimulationResult;
  baselineResult: SimulationResult;
  dataset: FlightNetworkData;
  topRecovery?: ScoredRecoveryOption;
}

export const AiDispatcher: React.FC<AiDispatcherProps> = ({
  currentResult,
  baselineResult,
  dataset,
  topRecovery,
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPromptContext, setShowPromptContext] = useState<boolean>(false);

  // Always generate deterministic rule-based operational briefing from calculated engine figures
  const deterministicBriefing = generateDeterministicBriefing(
    currentResult,
    baselineResult,
    dataset,
    topRecovery
  );

  // Prepare structured JSON context string
  const promptContext = JSON.stringify(
    {
      scenario_status: currentResult.scenario_type,
      active_closure: currentResult.closure,
      summary_metrics: currentResult.summary,
      most_affected_aircraft: currentResult.summary.most_affected_tails,
      missed_connections_count: currentResult.summary.missed_connections_count,
      affected_connecting_pax: currentResult.summary.affected_connection_pax,
      crew_duty_violations: currentResult.crews
        .filter((c) => c.is_violation)
        .map((c) => ({
          crew_id: c.crew_id,
          tail_id: c.tail_id,
          base: c.base,
          duty_duration: c.revised_duty_duration_mins,
          exceeded_by: c.violation_margin_mins,
        })),
      recommended_recovery: topRecovery
        ? {
            action: topRecovery.action.label,
            type: topRecovery.action.type,
            reasoning: topRecovery.reasoning,
            score: topRecovery.score,
            pros: topRecovery.pros,
            cons: topRecovery.cons,
          }
        : null,
    },
    null,
    2
  );

  const handleRunGemini = async () => {
    if (!apiKey.trim()) {
      setApiError('Please enter a valid Gemini API key.');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const response = await queryGeminiDispatcher(apiKey, promptContext);
      setGeminiAnalysis(response);
    } catch (err: any) {
      setApiError(err.message || 'Failed to query Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              AI Flight Dispatcher Intelligence
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full">
              DETERMINISTIC + GEMINI READY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Synthesizes root causes, rotation physics, passenger jeopardy, and recovery trade-offs from exact calculated metrics.
          </p>
        </div>

        {/* Gemini API Key Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            {showKeyInput ? 'Hide Gemini Settings' : 'Configure Gemini API Key'}
          </button>
        </div>
      </div>

      {/* Optional Gemini API Configuration Bar */}
      {showKeyInput && (
        <div className="p-4 rounded-xl bg-slate-900 border border-cyan-800/40 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
            <Key className="w-4 h-4 text-cyan-400" />
            OPTIONAL: Live Gemini Analysis Configuration
          </div>
          <p className="text-[11px] text-slate-400">
            The application operates 100% offline using the built-in deterministic operations dispatcher below. If you supply a Gemini API key, Gemini will generate an executive dispatch narrative using the exact calculated figures. Your key stays local to your browser session.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Enter Google Gemini API Key (AIza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 min-w-[260px] px-3 py-1.5 text-xs font-mono rounded-lg bg-black border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleRunGemini}
              disabled={isLoading || !apiKey.trim()}
              className="px-4 py-1.5 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Generate Gemini Assessment
                </>
              )}
            </button>
          </div>

          {apiError && (
            <div className="p-2 rounded bg-red-950/60 border border-red-700 text-red-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{apiError}</span>
            </div>
          )}
        </div>
      )}

      {/* Gemini Response (if generated) */}
      {geminiAnalysis && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-950/30 via-[#0d1522] to-blue-950/30 border border-cyan-500/50 shadow-[0_0_20px_rgba(0,229,255,0.15)] space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4" />
            Live Gemini 1.5 Dispatch Assessment
          </div>
          <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
            {geminiAnalysis}
          </div>
        </div>
      )}

      {/* Built-in Operations Dispatcher Intelligence (Always active & calculated) */}
      <div className="p-5 rounded-xl bg-[#0d1522] border border-[#1e2f47] space-y-4 font-mono">
        {/* Headline */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
              OPERATIONAL SITUATION REPORT:
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              {deterministicBriefing.headline}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
              deterministicBriefing.threatLevel === 'CRITICAL'
                ? 'bg-red-950/80 text-red-300 border-red-700'
                : deterministicBriefing.threatLevel === 'ELEVATED'
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
            }`}
          >
            THREAT: {deterministicBriefing.threatLevel}
          </span>
        </div>

        {/* Executive Summary */}
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
          {deterministicBriefing.executiveSummary}
        </div>

        {/* Root Causes & Cascade Chain */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-cyan-400 font-bold uppercase text-[11px] block">
              1. Root Cause & Inbound/Outbound Holds:
            </span>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              {deterministicBriefing.rootCauseAnalysis.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-amber-400 font-bold uppercase text-[11px] block">
              2. Downstream Domino Cascade Dynamics:
            </span>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              {deterministicBriefing.downstreamImpacts.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Recovery Strategy */}
        <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-2 text-xs">
          <span className="text-emerald-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            3. Recommended Action & Tactical Plan:
          </span>
          <p className="text-slate-200 leading-relaxed text-[11px]">
            {deterministicBriefing.recommendedAction}
          </p>
          <div className="pt-2 border-t border-emerald-900/50 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">
              Operational Trade-Off Evaluation:
            </span>
            {deterministicBriefing.operationalTradeoffs.map((item, idx) => (
              <div key={idx} className="text-slate-300 text-[11px]">
                • {item}
              </div>
            ))}
          </div>
        </div>

        {/* Raw Verification Payload Inspector */}
        <div className="pt-2">
          <button
            onClick={() => setShowPromptContext(!showPromptContext)}
            className="text-[11px] text-slate-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition"
          >
            <Terminal className="w-3.5 h-3.5" />
            {showPromptContext ? 'Hide Calculated JSON Payload' : 'Inspect Exact Calculation Payload Passed to AI'}
          </button>

          {showPromptContext && (
            <div className="mt-2 p-3 rounded-lg bg-black/90 border border-slate-800 max-h-60 overflow-y-auto text-[10px] text-cyan-300 font-mono scrollbar-thin">
              <pre>{promptContext}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
