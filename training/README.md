# Sovereign Mirror - CU Training Module

## Overview

Module 1: **Shattering the Darwinian Ghost** - A cognitive training system designed to identify, isolate, and systematically dismantle evolutionary survival impulses that distort reality.

## Architecture

```
training/
├── src/
│   ├── types/           # Core type definitions (InverionState, EpistemicFrame, etc.)
│   ├── engines/         # Fallacy detection and semantic analysis
│   ├── validators/      # Frame validation and invariant checking
│   ├── cluster/         # Manifold deformation and gravity well systems
│   └── interface/       # React components for training UI
```

## Key Components

### 1. EpistemicFrame (`types/index.ts`)
The foundational data frame for training:
- `InverionState` enum: UNSPECIFIED → SUBJECTIVE_NOISE → TRANSITIONAL → OBJECTIVE_REALITY
- `FallacyVector`: Detected cognitive distortions with confidence scores
- `EpistemicFrame`: Header + Payload + Settlement structure

### 2. Fallacy Detection (`engines/FallacyMapEngine.ts`)
Real-time semantic analysis for Darwinian cognitive distortions:
- CU-FALLACY-TRIBALISM (0.90 weight)
- CU-FALLACY-AD-HOMINEM (0.85 weight)
- CU-FALLACY-FALSE-DICHOTOMY (0.70 weight)
- And more...

### 3. Manifold Deformation (`cluster/GravityWell.ts`)
Spatial visualization system translating cognitive distortions into 3D geometry:
- `GravityWell`: Inverse square law displacement
- `ManifoldDeformer`: Mesh deformation engine
- `SemanticBridge`: Maps LLM output to manifold coordinates

### 4. Sliding Window Buffer (`cluster/SlidingWindowBuffer.ts`)
Real-time input stream processing with token-based windowing.

### 5. Training Session (`interface/TrainingSession.ts`)
React hook managing the training session state machine.

### 6. Cognoscentae Ultrans UI (`interface/CognoscentaeUltrans.tsx`)
The visual interface - an active cognitive mirror that visualizes the hidden mechanics of reasoning.

## Usage

```typescript
import { useTrainingSession, InverionState } from './training/src';

function MyComponent() {
  const {
    interceptActive,
    detectedFallacies,
    metrics,
    analyzeInput,
    triggerIntercept,
    resolveIntercept,
  } = useTrainingSession({ 
    nodeId: 'NODE_001',
    onFrameCreated: (frame, rawInput) => {
      // Handle frame creation for ledger settlement
    }
  });

  // Analyze text for cognitive distortions
  const result = analyzeInput("Our team is always right, they are wrong");

  // Intercept triggered if result.inverion_triggered
  if (interceptActive) {
    // User must refactor input to clear
  }
}
```

## Constants

- `FALLACY_CRITICAL_THRESHOLD = 0.15` - Confidence score above which intercept triggers
- `UUID_REGEX` - Validates frame_id as UUIDv4
- `FALLACY_ID_REGEX` - Pattern: `CU-FALLACY-[A-Z_-]+`

## Integration with CU Framework

This training module integrates with the existing Sovereign Mirror system:

1. **Veracity Gate**: Uses `veracityGate(V_active, V_control)` from `src/logic/veracityGate.ts`
2. **Node State**: Works with `NodeAtom` type for tracking veracity scores
3. **Ledger Settlement**: Creates `EpistemicFrame` objects for immutable logging

## Success Criteria

1. **Detection Latency**: Fallacy Map Engine flags linguistic distortion within <150ms
2. **Behavioral Interception**: Interrupt trigger halts outward communication
3. **Decoupling Metric**: Baseline frequency of triggered intercepts drops by ≥75% over 30 days