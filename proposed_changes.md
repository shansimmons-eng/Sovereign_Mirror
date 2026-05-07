# Proposed Changes

Issues to be created in [github.com/shansimmons-eng/Sovereign_Mirror](https://github.com/shansimmons-eng/Sovereign_Mirror/issues).

---

## Robustness

### 1. Add Vitest test framework for logic kernel
**Labels:** `enhancement`, `testing`

Add Vitest and write unit tests for all 5 logic gates. The pure functions (`veracityGate`, `calculateQuorum`, `calculateFriction`, `calculateAtrophyDecay`, etc.) are perfectly testable. This catches regressions like the `Infinity` accumulator bug that went unnoticed.

**Acceptance:** `npm run test` passes with >90% coverage on `src/logic/`.

---

### 2. Add React error boundary around Canvas
**Labels:** `bug`, `stability`

If WebGL context is lost or Three.js throws, the entire app crashes. Wrap `<Canvas>` in an error boundary that shows a fallback UI and optionally retries.

**Acceptance:** Simulate context loss — app displays fallback instead of white screen.

---

### 3. Cap Redux event arrays with ring buffer
**Labels:** `performance`, `completed`

~~Events push into arrays with no maximum. Over time memory grows unbounded.~~

**Status:** Fixed — MAX_EVENTS = 500 with FIFO eviction applied to both slices.

---

### 4. Consolidate state management (Jotai/Zustand/Redux)
**Labels:** `refactor`, `architecture`

Node state currently exists in three places (Jotai atoms, Zustand store, Redux ledger). This creates sync issues, triple update overhead, and confusion about source of truth.

**Proposal:** Keep Zustand as primary reactive store, Redux only for the append-only audit ledger. Remove Jotai or use it exclusively for derived/computed atoms (not as a second node store).

---

### 5. Extract shared logic package for client/server
**Labels:** `refactor`, `DRY`

`src/logic/` and `server/logic/kernel.js` duplicate all gate functions. Changes must be made in two places. Extract into a workspace package (or shared ESM module) that both client and server import.

---

## Features

### 6. Real ZK-proofs with snarkjs/circom
**Labels:** `feature`, `cryptography`

The current `zkProof.ts` uses a trivially reversible string hash. Replace with actual verifiable computation using `snarkjs` or `circom` for governance vote proofs.

**Complexity:** High — requires circuit design and trusted setup.

---

### 7. WebSocket live sync for multi-client observation
**Labels:** `feature`, `networking`

Replace polling with a WebSocket layer so multiple browser tabs (or users) can observe the same simulation in real-time. Server broadcasts state diffs.

---

### 8. Persistence layer (IndexedDB / SQLite)
**Labels:** `feature`, `data`

All state is lost on refresh. Add IndexedDB for client-side audit trail persistence, or SQLite on the server. Enable session resume and historical analysis.

---

### 9. 2D Node graph visualization
**Labels:** `feature`, `visualization`

Add a force-directed graph (d3-force or react-force-graph) showing quorum relationships and vote propagation alongside the 3D view. Provides complementary structural insight.

---

### 10. Governance playback / time-travel debugger
**Labels:** `feature`, `debugging`

Record simulation states and allow scrubbing through time. Useful for auditing governance decisions and understanding how gates responded to specific inputs.

---

### 11. Plugin system for custom logic gates
**Labels:** `feature`, `extensibility`

Allow users to define custom logic gates via a plugin interface, making the simulator extensible for different governance models beyond the 5 mandatory gates.

---

### 12. Adversarial "Red Team" mode
**Labels:** `feature`, `security`

Implement the adversarial testing referenced in `RECRUITMENT_READINESS.md`. Let users inject byzantine nodes that attempt to corrupt state, visualizing how gates respond in real-time.

---

### 13. Metrics dashboard with time-series charts
**Labels:** `feature`, `observability`

Track and chart veracity drift, quorum convergence time, atrophy rates over time using a lightweight charting lib (e.g., `recharts` or `visx`). Provides quantitative system health view.

---

### 14. Export/import simulation state
**Labels:** `feature`, `data`

JSON export of full system state for sharing scenarios between users. Enables reproducible governance experiments and collaborative analysis.

---

## Bulk Import

To create these as GitHub Issues, install `gh` CLI and run:
```bash
gh auth login
gh issue create --title "Add Vitest test framework" --body "..." --label enhancement,testing
# repeat for each issue
```

Or use the GitHub web UI: **Issues → New Issue** and copy each title/body above.
