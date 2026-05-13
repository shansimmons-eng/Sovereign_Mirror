# Sovereign Mirror

Distributed governance simulator built on Radical Veracity principles.

## Overview

Sovereign Mirror visualizes the interplay between veracity scores, p-gate confirmations, and node physicalization through a symbolic 3D environment. The visualization features golden threads and Sierpinski fractal morphing, driven by real-time NOAA solar wind data.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    FRONTEND                     │
│  React + TypeScript + Three.js (WebGL Canvas)   │
└─────────────────────────────────────────────────┘
```

**State Layers:**

| Layer | Library | Purpose |
|-------|---------|---------|
| Atoms | Jotai | Per-node reactive state |
| HUD | Zustand | Flux, noise, sunrise opacity |
| Ledger | Redux | Audit trail, veracity log |

## Tech Stack

| Component | Technology |
|-----------|-------------|
| Frontend | React 18, TypeScript, Three.js, React Three Fiber |
| State | Jotai, Zustand, Redux Toolkit |
| Styling | Tailwind CSS |
| Build | Vite |

## Key Features

- **Veracity Gate**: Tracks V_active - V_control with audit logging
- **P-Gate Confirmation**: 7-cycle protocol with quorum formula
- **3D Particle Visualization**: 2000 particles with custom GLSL shaders
- **NOAA Solar Wind Integration**: Real-time data driving animation
- **Atrophy Timer**: 24-hour limit for node deprecation

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # TypeScript check + Vite build
npm run preview    # Preview production build
npm run server     # Run Express server
```

## Links

- [KylosArc.com](https://kylosarc.com) — Learn more about the project and goals