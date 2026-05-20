import { describe, it, expect } from 'vitest';
import {
  calculateFriction,
  isPainInducing,
  selectLowFrictionPath,
} from './abolitionOfPain';

describe('calculateFriction', () => {
  describe('finds maximum friction from paths', () => {
    it('returns max of multiple paths', () => {
      expect(calculateFriction([0.1, 0.5, 0.3])).toBeCloseTo(0.5);
      expect(calculateFriction([1, 2, 3])).toBe(3);
    });

    it('handles single path', () => {
      expect(calculateFriction([0.7])).toBeCloseTo(0.7);
    });
  });

  describe('edge cases', () => {
    it('returns 0 for empty array', () => {
      expect(calculateFriction([])).toBe(0);
    });

    it('filters out NaN values', () => {
      expect(calculateFriction([0.5, NaN, 0.3])).toBeCloseTo(0.5);
    });

    it('returns Infinity when all paths are invalid', () => {
      expect(calculateFriction([NaN, NaN])).toBe(Infinity);
      expect(calculateFriction([Infinity, -Infinity])).toBe(Infinity);
    });

    it('handles negative friction values', () => {
      expect(calculateFriction([-0.5, 0.3])).toBeCloseTo(0.3);
    });
  });
});

describe('isPainInducing', () => {
  describe('identifies pain states', () => {
    it('returns true for Infinity (blocked path)', () => {
      expect(isPainInducing(Infinity)).toBe(true);
    });

    it('returns true for -Infinity', () => {
      expect(isPainInducing(-Infinity)).toBe(true);
    });

    it('returns true for NaN', () => {
      expect(isPainInducing(NaN)).toBe(true);
    });
  });

  describe('identifies non-pain states', () => {
    it('returns false for finite positive values', () => {
      expect(isPainInducing(0)).toBe(false);
      expect(isPainInducing(0.5)).toBe(false);
      expect(isPainInducing(100)).toBe(false);
    });

    it('returns false for finite negative values', () => {
      expect(isPainInducing(-0.5)).toBe(false);
    });
  });
});

describe('selectLowFrictionPath', () => {
  describe('selects minimum valid path', () => {
    it('returns minimum from multiple paths', () => {
      expect(selectLowFrictionPath([0.5, 0.2, 0.8])).toBeCloseTo(0.2);
      expect(selectLowFrictionPath([3, 1, 2])).toBe(1);
    });

    it('excludes Infinity paths', () => {
      expect(selectLowFrictionPath([0.5, Infinity, 0.3])).toBeCloseTo(0.3);
    });

    it('excludes NaN paths', () => {
      expect(selectLowFrictionPath([0.5, NaN, 0.3])).toBeCloseTo(0.3);
    });
  });

  describe('edge cases', () => {
    it('returns Infinity when no valid paths exist', () => {
      expect(selectLowFrictionPath([])).toBe(Infinity);
      expect(selectLowFrictionPath([Infinity, Infinity])).toBe(Infinity);
      expect(selectLowFrictionPath([NaN, Infinity])).toBe(Infinity);
    });

    it('handles all blocked paths (pain state)', () => {
      const result = selectLowFrictionPath([Infinity, Infinity, Infinity]);
      expect(isPainInducing(result)).toBe(true);
    });
  });
});
