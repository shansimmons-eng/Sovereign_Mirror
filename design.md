# Design Specification: The Inverion Divide

**Project Codename:** Sovereign Mirror
**System Architecture:** React + Three.js (R3F) + UV/Python Bridge
**Primary Goal:** Transform chaotic solar telemetry into a volumetric, "white-hot" sanctuary.

---

## 1. System Overview

The interface is a real-time "Veracity Observer." It bridges the gap between raw astrophysical data and human-centric visual resonance. The system consists of three distinct layers:

- **The Bridge (Python/uv):** Fetches, scrubs, and serves NOAA/NASA JSON telemetry.
- **The Logic (Veracity Gate):** Audits the data stream for "Bypass" events or veracity spikes.
- **The Viewport (Resonance Trajectory):** A 2,000-node instanced particle system utilizing additive blending for "Ignition."

---

## 2. Visual Language & Aesthetics

- **The Core:** An incandescent, "overdriven" white-hot singularity created by the dense overlap of additive particles.
- **The Fringe:** High-velocity threads that transition from bright amber to deep, dark gold.
- **Texture:** Frayed silk and kinetic streaks. Particles are stretched quads (1:4 aspect ratio) aligned to the local velocity vector.
- **Atmosphere:** Deep black background (high contrast) with a blooming effect that allows light to "bleed" into the surrounding UI components.

---

## 3. Component Architecture

### A. ResonanceTrajectory (The Viewport)

- **Geometry:** `PlaneGeometry(0.015, 0.1)` (Stretched quads)
- **Material:** `MeshBasicMaterial` (Transparent: true, Blending: AdditiveBlending, DepthTest: false)
- **Instance Count:** 2,000 particles
- **Motion Logic:**
  - *Inhale/Exhale:* 4-second sinusoidal oscillation
  - *Centripetal Pull:* Inward lerp toward origin, modulated by solarDensity
  - *Shredding:* Bz (magnetic) spikes add random displacement to simulate turbulence

### B. TestDashboard (The Audit)

- **The Veracity Gate:** Compares V_active (live data) vs. V_control (simulation)
- **Bypass Detection:** Triggers a lockout if the delta between frames exceeds 0.5 units per tick
- **Node Status:** Real-time display of the "Tick Rate" and the current active node count

### C. The Bridge (The Backend)

- **Scrubber:** Mandatory try/except logic to catch 500 errors from NOAA
- **Sanity Floor:** Ensures values never hit NaN or Inf
- **Defaults:** Speed (400), Density (1.0), Temperature (100,000)

---

## 4. Technical Constraints (The "Ignition" Protocol)

To achieve the intended "Blinding" effect, the following settings must be strictly enforced:

- **Tone Mapping:** `THREE.NoToneMapping` (Allows HDR values > 1.0)
- **Intensity Curve:** Inverse square falloff (`I = 1 / d^2`)
- **Velocity Alignment:** Each instance matrix must rotate to face its own velocity vector to maintain the "streak" appearance

---

## 5. Success Criteria & Verification

| Criteria | Verification |
|----------|---------------|
| **Ignition Check** | Does the center of the viewport reach #FFFFFF? |
| **Performance** | Is the frame rate ≥ 60fps with 2,000 active instances? |
| **Veracity** | Does the UI accurately reflect a data drop-out (e.g., locking the gate)? |
| **Resonance** | Does the "breathing" cycle feel organic rather than mechanical? |

---

## 6. Implementation Instructions

1. **Start Bridge:** `cd server && uv run server.py`
2. **Initialize Frontend:** Ensure InstancedMesh is initialized with Float32Arrays for high-performance updates
3. **Apply Logic:** Ensure the useFrame loop pulls from a useRef to avoid React re-render bottlenecks

### Required Components

- `three` / `@react-three/fiber`: Viewport engine
- `uv`: Python package management
- `NOAA JSON API`: Real-time telemetry source

---

## 4. Goal-Driven Execution

**Define success:** Use this design.md to stitch a functional, high-density solar interface.
