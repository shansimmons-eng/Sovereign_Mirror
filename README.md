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
---

## Session Log — June 2026

### Mobile responsiveness
- All dashboard panels now scroll independently on mobile (`<main>` has `overflow-y: auto`; nested panels use `min-h-0` to allow inner overflow)
- Cognoscentae Ultrans collapses from 3 columns to 1 column on mobile (`<768px`)
- Body weight + ring rotation speeds tuned for 60fps on low-end mobile

### Visualization (`src/components/three/OrbitalRings.tsx`)
- Replaced 3 thin concentric rings with 5 thick layers (radii 0.8–3.85)
- 24/16/12/8/6 spokes per ring, alternating CW/CCW rotation
- 32 white particles per ring drift along circumference with pulsing opacity
- Wireframe outer sphere (r=4.2) rotates on Y axis (per Aether-HUD spec)
- Rotating reticle crosshair (4 spokes at cardinals)
- Pulse ring breathing scale + opacity
- Glow ring radial gradient (3.4–4.1)
- All rings face the camera (removed the `rotation={[Math.PI/2, 0, 0]}` that was flattening them onto the XZ plane)
- Kinetic particle opacity reduced from 0.65 to 0.35 so rings remain visible

### Cognoscentae Ultrans training UI (`training/src/interface/CognoscentaeUltrans.tsx`)
- Loading spinner + "ROUTING TO RO+BERTa · GROQ · OPENROUTER" indicator while `analyzeInput` is in flight
- "Test API" button (P-Gate panel) shows a status box with `Target: 0.750 → Flux: X.XXX` and a `✓ Flux set to 0.75` / `✗ Flux mismatch` confirm
- Per-fallacy spectrograph now shows weighted score, agent breakdown (groq, openrouter), `✓` / `✗` verdict buttons calling `markVerdict`
- Spectrograph fixed to read `lastBreakdown.weightedScore` instead of the previous always-true "Radical Veracity Passed" string

### P-Gate Test API feedback
- `PGateButton.tsx` shows engagement result inline: status, target flux, actual flux, with `✓` / `✗` confirm
- `/api/pgate/engage` returns `canEngage: true` with `level: 0.75` when free agents have current data
- Rate limit fix: 100/min → 5000/min + per-`(ip, path)` keying so the ABM firehose on `/api/ledger/entry` doesn't starve the user

### Security (pre-push to GitHub)
- Verified zero secrets in tracked files (scanned for `gsk_*`, `sk-or-v1-*`, `hf_*`, `cfut_*`, Hetzner creds)
- `.env` already gitignored; all 6 `.env` files untracked
- Removed 13 tracked `*.pyc` files and 1 `sovereign-mirror-dist.tar.gz` via `git rm --cached`
- Expanded `.gitignore` for `*.tar.gz`, `*.zip`, `*.pyc`, `__pycache__/`, `.venv/`, `backup_manual*/`, `cup_backup_*`, `*.pem`, `*.key`, `*.crt`, `secrets/`, `deploy_artifacts/`, `*.deb`, `*.run`, SSH keys (`id_*`)

### Git / Deploy
- Hetzner production (`http://178.156.135.222/`): latest bundle `index-BAiprzg4.js` / `index-CWG6l_sD.css`
- Feature branch `feat/mobile-overflow-and-rings` (commit `f2f5641`) created locally; push to `origin/main` blocked pending GitHub credentials
- Vercel deployment (`https://dist-alpha-topaz-27.vercel.app` for the WordPress iframe) deferred until Layer A
