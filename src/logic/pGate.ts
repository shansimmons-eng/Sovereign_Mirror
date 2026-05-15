import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from './types';

export function calculateQuorum(activeNodes: number): number {
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

const CONFIRMATION_CYCLES = 7;
const CONFIRMATION_WINDOW_MS = 1000;

interface PGateState {
  crossingFrame: number;
  confirmed: boolean;
}

const pGateStateCache = new Map<string, PGateState>();

export function checkPGateConfirmation(
  nodeId: string,
  resonanceScore: number
): { canTrigger: boolean; cyclesHeld: number } {
  const threshold = getThresholdWithEntropy();
  const currentFrame = Math.floor(Date.now() / CONFIRMATION_WINDOW_MS);

  if (resonanceScore >= threshold) {
    let state = pGateStateCache.get(nodeId);

    if (!state || state.crossingFrame < currentFrame) {
      state = { crossingFrame: currentFrame, confirmed: false };
      pGateStateCache.set(nodeId, state);
    }

    const cyclesHeld = currentFrame - state.crossingFrame;
    if (cyclesHeld >= CONFIRMATION_CYCLES) {
      state.confirmed = true;
    }

    return { canTrigger: state.confirmed, cyclesHeld };
  } else {
    pGateStateCache.delete(nodeId);
    return { canTrigger: false, cyclesHeld: 0 };
  }
}

export function resetPGateState(nodeId: string): void {
  pGateStateCache.delete(nodeId);
}

export function getConfirmationCycles(): number {
  return CONFIRMATION_CYCLES;
}
