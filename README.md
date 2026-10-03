# ECHO-FOG Simulator

ECHO-FOG is a **Multi-Domain Decision-Making Trainer** designed to simulate tactical command and control operations within a fictional environment. It acts as an interactive situational awareness dashboard where communication degradation, personnel tracking, and simulated command operations can be exercised and analyzed.

## Features

- **Fictional Command Dashboard**: A dark, military-styled interface (Army Uniform Theme) designed to mimic a professional operations center.
- **Interactive Tactical Map**: Operates completely offline without external map tile requests. Visualizes fictional buildings, outposts, and officer locations across "Sector KAVACH."
- **Officer & Asset Tracking**: Track the realtime transit, active location, and communication network status of simulated officers moving between structures.
- **Dynamic Comms Degradation**: The simulation engine supports injecting communication dropouts, degrading specific networks (VHF, UHF, SATCOM, DATALINK) and affecting all personnel relying on them.
- **Orders & Situation Feed**: Simulated command traffic, including the ability for the instructor to push orders and trigger tactical alerts.
- **Central Event Logger**: Every movement, order, and degradation is strictly logged by the simulation engine in chronological order.
- **Automatic After-Action Report (AAR)**: When a simulation concludes, ECHO-FOG automatically processes the central event log into a printable, timestamped, formal after-action report (accessible by the instructor).

## Architecture

ECHO-FOG is built as a highly responsive full-stack monorepo:

- **Frontend (`@echo-fog/web`)**: React 18, Vite, Tailwind CSS, Zustand, and React-Leaflet. It uses `L.CRS.Simple` for offline map projection.
- **Backend (`@echo-fog/server`)**: Node.js, Express, Socket.IO, and Prisma (SQLite). Features a robust tick-based `SimulationEngine`.
- **Shared (`@echo-fog/shared`)**: Zod-based schemas ensuring type safety across the WebSocket boundary.

## Prerequisites

- Node.js (v18 or higher)
- npm

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/maneesha-9705/Multi-Domain.git
   cd Multi-Domain/echo-fog
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the Database**:
   ```bash
   npm run db:push -w @echo-fog/server
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   This will concurrently start the Vite frontend on `http://localhost:3000` and the Node backend on `http://localhost:3001`.

## Using the Simulator

1. Navigate to `http://localhost:3000`.
2. In the lobby, click **START DEMO OPORD** to launch the Instructor Dashboard.
3. Use the **Lifecycle Controls** (START, PAUSE, RESUME, END OP) to manage the scenario's progression.
4. Use the **Inject Menu** to move officers between buildings or trigger communication blackouts on specific networks.
5. Click **END OP** and then **VIEW AAR REPORT** to review the automatically generated chronological history of the operation.

## Disclaimer

**EXERCISE ONLY.** All data, locations (Sector KAVACH), personnel, and communications depicted in this application are purely fictional. This software does not interact with, depict, or simulate any real-world military systems, actual operational data, or real-world locations. It is built strictly for unclassified, simulated training purposes.