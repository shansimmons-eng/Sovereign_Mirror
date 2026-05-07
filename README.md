# Sovereign Mirror - V0.1 Alpha

A distributed governance simulator built on **Radical Veracity** principles—where mathematical truth governs system state.

## Architecture

- **Logic Kernel**: Pure functions enforcing 5 mandatory gates
- **Hybrid State**: Jotai (nodes) + Zustand (HUD) + Redux (ledger)
- **Radiant UI**: Three.js symbolic 3D visualization
- **Trusted Backend**: Express server mirroring kernel logic

## Quick Start

```bash
npm install
npm run dev
```

## Environment Variables

```env
VITE_OPENWEATHER_API_KEY=your_api_key_here
```

## Core Logic Gates

1. **Veracity Gate**: V = max(0, V_active - V_control)
2. **P-Gate**: Q = min(N, ⌈√N⌉ + 2) with 7-cycle confirmation
3. **Inverion Divide**: Remediation layer (tombstoning, never deletion)
4. **Abolition of Pain**: Friction = ∞ for pain-inducing paths
5. **Atrophy Timer**: VR × 0.95^t per 24-hour cycle

## Tech Stack

React 18, Three.js (R3F), TailwindCSS, Jotai, Zustand, Redux Toolkit, Node.js/Express

## Documentation

See [SYSTEM_LOGIC.md](./SYSTEM_LOGIC.md) for core mandates and [RECRUITMENT_READINESS.md](./RECRUITMENT_READINESS.md) for technical pitch.

## License

MIT