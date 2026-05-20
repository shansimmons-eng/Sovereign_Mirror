import { describe, it, expect } from 'vitest';
import {
  calculateAtrophyDecay,
  getAtrophyTimerTicks,
  isAtrophied,
} from './atrophyTimer';
import { ATROPHY_T_LIMIT, ATROPHY_DECAY_RATE } from './types';

describe('calculateAtrophyDecay', () => {
  describe('decay formula: V * (0.95)^floor(elapsed/T_limit)', () => {
    it('returns original value when no time has elapsed', () => {
      expect(calculateAtrophyDecay(1.0, 0)).toBe(1.0);
      expect(calculateAtrophyDecay(0.5, 0)).toBe(0.5);
    });

    it('returns original value for negative elapsed time', () => {
      expect(calculateAtrophyDecay(1.0, -1000)).toBe(1.0);
    });

    it('decays by DECAY_RATE per T_LIMIT period', () => {
      const initial = 1.0;
      
      // After 1 day (1 T_LIMIT)
      const after1 = calculateAtrophyDecay(initial, ATROPHY_T_LIMIT);
      expect(after1).toBeCloseTo(ATROPHY_DECAY_RATE); // 0.95
      
      // After 2 days
      const after2 = calculateAtrophyDecay(initial, ATROPHY_T_LIMIT * 2);
      expect(after2).toBeCloseTo(Math.pow(ATROPHY_DECAY_RATE, 2)); // 0.9025
    });

    it('uses floor for partial periods (no partial decay)', () => {
      const initial = 1.0;
      
      // 0.5 days - no decay yet
      const halfDay = calculateAtrophyDecay(initial, ATROPHY_T_LIMIT * 0.5);
      expect(halfDay).toBe(1.0);
      
      // 1.9 days - only 1 period of decay
      const almostTwo = calculateAtrophyDecay(initial, ATROPHY_T_LIMIT * 1.9);
      expect(almostTwo).toBeCloseTo(ATROPHY_DECAY_RATE);
    });
  });

  describe('invalid input guards', () => {
    it('returns 0 for NaN virtualResonance', () => {
      expect(calculateAtrophyDecay(NaN, 1000)).toBe(0);
    });

    it('returns 0 for NaN elapsedMs', () => {
      expect(calculateAtrophyDecay(1.0, NaN)).toBe(0);
    });

    it('returns 0 for Infinity inputs', () => {
      expect(calculateAtrophyDecay(Infinity, 1000)).toBe(0);
      expect(calculateAtrophyDecay(1.0, Infinity)).toBe(0);
    });

    it('returns 0 for zero or negative virtualResonance', () => {
      expect(calculateAtrophyDecay(0, ATROPHY_T_LIMIT)).toBe(0);
      expect(calculateAtrophyDecay(-0.5, ATROPHY_T_LIMIT)).toBe(0);
    });
  });

  describe('atrophy threshold clamping', () => {
    it('returns 0 when decayed below threshold', () => {
      // ~145 days to decay below 0.001
      const longTime = ATROPHY_T_LIMIT * 145;
      expect(calculateAtrophyDecay(1.0, longTime)).toBe(0);
    });
  });
});

describe('getAtrophyTimerTicks', () => {
  it('returns number of complete T_LIMIT periods', () => {
    expect(getAtrophyTimerTicks(0)).toBe(0);
    expect(getAtrophyTimerTicks(ATROPHY_T_LIMIT)).toBe(1);
    expect(getAtrophyTimerTicks(ATROPHY_T_LIMIT * 5)).toBe(5);
    expect(getAtrophyTimerTicks(ATROPHY_T_LIMIT * 2.9)).toBe(2);
  });

  it('returns 0 for invalid inputs', () => {
    expect(getAtrophyTimerTicks(-1000)).toBe(0);
    expect(getAtrophyTimerTicks(NaN)).toBe(0);
    expect(getAtrophyTimerTicks(Infinity)).toBe(0);
  });
});

describe('isAtrophied', () => {
  it('returns false for healthy resonance', () => {
    expect(isAtrophied(1.0, 0)).toBe(false);
    expect(isAtrophied(0.5, ATROPHY_T_LIMIT * 10)).toBe(false);
  });

  it('returns true when decayed below threshold', () => {
    // 145+ days should atrophy a value of 1.0
    expect(isAtrophied(1.0, ATROPHY_T_LIMIT * 150)).toBe(true);
  });

  it('returns true for already-low resonance', () => {
    expect(isAtrophied(0.0005, ATROPHY_T_LIMIT)).toBe(true);
  });

  it('handles edge case at threshold boundary', () => {
    // 0.001 is the threshold
    expect(isAtrophied(0.001, 0)).toBe(false);  // exactly at threshold
    expect(isAtrophied(0.0009, 0)).toBe(true);  // below threshold
  });
});

describe('constants verification', () => {
  it('T_LIMIT is 24 hours in milliseconds', () => {
    expect(ATROPHY_T_LIMIT).toBe(86400000); // 24 * 60 * 60 * 1000
  });

  it('DECAY_RATE is 0.95', () => {
    expect(ATROPHY_DECAY_RATE).toBe(0.95);
  });
});
