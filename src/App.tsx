import { useState, useMemo } from 'react';
import rawData from './data/flight_network.json';
import type {
  FlightNetworkData,
  ClosureParams,
  RecoveryAction,
  SimulationResult,
} from './types/index.ts';
import { runSimulation } from './engine/simulationEngine.ts';
import { evaluateRecoveryOptions } from './engine/recoveryEngine.ts';
import { Navbar, ActiveTab } from './components/Navbar.tsx';
import { OperationsOverview } from './components/OperationsOverview.tsx';
import { NetworkMap } from './components/NetworkMap.tsx';
import { DisruptionSimulator } from './components/DisruptionSimulator.tsx';
import { CascadeTrace } from './components/CascadeTrace.tsx';
import { FlightOperationsTable } from './components/FlightOperationsTable.tsx';
import { PassengerCrewImpact } from './components/PassengerCrewImpact.tsx';
import { RecoveryCentre } from './components/RecoveryCentre.tsx';
import { BeforeAfterComparison } from './components/BeforeAfterComparison.tsx';
import { AiDispatcher } from './components/AiDispatcher.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Sole source of network data as required by specification
const dataset = rawData as unknown as FlightNetworkData;

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Baseline scenario (calculated on load)
  const baselineResult = useMemo(() => {
    return runSimulation(dataset);
  }, []);

  // Active disruption closure
  const [activeClosure, setActiveClosure] = useState<ClosureParams | null>(null);

  // Disrupted scenario result
  const [disruptedResult, setDisruptedResult] = useState<SimulationResult>(baselineResult);

  // Recovered scenario result
  const [recoveredResult, setRecoveredResult] = useState<SimulationResult | null>(null);

  // Current active scenario result (displayed across all pages)
  const [currentResult, setCurrentResult] = useState<SimulationResult>(baselineResult);

  // Evaluate candidate recovery options whenever disruption is active
  const topRecoveryOption = useMemo(() => {
    if (!activeClosure) return undefined;
    const options = evaluateRecoveryOptions(dataset, activeClosure, disruptedResult);
    return options.length > 0 ? options[0] : undefined;
  }, [activeClosure, disruptedResult]);

  // Handler: Run Disruption Simulation
  const handleRunSimulation = (closure: ClosureParams) => {
    setActiveClosure(closure);
    const result = runSimulation(dataset, { closure });
    setDisruptedResult(result);
    setRecoveredResult(null);
    setCurrentResult(result);
    setActiveTab('overview');
  };

  // Handler: Apply Recovery Action
  const handleApplyRecovery = (action: RecoveryAction) => {
    if (!activeClosure) return;
    const recResult = runSimulation(dataset, {
      closure: activeClosure,
      recovery: action,
    });
    setRecoveredResult(recResult);
    setCurrentResult(recResult);
    setActiveTab('comparison');
  };

  // Handler: Revert Recovery to Disrupted State
  const handleRevertRecovery = () => {
    if (activeClosure) {
      setCurrentResult(disruptedResult);
      setRecoveredResult(null);
    }
  };

  // Handler: Reset to Clean Baseline
  const handleReset = () => {
    setActiveClosure(null);
    setDisruptedResult(baselineResult);
    setRecoveredResult(null);
    setCurrentResult(baselineResult);
    setActiveTab('overview');
  };

  // Preset BOM 09:00 - 10:30 shortcut (Official Spec Test Case)
  const handleSelectPresetBOM = () => {
    handleRunSimulation({
      airport: 'BOM',
      start_str: '09:00',
      end_str: '10:30',
      start_min: 540,
      end_min: 630,
    });
  };

  // Preset DEL 11:00 - 13:00 shortcut
  const handleSelectPresetDEL = () => {
    handleRunSimulation({
      airport: 'DEL',
      start_str: '11:00',
      end_str: '13:00',
      start_min: 660,
      end_min: 780,
    });
  };

  const handleSelectAirportForClosure = (_airportId: string) => {
    setActiveTab('simulator');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
        {/* Skip to Main Content Link for Keyboard Accessibility (WCAG 2.1 AA) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-black focus:font-mono focus:font-bold focus:rounded-md focus:shadow-2xl focus:outline-none"
        >
          Skip to main operations dashboard
        </a>

        {/* Top Operations Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentResult={currentResult}
          onReset={handleReset}
          onQuickPresetBOM={handleSelectPresetBOM}
          onQuickPresetDEL={handleSelectPresetDEL}
        />

        {/* Main Dynamic Workspace Area */}
        <main
          id="main-content"
          tabIndex={-1}
          role="main"
          aria-label="Operations Center Content View"
          className="flex-1 max-w-[1700px] w-full mx-auto px-4 py-5 focus:outline-none"
        >
        {activeTab === 'overview' && (
          <OperationsOverview
            currentResult={currentResult}
            baselineResult={baselineResult}
            dataset={dataset}
            onNavigateTab={setActiveTab}
            onSelectPresetBOM={handleSelectPresetBOM}
          />
        )}

        {activeTab === 'map' && (
          <NetworkMap
            dataset={dataset}
            currentResult={currentResult}
            onSelectAirportForClosure={handleSelectAirportForClosure}
            onDirectClosure={handleRunSimulation}
          />
        )}

        {activeTab === 'simulator' && (
          <DisruptionSimulator
            dataset={dataset}
            activeClosure={activeClosure}
            onRunSimulation={handleRunSimulation}
            onReset={handleReset}
          />
        )}

        {activeTab === 'cascade' && (
          <CascadeTrace
            currentResult={currentResult}
            dataset={dataset}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'flights' && (
          <FlightOperationsTable
            flights={currentResult.flights}
            dataset={dataset}
          />
        )}

        {activeTab === 'impact' && (
          <PassengerCrewImpact
            currentResult={currentResult}
            dataset={dataset}
          />
        )}

        {activeTab === 'recovery' && (
          <RecoveryCentre
            dataset={dataset}
            closure={activeClosure}
            currentResult={currentResult}
            disruptedResult={disruptedResult}
            onApplyRecovery={handleApplyRecovery}
            onRevertRecovery={handleRevertRecovery}
          />
        )}

        {activeTab === 'comparison' && (
          <BeforeAfterComparison
            baselineResult={baselineResult}
            disruptedResult={disruptedResult}
            recoveredResult={recoveredResult}
          />
        )}

        {activeTab === 'ai' && (
          <AiDispatcher
            currentResult={currentResult}
            baselineResult={baselineResult}
            dataset={dataset}
            topRecovery={topRecoveryOption}
          />
        )}
      </main>

      {/* Operations Footer */}
      <footer className="border-t border-[#141f30] bg-[#070b12] py-3 px-4 text-xs font-mono text-slate-400">
        <div className="max-w-[1700px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-bold">
              DOMINO SKY v1.0
            </span>
            <span>•</span>
            <span>PromptWars 2026 — Build with AI</span>
            <span>•</span>
            <span>Deterministic Operations Research Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Operating Day: Single Day IST (UTC+05:30)</span>
            <span>•</span>
            <span className="text-slate-400">16 Stations | 70 Flights | 16 Aircraft + 2 Spares</span>
          </div>
        </div>
      </footer>
    </div>
  </ErrorBoundary>
  );
}

export default App;
