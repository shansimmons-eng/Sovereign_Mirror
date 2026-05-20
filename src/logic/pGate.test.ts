import { describe, it, expect } from 'vitest';
import {
  calculateQuorum,
  isQuorumReached,
  getPThreshold,
  getThresholdWithEntropy,
  isAtThreshold,
  checkPGateConfirmation,
  createPGateStateCache,
  CONFIRMATION_CYCLES,
  CONFIRMATION_WINDOW_MS,
} from './pGate';
import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from './types';

describe('calculateQuorum', () => {
  describe('formula: min(N, ceil(sqrt(N)) + 2)', () => {
    it('calculates correctly for small networks', () => {
      expect(calculateQuorum(1)).toBe(1);   // min(1, ceil(1)+2) = min(1, 3) = 1
      expect(calculateQuorum(4)).toBe(4);   // min(4, ceil(2)+2) = min(4, 4) = 4
      expect(calculateQuorum(9)).toBe(5);   // min(9, ceil(3)+2) = min(9, 5) = 5
    });

    it('calculates correctly for larger networks', () => {
      expect(calculateQuorum(100)).toBe(12);  // min(100, ceil(10)+2) = 12
      expect(calculateQuorum(1000)).toBe(34); // min(1000, ceil(31.6)+2) = 34
    });

    it('returns 0 for zero nodes', () => {
      expect(calculateQuorum(0)).toBe(0);
    });
  });

  describe('invalid input guards', () => {
    it('returns 0 for negative inputs', () => {
      expect(calculateQuorum(-1)).toBe(0);
      expect(calculateQuorum(-100)).toBe(0);
    });

    it('returns 0 for NaN', () => {
      expect(calculateQuorum(NaN)).toBe(0);
    });

    it('returns 0 for Infinity', () => {
      expect(calculateQuorum(Infinity)).toBe(0);
      expect(calculateQuorum(-Infinity)).toBe(0);
    });
  });
});

describe('isQuorumReached', () => {
  it('returns true when affirming >= quorum', () => {
    expect(isQuorumReached(9, 5)).toBe(true);  // quorum=5
    expect(isQuorumReached(9, 6)).toBe(true);
    expect(isQuorumReached(9, 9)).toBe(true);
  });

  it('returns false when affirming < quorum', () => {
    expect(isQuorumReached(9, 4)).toBe(false);  // quorum=5
    expect(isQuorumReached(9, 0)).toBe(false);
  });

  it('handles edge case of single node', () => {
    expect(isQuorumReached(1, 1)).toBe(true);
    expect(isQuorumReached(1, 0)).toBe(false);
  });
});

describe('threshold functions', () => {
  it('getPThreshold returns GOLDEN_RATIO', () => {
    expect(getPThreshold()).toBe(GOLDEN_RATIO);
  });

  it('getThresholdWithEntropy applies entropy tolerance', () => {
    const expected = GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);
    expect(getThresholdWithEntropy()).toBeCloseTo(expected);
  });

  it('isAtThreshold checks against entropy-adjusted threshold', () => {
    const threshold = getThresholdWithEntropy();
    expect(isAtThreshold(threshold, 10)).toBe(true);
    expect(isAtThreshold(threshold + 0.01, 10)).toBe(true);
    expect(isAtThreshold(threshold - 0.01, 10)).toBe(false);
  });
});

describe('checkPGateConfirmation', () => {
  it('requires CONFIRMATION_CYCLES to trigger', () => {
    const cache = createPGateStateCache();
    const threshold = getThresholdWithEntropy();
    const startTime = 1000000;

    // First check - starts the counter
    const result1 = checkPGateConfirmation('node-1', threshold, startTime, cache);
    expect(result1.canTrigger).toBe(false);
    expect(result1.cyclesHeld).toBe(0);
    expect(result1.newState).not.toBeNull();

    // Apply the state
    if (result1.newState) cache.set('node-1', result1.newState);

    // Check after 6 cycles - not yet
    const time6 = startTime + (CONFIRMATION_WINDOW_MS * 6);
    const result6 = checkPGateConfirmation('node-1', threshold, time6, cache);
    expect(result6.canTrigger).toBe(false);
    expect(result6.cyclesHeld).toBe(6);

    // Check after 7 cycles - triggers
    const time7 = startTime + (CONFIRMATION_WINDOW_MS * 7);
    const result7 = checkPGateConfirmation('node-1', threshold, time7, cache);
    expect(result7.canTrigger).toBe(true);
    expect(result7.cyclesHeld).toBe(7);
  });

  it('resets when resonance drops below threshold', () => {
    const cache = createPGateStateCache();
    const threshold = getThresholdWithEntropy();
    const startTime = 1000000;

    // Build up some cycles
    const result1 = checkPGateConfirmation('node-1', threshold, startTime, cache);
    if (result1.newState) cache.set('node-1', result1.newState);

    const time3 = startTime + (CONFIRMATION_WINDOW_MS * 3);
    checkPGateConfirmation('node-1', threshold, time3, cache);

    // Drop below threshold
    const resultDrop = checkPGateConfirmation('node-1', threshold - 0.1, time3, cache);
    expect(resultDrop.canTrigger).toBe(false);
    expect(resultDrop.cyclesHeld).toBe(0);
    expect(resultDrop.newState).toBeNull();
  });

  it('is pure - same inputs produce same outputs', () => {
    const cache1 = createPGateStateCache();
    const cache2 = createPGateStateCache();
    const threshold = getThresholdWithEntropy();
    const time = 1000000;

    const result1 = checkPGateConfirmation('node-1', threshold, time, cache1);
    const result2 = checkPGateConfirmation('node-1', threshold, time, cache2);

    expect(result1.canTrigger).toBe(result2.canTrigger);
    expect(result1.cyclesHeld).toBe(result2.cyclesHeld);
  });
});

describe('constants', () => {
  it('CONFIRMATION_CYCLES is 7', () => {
    expect(CONFIRMATION_CYCLES).toBe(7);
  });

  it('CONFIRMATION_WINDOW_MS is 1000', () => {
    expect(CONFIRMATION_WINDOW_MS).toBe(1000);
  });
});
