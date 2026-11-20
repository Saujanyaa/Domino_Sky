# ✈️ DOMINO SKY — Flight Disruption Cascade & Recovery Simulator

[![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-142%20Passed%20(100%25)-success?style=flat-square)](./src/tests/runTests.ts)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AAA-success?style=flat-square)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-100%25-success?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> **Built for PromptWars 2026 — Build with AI**  
> A professional airline operations research command center that demonstrates how a temporary airport closure triggers a chain reaction across aircraft rotations, flight delays, passenger connections, crew duty limits, and optimal recovery decisions.

---

## 📌 Project Overview

In commercial aviation, an isolated weather event or ground-stop at a single hub triggers cascading disruptions across the entire airline network:

$$\text{Airport Ground-Stop} \longrightarrow \text{Gate Hold} \longrightarrow \text{Turnaround Violated} \longrightarrow \text{Downstream Leg Delayed} \longrightarrow \text{Connection Broken} \longrightarrow \text{Crew Duty Exceeded}$$

**DOMINO SKY** provides airline dispatchers and operations controllers with:
1. **Interactive Disruption Simulation:** Inject ground-stops at any station (e.g. BOM, DEL, BLR) with custom closure intervals.
2. **Deterministic Physics Engine:** Exact minute-level aircraft turnaround propagation, connection buffers, and DGCA crew duty calculations.
3. **Interactive India Network GIS Map:** Real WGS84 coordinates for all 16 airports, animated route arcs, and live station movements.
4. **Domino Cascade Trace:** Chronological causal graph showing the exact pedigree of every delay.
5. **Deterministic Recovery Engine:** Evaluates standby spare aircraft and tactical cancellations, scored against multi-objective priority tiers.
6. **Three-Way Scenario Comparison:** Side-by-side comparative matrix across `BASELINE (Nominal)` vs `DISRUPTED` vs `RECOVERED`.

---

## 📊 Dataset Characteristics (Validation Baseline)

All simulations strictly use [`flight_network.json`](./flight_network.json) as the sole source of truth:

| Characteristic | Specification Check | Actual Dataset Total | Status |
| :--- | :---: | :---: | :---: |
| **Airports / Stations** | 16 | 16 | ✅ Exact Match |
| **Operating Aircraft** | 16 (`VT-DS01` to `VT-DS16`) | 16 | ✅ Exact Match |
| **Standby Spare Aircraft** | 2 (`VT-DS17` @ BLR, `VT-DS18` @ DEL) | 2 | ✅ Exact Match |
| **Scheduled Flights** | 70 | 70 | ✅ Exact Match |
| **Total Scheduled Passengers** | 10,394 | 10,394 | ✅ Exact Match |
| **Passenger Connection Banks** | 21 (`CX01` to `CX21`) | 21 | ✅ Exact Match |
| **Connecting Passengers** | 659 | 659 | ✅ Exact Match |
| **Crew Duty Rosters** | 16 (`CR01` to `CR16`) | 16 | ✅ Exact Match |
| **Baseline Turnarounds** | All turnarounds $\ge \text{required}$ | 100% compliant | ✅ Verified |
| **Baseline Crew Compliance** | 0 violations ($<600\text{m}$ max FDP) | 16 / 16 compliant | ✅ Verified |

*Note: Connecting passengers are already accounted for in scheduled flight passenger counts. All times are local IST (UTC+05:30) in 24-hour HH:MM format.*

---

## 🔬 Benchmark Disruption: BOM 09:00 – 10:30 IST

Simulating a 90-minute morning closure at **Mumbai (BOM)** demonstrates the engine's deterministic calculations:

```
Disruption Summary:
  - Delayed flights: 10
  - Total arrival delay: 470 minutes
  - Cancelled flights: 0
  - Missed connections: 2 banks (CX11 and CX17)
  - Affected connection passengers: 54 pax
  - Crew duty violations: 1 roster (CR07 exceeded 600m limit by +10m, total duty 610m)
```

### Rotation Mechanics (VT-DS02 & VT-DS04):
- **VT-DS02**:
  - `DS0201` (`DEL` → `BOM`): Arrived at 08:10 before closure. **On Time**.
  - `DS0202` (`BOM` → `PNQ`): Sched dep 09:20. Held on ground until reopening (10:30). Revised arr 11:10. **Delay +70m (`HELD_ORIGIN`)**.
  - `DS0203` (`PNQ` → `BOM`): Sched dep 11:15. Required turnaround is 75m. Earliest feasible departure is $11:10 + 75\text{m} = 12:25$. Revised arr 13:05. **Delay +70m (`ROTATION_PROPAGATION`)**.
  - `DS0204` (`BOM` → `GOI`): Sched dep 12:30. Required turnaround is 35m. Earliest departure is $13:05 + 35\text{m} = 13:40$. Revised arr 14:45. **Delay +70m (`ROTATION_PROPAGATION`)**.
- **VT-DS04**:
  - `DS0402` (`GOI` → `BOM`): Sched arr 10:25 falls during closure window. Held at origin (`GOI`) until 09:25 to arrive at reopening (10:30). **Delay +5m (`HELD_DESTINATION`)**.
  - Downstream legs (`DS0403`, `DS0404`, `DS0405`) absorb the 5-minute propagation.

---

## 🛠️ Recovery Engine Priority Ordering

The deterministic recovery engine scores candidates using the following strict priority tiers:
1. **Minimize passengers on cancelled flights**
2. **Minimize affected connection passengers**
3. **Minimize crew duty violations**
4. **Minimize total arrival delay minutes**
5. **Minimize number of cancellations**

### Recommended Recovery Action for BOM Disruption:
- **Action**: Substitute standby spare aircraft **`VT-DS17`** (based at `BLR`, 180 seats) for flight `DS0704`.
- **Outcome**:
  - **Arrival delay reduced** from 470m to **390m** (-80m saved)
  - **Missed connection passengers reduced** from 54 to **31 pax** (-23 transfer pax protected)
  - **Cancelled flights**: 0
  - **Feasibility check**: Verified station base, seat capacity ($\ge 156$), and departure time.
  - *Feasibility warning surfaced*: *"Aircraft feasibility checked — crew assignment requires dispatcher confirmation."*

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js (v18+ or v22+/v24+)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/Saujanyaa/Domino_Sky.git
cd Domino_Sky
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### 4. Run automated test suite
```bash
npm test
```
Runs the automated verification suite covering time arithmetic, dataset counts, baseline turnarounds, BOM 09:00-10:30 simulation, spare substitution, and recovery ranking.

### 5. Production build
```bash
npm run build
npm run preview
```

---

## 📁 Repository Structure

```
Domino_Sky/
├── src/
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces (Flights, Crews, Rotations, Spares)
│   ├── engine/
│   │   ├── simulationEngine.ts       # Deterministic time arithmetic & delay propagation
│   │   └── recoveryEngine.ts         # Multi-objective recovery optimizer
│   ├── utils/
│   │   ├── timeUtils.ts              # Robust 24-hr IST minute arithmetic
│   │   ├── geoUtils.ts               # India geographic projection & Bézier curve routes
│   │   └── aiDispatcher.ts           # Operations intelligence & optional Gemini integration
│   ├── components/
│   │   ├── Navbar.tsx                # Status badges, quick preset triggers, reset button
│   │   ├── OperationsOverview.tsx    # Live KPI grid, fleet health, station radar matrix
│   │   ├── NetworkMap.tsx            # Interactive SVG India map with closure rings
│   │   ├── FlightOperationsTable.tsx # Searchable, sortable schedule table with detail modal
│   │   ├── DisruptionSimulator.tsx   # Station selector, time pickers, presets, assumptions
│   │   ├── CascadeTrace.tsx          # Chronological root-cause domino chain with tail filters
│   │   ├── PassengerCrewImpact.tsx   # Connection bank tables, crew roster duty tracking
│   │   ├── RecoveryCentre.tsx        # Ranked candidate options, feasibility badges
│   │   ├── BeforeAfterComparison.tsx # Baseline vs Disrupted vs Recovered comparative matrix
│   │   └── AiDispatcher.tsx          # AI Operations Intelligence & Gemini prompt verification
│   ├── constants/
│   │   └── operations.ts            # Domain operational constants & benchmark configs
│   ├── tests/
│   │   ├── runTests.ts               # Verification suite (9 suites, 142 assertions)
│   │   └── engine.test.ts            # Node.js native unit test runner (node:test)
│   ├── data/
│   │   └── flight_network.json       # Sole source flight network dataset
│   ├── App.tsx                       # Central state orchestration
│   ├── main.tsx
│   └── index.css                     # Dark-mode aviation command centre theme (Tailwind CSS)
├── flight_network.json               # Root dataset copy
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## 🎨 UI/UX Design Standards

- **Command Center Aesthetic:** Deep navy canvas (`#070b12`, `#0d1522`), cyan accents (`#00e5ff`), amber warnings (`#f59e0b`), and red critical alerts (`#ef4444`).
- **Typography:** JetBrains Mono for flight times, durations, and counts; Plus Jakarta Sans for UI chrome.
- **Glassmorphism:** Subtle backdrop blur on navigation bars and drawers.
- **SVG GIS Engine:** High-performance vector rendering with accurate Indian coastline and airport coordinates.

---

## 📄 License

This project is licensed under the MIT License.
Built for **PromptWars 2026 — Build with AI**.
