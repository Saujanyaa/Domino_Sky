import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  Search,
  Plane,
  Clock,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Info,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import type { SimulatedFlight, FlightNetworkData } from '../types/index.ts';
import { formatDelay } from '../utils/timeUtils.ts';

interface FlightOperationsTableProps {
  flights: SimulatedFlight[];
  dataset: FlightNetworkData;
}

type SortField =
  | 'flight_id'
  | 'operated_tail_id'
  | 'origin'
  | 'destination'
  | 'sched_dep_min'
  | 'revised_dep_min'
  | 'sched_arr_min'
  | 'revised_arr_min'
  | 'arr_delay_min'
  | 'status';

export const FlightOperationsTable: React.FC<FlightOperationsTableProps> = ({
  flights,
  dataset,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tailFilter, setTailFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('sched_dep_min');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [selectedFlight, setSelectedFlight] = useState<SimulatedFlight | null>(null);

  // Unique tails
  const tails = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => set.add(f.operated_tail_id));
    return Array.from(set).sort();
  }, [flights]);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Sort Flights
  const processedFlights = useMemo(() => {
    return flights
      .filter((f) => {
        // Search term
        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matches =
            f.flight_id.toLowerCase().includes(q) ||
            f.operated_tail_id.toLowerCase().includes(q) ||
            f.origin.toLowerCase().includes(q) ||
            f.destination.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Tail filter
        if (tailFilter !== 'all' && f.operated_tail_id !== tailFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'delayed' && (f.arr_delay_min <= 0 || f.is_cancelled)) return false;
          if (statusFilter === 'ontime' && (f.arr_delay_min > 0 || f.is_cancelled)) return false;
          if (statusFilter === 'cancelled' && !f.is_cancelled) return false;
          if (
            statusFilter === 'ground_hold' &&
            f.status !== 'HELD_ORIGIN' &&
            f.status !== 'HELD_DESTINATION'
          )
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [flights, searchTerm, statusFilter, tailFilter, sortField, sortAsc]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-3.5 rounded-xl bg-[#0d1522] border border-[#1e2f47] flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Flight ID, Tail, Origin, Destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Statuses ({flights.length})</option>
            <option value="ontime">On-Time</option>
            <option value="delayed">Delayed</option>
            <option value="ground_hold">Ground Held</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Tail Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Tail:</label>
          <select
            value={tailFilter}
            onChange={(e) => setTailFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Tails</option>
            {tails.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing <span className="text-cyan-400 font-bold">{processedFlights.length}</span> of{' '}
          {flights.length} flights
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-[#1e2f47] bg-[#0d1522] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 border-b border-[#1e2f47] uppercase text-[10px] tracking-wider select-none">
                <th
                  onClick={() => handleSort('flight_id')}
                  className="py-3 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Flight ID <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('operated_tail_id')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Tail <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('origin')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Origin <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('destination')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Dest <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sched_dep_min')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Sched Dep <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revised_dep_min')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Rev Dep <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sched_arr_min')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Sched Arr <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('revised_arr_min')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Rev Arr <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('arr_delay_min')}
                  className="py-3 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Delay <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3.5 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {processedFlights.map((flight) => {
                const isDelayed = flight.arr_delay_min > 0 && !flight.is_cancelled;
                const isCancelled = flight.is_cancelled;
                const isHeld =
                  flight.status === 'HELD_ORIGIN' || flight.status === 'HELD_DESTINATION';

                return (
                  <tr
                    key={flight.flight_id}
                    onClick={() => setSelectedFlight(flight)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-3.5 font-bold text-white flex items-center gap-2">
                      <span className="text-cyan-400">{flight.flight_id}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        L{flight.leg_order}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {flight.operated_tail_id}
                      {flight.operated_tail_id !== flight.tail_id && (
                        <span className="ml-1 text-[9px] text-emerald-400 font-bold">
                          [SPARE]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {flight.origin}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {flight.destination}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{flight.dep}</td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        flight.dep_delay_min > 0 ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {flight.revised_dep}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{flight.arr}</td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        flight.arr_delay_min > 0 ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      {flight.revised_arr}
                    </td>
                    <td className="py-2.5 px-3">
                      {isCancelled ? (
                        <span className="text-red-400 font-bold">—</span>
                      ) : isDelayed ? (
                        <span className="text-amber-400 font-bold">
                          +{flight.arr_delay_min}m
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">On Time</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      {isCancelled ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950/80 text-red-300 border border-red-700">
                          CANCELLED
                        </span>
                      ) : isHeld ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-700">
                          {flight.status.replace('_', ' ')}
                        </span>
                      ) : isDelayed ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950/60 text-amber-300 border border-amber-800">
                          DELAYED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                          ON TIME
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flight Detail Drawer / Modal */}
      {selectedFlight && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1522] border border-[#1e2f47] p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedFlight(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Plane className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-mono text-white">
                    Flight {selectedFlight.flight_id}
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Leg {selectedFlight.leg_order} • Aircraft {selectedFlight.operated_tail_id}
                  </span>
                </div>
                <p className="text-xs text-cyan-400 font-mono">
                  {selectedFlight.origin} → {selectedFlight.destination} ({selectedFlight.block_minutes} min block)
                </p>
              </div>
            </div>

            {/* Timings Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Departure Schedule:</span>
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Sched: {selectedFlight.dep}</span>
                  <span className={selectedFlight.dep_delay_min > 0 ? 'text-amber-400' : 'text-slate-300'}>
                    Rev: {selectedFlight.revised_dep}
                  </span>
                </div>
                {selectedFlight.dep_delay_min > 0 && (
                  <span className="text-[11px] text-amber-400 font-bold block">
                    Departure Delay: +{selectedFlight.dep_delay_min} min
                  </span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Arrival Schedule:</span>
                <div className="text-sm font-bold text-white flex items-center justify-between">
                  <span>Sched: {selectedFlight.arr}</span>
                  <span className={selectedFlight.arr_delay_min > 0 ? 'text-amber-400' : 'text-slate-300'}>
                    Rev: {selectedFlight.revised_arr}
                  </span>
                </div>
                {selectedFlight.arr_delay_min > 0 && (
                  <span className="text-[11px] text-amber-400 font-bold block">
                    Arrival Delay: +{selectedFlight.arr_delay_min} min
                  </span>
                )}
              </div>
            </div>

            {/* Aircraft Turnaround & Passengers */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Turnaround Constraints:</span>
                <div className="text-xs text-slate-200 mt-1">
                  Required: <strong className="text-cyan-400">{selectedFlight.required_turnaround_min}m</strong>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Available:{' '}
                  {selectedFlight.actual_turnaround_available_min !== null
                    ? `${selectedFlight.actual_turnaround_available_min}m`
                    : 'Origin First Leg'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Passenger Booking:</span>
                <div className="text-base font-bold text-white mt-1">
                  {selectedFlight.pax} <span className="text-xs font-normal text-slate-400">pax (180 seats)</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Load Factor: {Math.round((selectedFlight.pax / 180) * 100)}%
                </div>
              </div>
            </div>

            {/* Delay Reason & Pedigree */}
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[10px] tracking-wider">
                <Info className="w-3.5 h-3.5" />
                Operational Status & Cause Pedigree:
              </div>
              <p className="text-slate-300 leading-relaxed">
                {selectedFlight.delay_reason || 'Flight operated strictly according to published schedule with zero delay.'}
              </p>
              {selectedFlight.cascade_source && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  Cascade Originator: <strong className="text-cyan-300">{selectedFlight.cascade_source}</strong>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedFlight(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
