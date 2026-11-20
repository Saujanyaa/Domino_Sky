import React, { useState, useMemo } from 'react';
import {
  Plane,
  Layers,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import type {
  Airport,
  FlightNetworkData,
  SimulationResult,
  ClosureParams,
} from '../types/index.ts';
import {
  projectCoordinates,
  generateArcPath,
  INDIA_COASTLINE_PATH,
  Point,
} from '../utils/geoUtils.ts';
import { timeToMinutes } from '../utils/timeUtils.ts';

interface NetworkMapProps {
  dataset: FlightNetworkData;
  currentResult: SimulationResult;
  onSelectAirportForClosure: (airportId: string) => void;
  onDirectClosure?: (closure: ClosureParams) => void;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  dataset,
  currentResult,
  onSelectAirportForClosure,
  onDirectClosure,
}) => {
  const [selectedAirportId, setSelectedAirportId] = useState<string>('BOM');
  const [routeFilter, setRouteFilter] = useState<'all' | 'delayed' | 'cancelled'>('all');
  const [tierFilter, setTierFilter] = useState<'all' | 'mega_hub' | 'regional_hub' | 'spoke'>('all');
  const [selectedTail, setSelectedTail] = useState<string>('all');
  const [hoveredAirport, setHoveredAirport] = useState<Airport | null>(null);

  // In-drawer quick closure form state
  const [quickCloseStart, setQuickCloseStart] = useState('09:00');
  const [quickCloseEnd, setQuickCloseEnd] = useState('10:30');
  const [showClosureForm, setShowClosureForm] = useState(false);

  const { closure, flights } = currentResult;

  // Precompute airport map and projected points
  const airportMap = useMemo(() => {
    const map = new Map<string, Airport>();
    dataset.airports.forEach((a) => map.set(a.id, a));
    return map;
  }, [dataset.airports]);

  const airportPoints = useMemo(() => {
    const map = new Map<string, Point>();
    dataset.airports.forEach((a) => {
      map.set(a.id, projectCoordinates(a.lat, a.lng));
    });
    return map;
  }, [dataset.airports]);

  // Unique tail IDs
  const tailIds = useMemo(() => {
    const set = new Set<string>();
    dataset.flights.forEach((f) => set.add(f.tail_id));
    return Array.from(set).sort();
  }, [dataset.flights]);

  // Filtered flights for route visualization
  const visibleFlights = useMemo(() => {
    return flights.filter((f) => {
      if (selectedTail !== 'all' && f.operated_tail_id !== selectedTail && f.tail_id !== selectedTail) {
        return false;
      }
      if (routeFilter === 'delayed') {
        return f.arr_delay_min > 0 && !f.is_cancelled;
      }
      if (routeFilter === 'cancelled') {
        return f.is_cancelled || f.is_position_infeasible;
      }
      return true;
    });
  }, [flights, routeFilter, selectedTail]);

  // Selected airport details
  const selectedAirport = airportMap.get(selectedAirportId) || dataset.airports[0];
  const airportInboundFlights = useMemo(() => {
    return flights.filter((f) => f.destination === selectedAirport.id);
  }, [flights, selectedAirport.id]);

  const airportOutboundFlights = useMemo(() => {
    return flights.filter((f) => f.origin === selectedAirport.id);
  }, [flights, selectedAirport.id]);

  const handleApplyQuickClosure = () => {
    if (onDirectClosure) {
      onDirectClosure({
        airport: selectedAirport.id,
        start_str: quickCloseStart,
        end_str: quickCloseEnd,
        start_min: timeToMinutes(quickCloseStart),
        end_min: timeToMinutes(quickCloseEnd),
      });
      setShowClosureForm(false);
    } else {
      onSelectAirportForClosure(selectedAirport.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Operations Bar */}
      <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          {/* Route Status Filter */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Routes:
            </span>
            <div className="flex rounded-lg bg-slate-900 border border-slate-700/80 p-0.5 text-xs font-mono">
              <button
                onClick={() => setRouteFilter('all')}
                className={`px-3 py-1 rounded-md transition ${
                  routeFilter === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({flights.length})
              </button>
              <button
                onClick={() => setRouteFilter('delayed')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  routeFilter === 'delayed'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Delayed ({flights.filter((f) => f.arr_delay_min > 0 && !f.is_cancelled).length})
              </button>
              <button
                onClick={() => setRouteFilter('cancelled')}
                className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                  routeFilter === 'cancelled'
                    ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Cancelled ({flights.filter((f) => f.is_cancelled).length})
              </button>
            </div>
          </div>

          {/* Station Tier Filter */}
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-slate-300" aria-hidden="true" />
            <label htmlFor="tier-filter-select" className="text-xs font-mono text-slate-300">
              Tier:
            </label>
            <select
              id="tier-filter-select"
              aria-label="Filter stations by tier"
              value={tierFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setTierFilter(e.target.value as 'all' | 'mega_hub' | 'regional_hub' | 'spoke')
              }
              className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Station Tiers (16)</option>
              <option value="mega_hub">Mega Hubs Only (4)</option>
              <option value="regional_hub">Regional Hubs (4)</option>
              <option value="spoke">Spoke Stations (8)</option>
            </select>
          </div>
        </div>

        {/* Filter by Tail */}
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          <label htmlFor="map-tail-filter" className="text-xs font-mono text-slate-300">
            Aircraft Tail:
          </label>
          <select
            id="map-tail-filter"
            aria-label="Filter route display by aircraft tail"
            value={selectedTail}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTail(e.target.value)}
            className="px-3 py-1 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="all">All Fleet (16 Rotations)</option>
            {tailIds.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Map & Inspector Container */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SVG Network Map View (2 columns on large screens) */}
        <div className="xl:col-span-2 relative p-4 rounded-xl bg-gradient-to-b from-[#060a12] via-[#090f1a] to-[#060a12] border border-[#1e2f47] overflow-hidden min-h-[660px] flex items-center justify-center shadow-xl">
          {/* Radar background grid */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:28px_28px]" />

          {/* Interactive station hover badge */}
          {hoveredAirport && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/50 text-xs font-mono shadow-lg backdrop-blur-sm pointer-events-none">
              <span className="text-cyan-400 font-bold">{hoveredAirport.id}</span>
              <span className="text-slate-300"> — {hoveredAirport.city} ({hoveredAirport.name})</span>
              <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-slate-800 text-slate-300 rounded uppercase">
                {hoveredAirport.tier.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* SVG Map Canvas */}
          <svg
            role="region"
            aria-label="Interactive Indian Flight Network Map"
            viewBox="0 0 800 850"
            className="w-full h-auto max-h-[780px] relative z-10 select-none"
          >
            <defs>
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#08101e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0a1528" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Realistic India Coastline Silhouette */}
            <path
              d={INDIA_COASTLINE_PATH}
              fill="url(#oceanGrad)"
              stroke="#1b304f"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_15px_rgba(0,229,255,0.05)]"
            />

            {/* Flight Route Arcs */}
            <g className="routes">
              {visibleFlights.map((flight, idx) => {
                const fromPt = airportPoints.get(flight.origin);
                const toPt = airportPoints.get(flight.destination);
                if (!fromPt || !toPt) return null;

                const isDelayed = flight.arr_delay_min > 0 && !flight.is_cancelled;
                const isCancelled = flight.is_cancelled;
                const isSelectedTail =
                  selectedTail !== 'all' &&
                  (flight.operated_tail_id === selectedTail || flight.tail_id === selectedTail);

                // Alternating curvature so forward and return legs separate naturally
                const curveFactor = flight.leg_order % 2 === 0 ? 0.14 : -0.14;
                const pathD = generateArcPath(fromPt, toPt, curveFactor);

                let strokeColor = '#1e385c';
                let strokeWidth = isSelectedTail ? 3 : 1.2;
                let strokeDash = 'none';
                let opacity = 0.45;

                if (isCancelled) {
                  strokeColor = '#ef4444';
                  strokeWidth = 2.2;
                  strokeDash = '5 4';
                  opacity = 0.9;
                } else if (isDelayed) {
                  strokeColor = '#f59e0b';
                  strokeWidth = isSelectedTail ? 3.5 : 2.2;
                  strokeDash = '6 3';
                  opacity = 0.95;
                } else if (isSelectedTail) {
                  strokeColor = '#00e5ff';
                  opacity = 1;
                }

                return (
                  <path
                    key={`${flight.flight_id}-${idx}`}
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    strokeLinecap="round"
                    opacity={opacity}
                    className="transition-all duration-300 hover:opacity-100 hover:stroke-cyan-300"
                  />
                );
              })}
            </g>

            {/* Airport Nodes */}
            <g className="airports">
              {dataset.airports.map((airport) => {
                if (tierFilter !== 'all' && airport.tier !== tierFilter) {
                  return null;
                }

                const pt = airportPoints.get(airport.id);
                if (!pt) return null;

                const isClosed = closure?.airport === airport.id;
                const isSelected = selectedAirportId === airport.id;
                const isMega = airport.tier === 'mega_hub';
                const isRegional = airport.tier === 'regional_hub';

                const radius = isClosed ? 14 : isMega ? 9.5 : isRegional ? 7.5 : 5.5;

                // Status counts for this airport
                const inboundDelays = flights.filter(
                  (f) => f.destination === airport.id && f.arr_delay_min > 0 && !f.is_cancelled
                ).length;
                const outboundDelays = flights.filter(
                  (f) => f.origin === airport.id && f.dep_delay_min > 0 && !f.is_cancelled
                ).length;
                const hasDelays = inboundDelays > 0 || outboundDelays > 0;

                return (
                  <g
                    key={airport.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${airport.id} Airport in ${airport.city}. Tier: ${airport.tier}. Status: ${isClosed ? 'Closed' : hasDelays ? 'Delayed' : 'Nominal'}`}
                    aria-pressed={isSelected}
                    style={{ pointerEvents: 'all' }}
                    className="cursor-pointer group select-none focus:outline-none"
                    onClick={() => setSelectedAirportId(airport.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAirportId(airport.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredAirport(airport)}
                    onMouseLeave={() => setHoveredAirport(null)}
                  >
                    {/* Pulsing ring if airport is closed */}
                    {isClosed && (
                      <>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="28"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          opacity="0.5"
                          className="animate-ping origin-center"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="20"
                          fill="rgba(239, 68, 68, 0.3)"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          filter="url(#glow-red)"
                        />
                      </>
                    )}

                    {/* Selection halo */}
                    {isSelected && !isClosed && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={radius + 8}
                        fill="rgba(0, 229, 255, 0.15)"
                        stroke="#00e5ff"
                        strokeWidth="1.8"
                        strokeDasharray="4 3"
                      />
                    )}

                    {/* Core Airport Node */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={radius}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => setSelectedAirportId(airport.id)}
                      fill={
                        isClosed
                          ? '#ef4444'
                          : hasDelays
                          ? '#f59e0b'
                          : isMega
                          ? '#00e5ff'
                          : isRegional
                          ? '#38bdf8'
                          : '#94a3b8'
                      }
                      stroke="#070b12"
                      strokeWidth="2"
                      filter={isClosed ? 'url(#glow-red)' : isMega ? 'url(#glow-cyan)' : undefined}
                      className="transition-transform group-hover:scale-125"
                    />

                    {/* Airport IATA Code Label */}
                    <text
                      x={pt.x}
                      y={pt.y - radius - 6}
                      textAnchor="middle"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => setSelectedAirportId(airport.id)}
                      fill={
                        isClosed
                          ? '#f87171'
                          : isSelected
                          ? '#00e5ff'
                          : hasDelays
                          ? '#fbbf24'
                          : '#e2e8f0'
                      }
                      fontSize={isMega ? '12px' : '10px'}
                      fontWeight="bold"
                      fontFamily="ui-monospace, monospace"
                      className="drop-shadow-md select-none"
                    >
                      {airport.id}
                    </text>

                    {/* Small delay indicator pip */}
                    {hasDelays && !isClosed && (
                      <circle
                        cx={pt.x + radius}
                        cy={pt.y - radius}
                        r="3.5"
                        fill="#f59e0b"
                        stroke="#070b12"
                        strokeWidth="1"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-[#070b12]/95 border border-[#1e2f47] text-[11px] font-mono space-y-1.5 backdrop-blur z-20 shadow-lg">
            <div className="text-xs font-bold text-white pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>AIRPORT HIERARCHY</span>
              <span className="text-[10px] text-cyan-400">16 STATIONS</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Mega Hubs (DEL, BOM, BLR, HYD)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Regional Hubs (MAA, CCU, AMD, COK)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Spoke Stations (GOI, PNQ, JAI, etc.)</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300 pt-1 border-t border-slate-800">
              <span className="w-3 h-0.5 bg-amber-400 border-dashed" />
              <span>Delayed Flight Route</span>
            </div>
            <div className="flex items-center gap-2 text-red-300">
              <span className="w-3 h-0.5 bg-red-500" />
              <span>Ground Stop / Closure</span>
            </div>
          </div>
        </div>

        {/* Airport Inspection Drawer / Panel (1 column on large screens) */}
        <div className="p-5 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#1e2f47]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    {selectedAirport.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${
                      closure?.airport === selectedAirport.id
                        ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    }`}
                  >
                    {closure?.airport === selectedAirport.id
                      ? 'GROUND STOP ACTIVE'
                      : selectedAirport.tier.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mt-1">
                  {selectedAirport.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedAirport.city}, India • Lat {selectedAirport.lat.toFixed(2)}, Lng{' '}
                  {selectedAirport.lng.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Station Statistics */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">Runway Capacity:</span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {selectedAirport.capacity_per_hour} mvts/hr
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase">Total Flights:</span>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">
                  {airportInboundFlights.length + airportOutboundFlights.length} movements
                </div>
              </div>
            </div>

            {/* Quick Disruption Trigger from Drawer */}
            <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-red-300 font-mono flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    SIMULATE CLOSURE AT {selectedAirport.id}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Inject a ground-stop at this specific station.
                  </p>
                </div>
                <button
                  onClick={() => setShowClosureForm(!showClosureForm)}
                  className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
                >
                  {showClosureForm ? 'Cancel' : 'Set Window'}
                </button>
              </div>

              {showClosureForm && (
                <div className="pt-2 border-t border-red-900/50 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400">Start (IST):</span>
                      <input
                        type="text"
                        value={quickCloseStart}
                        onChange={(e) => setQuickCloseStart(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 text-xs font-mono rounded bg-black border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">End (IST):</span>
                      <input
                        type="text"
                        value={quickCloseEnd}
                        onChange={(e) => setQuickCloseEnd(e.target.value)}
                        className="w-full mt-0.5 px-2 py-1 text-xs font-mono rounded bg-black border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyQuickClosure}
                    className="w-full py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition"
                  >
                    Apply Ground Stop ({quickCloseStart} - {quickCloseEnd})
                  </button>
                </div>
              )}
            </div>

            {/* Inbound & Outbound Flights Lists */}
            <div className="space-y-3">
              <div className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Inbound Flights ({airportInboundFlights.length})</span>
                <span className="text-[10px] text-slate-400">Scheduled vs Revised</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {airportInboundFlights.map((f) => (
                  <div
                    key={f.flight_id}
                    className={`p-2 rounded text-xs font-mono flex items-center justify-between border ${
                      f.is_cancelled
                        ? 'bg-red-950/20 border-red-800 text-red-300'
                        : f.arr_delay_min > 0
                        ? 'bg-amber-950/20 border-amber-800 text-amber-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{f.flight_id}</span>
                      <span className="text-slate-400">({f.origin}→{f.destination})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Arr: {f.revised_arr}</span>
                      {f.arr_delay_min > 0 && (
                        <span className="text-amber-400 font-bold">+{f.arr_delay_min}m</span>
                      )}
                      {f.is_cancelled && (
                        <span className="text-red-400 font-bold">CANCELLED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider pt-2 flex items-center justify-between">
                <span>Outbound Flights ({airportOutboundFlights.length})</span>
                <span className="text-[10px] text-slate-400">Scheduled vs Revised</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {airportOutboundFlights.map((f) => (
                  <div
                    key={f.flight_id}
                    className={`p-2 rounded text-xs font-mono flex items-center justify-between border ${
                      f.is_cancelled
                        ? 'bg-red-950/20 border-red-800 text-red-300'
                        : f.dep_delay_min > 0
                        ? 'bg-amber-950/20 border-amber-800 text-amber-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{f.flight_id}</span>
                      <span className="text-slate-400">({f.origin}→{f.destination})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Dep: {f.revised_dep}</span>
                      {f.dep_delay_min > 0 && (
                        <span className="text-amber-400 font-bold">+{f.dep_delay_min}m</span>
                      )}
                      {f.is_cancelled && (
                        <span className="text-red-400 font-bold">CANCELLED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Projection: WGS84 Mercator Equirectangular</span>
            <span>16 Stations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
