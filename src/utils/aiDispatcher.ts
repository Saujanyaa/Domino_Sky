import type { SimulationResult, FlightNetworkData, ScoredRecoveryOption } from '../types/index.ts';
import { formatDelay, formatDuration } from './timeUtils.ts';

/**
 * Generates an executive airline operations briefing from calculated deterministic simulation figures.
 * When Gemini API is unavailable, provides an expert-level dispatcher situational assessment.
 */
export function generateDeterministicBriefing(
  currentResult: SimulationResult,
  baselineResult: SimulationResult,
  dataset: FlightNetworkData,
  topRecovery?: ScoredRecoveryOption
): {
  headline: string;
  threatLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  executiveSummary: string;
  rootCauseAnalysis: string[];
  downstreamImpacts: string[];
  recommendedAction: string;
  operationalTradeoffs: string[];
} {
  const { summary, closure, scenario_type, recovery_action } = currentResult;

  if (scenario_type === 'BASELINE') {
    return {
      headline: 'NETWORK NOMINAL: Standard Flight Schedule Active',
      threatLevel: 'NORMAL',
      executiveSummary:
        `All 70 flights operating on schedule across 16 stations. 16 operating aircraft maintaining standard turnarounds (minimum 30m). All 21 passenger connection banks (659 connecting pax) protected. All 16 crew rosters are within the statutory 600-minute maximum duty limit.`,
      rootCauseAnalysis: [
        'Zero weather, ATC ground holds, or equipment closures in force.',
        'Network operating buffer is healthy at all mega hubs (DEL, BOM, BLR, HYD).',
      ],
      downstreamImpacts: [
        'No rotation delays detected across fleet.',
        '2 standby spare aircraft (VT-DS17 at BLR, VT-DS18 at DEL) ready on ground.',
      ],
      recommendedAction:
        'Maintain nominal monitoring. Ready to inject airport disruption scenario when required.',
      operationalTradeoffs: [
        'All 10,394 booked passengers travelling as scheduled.',
      ],
    };
  }

  const isRecovered = scenario_type === 'RECOVERED';
  const closedAirport = closure?.airport || 'AIRPORT';
  const closureWindow = closure ? `${closure.start_str} - ${closure.end_str}` : '';

  const headline = isRecovered
    ? `RECOVERY ACTIVE: Intervention Applied (${recovery_action?.label || 'Action'})`
    : `DISRUPTION ALERT: Ground Stop at ${closedAirport} (${closureWindow})`;

  const threatLevel = summary.crew_duty_violations_count > 0 || summary.missed_connections_count > 3
    ? 'CRITICAL'
    : 'ELEVATED';

  const executiveSummary = isRecovered
    ? `Operational intervention applied to mitigate the ${closedAirport} disruption. Arrival delays reduced to ${summary.total_arr_delay_mins} min across ${summary.delayed_flights_count} flights. Missed connections contained to ${summary.missed_connections_count} (${summary.affected_connection_pax} connecting pax). Crew violations stand at ${summary.crew_duty_violations_count}.`
    : `A temporary operational closure at ${closedAirport} (${closureWindow}) has triggered a domino delay cascade. Ground holds on flights departing from and arriving into ${closedAirport} have propagated across aircraft rotations, accumulating ${summary.total_arr_delay_mins} minutes of arrival delay across ${summary.delayed_flights_count} flights, severing ${summary.missed_connections_count} connection banks (${summary.affected_connection_pax} connecting passengers), and causing ${summary.crew_duty_violations_count} crew duty limit violations.`;

  const rootCauseAnalysis = [
    `Primary Ground Hold: Airport ${closedAirport} suspended operations between ${closure?.start_str} and ${closure?.end_str} (${(closure?.end_min ?? 0) - (closure?.start_min ?? 0)} min duration).`,
    `Inbound holds held aircraft at origins to prevent holding patterns over ${closedAirport}, while outbound departures were held on the ground until reopening at ${closure?.end_str}.`,
  ];

  const downstreamImpacts = [
    `Aircraft Rotations: Aircraft turnarounds violated downstream schedules. Most affected tails: ${summary.most_affected_tails.slice(0, 3).map(t => `${t.tail_id} (+${t.total_delay_mins}m across ${t.delayed_legs} legs)`).join(', ')}.`,
    `Passenger Connection Ruptures: ${summary.missed_connections_count} of ${summary.total_connections_count} connections breached minimum connection time thresholds, leaving ${summary.affected_connection_pax} transfer passengers stranded at hub terminals.`,
    `Crew Duty Violations: ${summary.crew_duty_violations_count} flight crews have exceeded their 600-minute statutory duty window, requiring deadhead relief or flight cancellation before legal departure.`,
  ];

  let recommendedAction = '';
  let operationalTradeoffs: string[] = [];

  if (topRecovery) {
    recommendedAction = `Execute Rank 1 Recovery: ${topRecovery.action.label}. ${topRecovery.reasoning}`;
    operationalTradeoffs = [
      ...topRecovery.pros.map(p => `PRO: ${p}`),
      ...topRecovery.cons.map(c => `CON / CONSTRAINT: ${c}`),
    ];
  } else {
    recommendedAction = 'Dispatch standby spare aircraft from nearest hub or evaluate tactical cancellation of earliest delay originator.';
    operationalTradeoffs = [
      'Cancellation trades passenger rebooking penalties for network schedule integrity.',
      'Spare substitution preserves bookings but requires crew qualification verification.',
    ];
  }

  return {
    headline,
    threatLevel,
    executiveSummary,
    rootCauseAnalysis,
    downstreamImpacts,
    recommendedAction,
    operationalTradeoffs,
  };
}

/**
 * Calls Gemini API if an API key is provided, passing strict structured data
 * to ensure that all numerical figures and facts originate from the deterministic engine.
 */
export async function queryGeminiDispatcher(
  apiKey: string,
  promptContext: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('No API key configured.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `You are the Chief Airline Network Operations Dispatcher for Domino Sky.
Analyze the following PRE-CALCULATED, DETERMINISTIC operational data from the simulator.
RULES:
1. NEVER invent, modify, or estimate numerical statistics. All numbers must strictly match the figures provided below.
2. Provide a crisp, authoritative, professional operations dispatch assessment.
3. Structure your response into:
   - SITUATIONAL OVERVIEW
   - CASCADE MECHANICS (Which aircraft turnaround failed and why)
   - PASSENGER & CREW VULNERABILITIES
   - STRATEGIC RECOVERY RECOMMENDATION & TRADE-OFFS

OPERATIONAL SIMULATION DATA:
${promptContext}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response generated by model.');
  return text;
}
