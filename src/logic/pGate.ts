import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from './types';

export function calculateQuorum(activeNodes: number): number {
  // Guard against invalid inputs
  if (!isFinite(activeNodes) || activeNodes < 0) return 0;
  if (activeNodes === 0) return 0;
  const sqrtPlusTwo = Math.ceil(Math.sqrt(activeNodes)) + 2;
  return Math.min(activeNodes, sqrtPlusTwo);
}

export function isQuorumReached(
  activeNodes: number,
  affirmingNodes: number
): boolean {
  const quorum = calculateQuorum(activeNodes);
  return affirmingNodes >= quorum;
}

export function getPThreshold(): number {
  return GOLDEN_RATIO;
}

export function getThresholdWithEntropy(): number {
  return GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);
}

export function isAtThreshold(resonance: number, _activeNodes: number): boolean {
  const threshold = getThresholdWithEntropy();
  return resonance >= threshold;
}

export const CONFIRMATION_CYCLES = 7;
export const CONFIRMATION_WINDOW_MS = 1000;

export interface PGateState {
  crossingFrame: number;
  confirmed: boolean;
}

/**
 * Pure function for P-Gate confirmation check.
 * All dependencies (time, state cache) are injected for testability.
 * 
 * @param nodeId - Node identifier
 * @param resonanceScore - Current resonance score
 * @param currentTimeMs - Current timestamp (inject Date.now() from caller)
 * @param stateCache - Mutable state cache (managed by caller, e.g., Zustand store)
 * @returns Confirmation status and cycles held
 */
export function checkPGateConfirmation(
  nodeId: string,
  resonanceScore: number,
  currentTimeMs: number,
  stateCache: Map<string, PGateState>
): { canTrigger: boolean; cyclesHeld: number; newState: PGateState | null } {
  const threshold = getThresholdWithEntropy();
  const currentFrame = Math.floor(currentTimeMs / CONFIRMATION_WINDOW_MS);

  if (resonanceScore >= threshold) {
    let state = stateCache.get(nodeId);

    if (!state || state.crossingFrame < currentFrame) {
      state = { crossingFrame: currentFrame, confirmed: false };
    }

    const cyclesHeld = currentFrame - state.crossingFrame;
    if (cyclesHeld >= CONFIRMATION_CYCLES) {
      state = { ...state, confirmed: true };
    }

    return { canTrigger: state.confirmed, cyclesHeld, newState: state };
  } else {
    return { canTrigger: false, cyclesHeld: 0, newState: null };
  }
}

/**
 * Creates a new P-Gate state cache.
 * Use this in your state management layer (Zustand/Redux).
 */
export function createPGateStateCache(): Map<string, PGateState> {
  return new Map<string, PGateState>();
}

export function getConfirmationCycles(): number {
  return CONFIRMATION_CYCLES;
}
