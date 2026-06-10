# Sovereign Mirror - Agent Guidelines

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

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

---

## Session Log — June 2026

### Active feature work
- **Mobile responsiveness**: All dashboard panels now scroll independently. Ultrans is 1 column on mobile (was 3 with divider). `src/index.css` adds `.cui-wrapper`, `.cui-container`, `.cui-main` (column on mobile, row on desktop), `.left-panel` / `.right-panel` (each `flex: 1 1 0; min-height: 0; overflow-y: auto` with thin amber scrollbars). `Dashboard.tsx:102` changed `md:overflow-hidden` to `md:overflow-hidden overflow-y-auto` so the main scrolls on mobile.
- **5-layer orbital rings**: `OrbitalRings.tsx` was rewritten. Rings now face the camera (no Z-axis flattening). Includes 5 thick rings (radii 0.8–3.85), 24/16/12/8/6 spokes per ring, 32 particles per ring drifting along the circumference, wireframe outer sphere, rotating reticle crosshair, pulse ring, glow ring. Kinetic particle opacity reduced 0.65 → 0.35 to keep rings visible.
- **P-Gate Test API feedback**: `PGateButton.tsx` shows engagement result inline with `Target: 0.750 → Flux: X.XXX` and a `✓ Flux set to 0.75` / `✗ Flux mismatch` indicator.
- **Cognoscentae Ultrans UI**: loading spinner + "ROUTING TO..." indicator during `analyzeInput`. Spectrograph shows weighted score + per-agent breakdown (groq, openrouter) with `✓` / `✗` verdict buttons. Fixed "Radical Veracity Passed" always-true string to read `lastBreakdown.weightedScore` directly.
- **Rate limit**: `server/index.js` bumped from 100/min → 5000/min and changed `getRateLimitKey` to include `req.url` (per-path keying) so the ABM firehose on `/api/ledger/entry` no longer starves the user. Result: 0 429s in last 5 min (was hundreds).

### Critical bugs fixed
- **Empty statement log**: Caused by the rate-limit cascade. The ABM was flooding `/api/ledger/entry` at >100 req/min, burning the global token bucket. The browser's analyze request was 429ing, throwing inside the function arguments, and aborting before `setLastBreakdown` / `setStatementLog` ran. Per-path keying fixes it. Bundle `index-BiBnOqX2.js` includes `useEffect` diagnostics (`[TRAINING] lastBreakdown state changed`, `[TRAINING] statementLog state changed`) to confirm.
- **Test API button "fails to set alpha 0.75"**: The P-Gate *was* engaging at 0.75 server-side, but the user had no visual confirmation. Now `PGateButton.tsx` shows the actual flux value after the request — green ✓ if `Math.abs(flux - 0.75) < 0.001`, red ✗ otherwise.

### Security
- Zero secrets in tracked files. `.env` gitignored (all 6 `.env` files untracked). Removed 13 tracked `*.pyc` + 1 tarball via `git rm --cached`. Expanded `.gitignore` for `.venv`, `__pycache__/`, `*.tar.gz`, SSH keys, deploy artifacts, CUDA binaries, SQL setup files with embedded DB passwords.

### Git
- Feature branch `feat/mobile-overflow-and-rings` (commit `f2f5641`) ready locally. Push to `origin/main` blocked — no GitHub credentials in the environment.

### Open / next
- Layer A: data foundation (per-user sessions table, fallacy corpus dedupe, rebuttal API). Item 8 (rebuttals) is essentially free — `fallacy_data.json` already has `explanation` + `response` fields, and `FallacyDataset.ts` has `loadFallacyDataset()` + `findMatchingFallacy()` ready. Just needs a UI call.
