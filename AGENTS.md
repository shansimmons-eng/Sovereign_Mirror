# Sovereign Mirror - Agent Guidelines

## Project Overview
Distributed governance simulator built on Radical Veracity principles. Hybrid state: Jotai (atoms), Zustand (HUD), Redux (Ledger). Symbolic 3D visualization with golden threads and Sierpinski fractal morphing.

---

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server

# Production
npm run build             # TypeScript check + Vite build
npm run preview           # Preview production build

# Server
npm run server            # Run Node.js Express server (src/services/apiService.ts)
```

**Single Test Command**: No test framework configured yet. Run manually via:
```bash
npx tsx src/logic/pGate.ts   # Test specific logic module
```

---

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** (`strict: true` in tsconfig.json)
- No unused locals or parameters (`noUnusedLocals`, `noUnusedParameters`)
- Use `interface` for object shapes, `type` for unions/primitives
- Prefer explicit return types on exported functions

### Imports
- External libs: `three`, `@react-three/fiber`, `@reduxjs/toolkit`, `jotai`, `zustand`
- Internal: relative paths (`../../logic/types`)
- No barrel re-exports unless explicitly needed

### Naming Conventions
- Components: PascalCase (`ResonanceTrajectory`, `SystemicSliders`)
- Functions/Variables: camelCase (`calculateQuorum`, `nodeIds`)
- Constants: SCREAMING_SNAKE_CASE (`GOLDEN_RATIO`, `MAX_NODES`)
- Types/Interfaces: PascalCase (`NodeAtom`, `AuditEntry`)

### Error Handling
- Validate all math operations with `isFinite()` before assignment
- Guard against NaN: `if (isNaN(matrix.elements[0])) continue`
- Cap deltas: `Math.min(delta, 0.05)` to prevent huge jumps
- Use `Math.min(value, 0.99)` to prevent singularities in lerp/slerp

### Three.js / R3F Specific
- **InstancedMesh**: Always set `frustumCulled={false}` when instances move dynamically
- **Geometry disposal**: Always dispose in useEffect cleanup
- **useFrame**: Read Zustand state via `getState()` inside useFrame, not through hooks
- **Matrix validation**: Check `isNaN()` before `mesh.setMatrixAt()`

---

## Project Architecture

### State Layers
| Layer | Library | Purpose |
|-------|---------|---------|
| Atoms | Jotai | Per-node reactive state |
| HUD | Zustand | Flux, noise, sunrise opacity |
| Ledger | Redux | Audit trail, veracity log |

### Sync Bridge
- Zustand → Redux sync via `src/state/syncBridge/syncBridge.ts`
- Use `subscribe` to reactively update Ledger

### Logic Kernel (`src/logic/`)
Five mandatory gates that must remain pure:
1. **veracityGate.ts** - `max(0, V_active - V_control)`
2. **pGate.ts** - 7-cycle confirmation, quorum formula: `min(N, ceil(sqrt(N)) + 2)`
3. **inverionDivide.ts** - Remediation (NOT deletion) of deprecated nodes
4. **abolitionOfPain.ts** - Pain threshold enforcement
5. **atrophyTimer.ts** - T_limit: 86,400,000ms (24h)

### Key Constants (from `src/logic/types.ts`)
```typescript
GOLDEN_RATIO = 0.618
THRESHOLD_ENTROPY = 0.07  // ±7.0%
ATROPHY_T_LIMIT = 86400000
CONFIRMATION_CYCLES = 7
BASE_TICK_RATE = 400ms
```

---

## 3D Visualization (`ResonanceTrajectory.tsx`)

### Performance Limits
- **MAX_NODES = 100** (instanced mesh count)
- **Sierpinski depth ≤ 3** (depth=4+ crashes most browsers)
- Geometry disposal required in useEffect cleanup

### Flux System
- Flux clamped at 0.95 to prevent lerp collapse
- Morph factor: `clamp(smoothedFlux, 0, 1)`
- Fractal appears when flux > 0.5

### Stability Guards
```typescript
if (delta > 0.1 || !isFinite(delta)) return;
if (!isFinite(morphFactor)) return;
if (isNaN(dummy.matrix.elements[0])) continue;
```

---

## File Structure
```
src/
  components/
    three/ResonanceTrajectory.tsx  # Main 3D canvas
    ui/                            # React UI components
    hud/VeracityLog.tsx            # HUD layer display
  state/
    stores/
      nodeStore.ts    # Zustand: flux, nodeIds
      hudStore.ts    # Zustand: noise, opacity
    atoms/           # Jotai atoms
    syncBridge/      # Zustand → Redux sync
  logic/             # Pure functions (5 gates)
  services/          # API service (client-side)
server/
  index.js           # Express server fallback
```

---

## Common Issues & Fixes

### Crash on Flux Increase
1. Reduce MAX_NODES to 100
2. Lower Sierpinski depth to 2-3
3. Add `frustumCulled={false}` to InstancedMesh
4. Add NaN guard before setMatrixAt

### Context Lost / GL_OUT_OF_MEMORY
- Geometry not disposed - check useEffect cleanup
- Too many instances - reduce MAX_NODES
- Sierpinski depth too high - max depth=3

### State Drift
- VeracityEnforcer middleware throws if drift > 0.01
- Use syncBridge to keep Zustand/Redux in sync

---

## Dependencies
- **React 18.2**, **Three.js 0.160**, **@react-three/fiber 8.15**
- **Zustand 4.5**, **Jotai 2.6**, **@reduxjs/toolkit 2.11**
- **Tailwind 3.4**, **Vite 7.3**, **TypeScript 5.3**
