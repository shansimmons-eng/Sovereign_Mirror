import { describe, it, expect } from 'vitest';
import { veracityGate, calculateNodeVeracity } from './veracityGate';
import { NodeAtom } from './types';

describe('veracityGate', () => {
  describe('core formula: max(0, active - control)', () => {
    it('returns difference when active > control', () => {
      expect(veracityGate(1.0, 0.3)).toBeCloseTo(0.7);
      expect(veracityGate(0.8, 0.2)).toBeCloseTo(0.6);
    });

    it('returns 0 when control >= active', () => {
      expect(veracityGate(0.3, 0.5)).toBe(0);
      expect(veracityGate(0.5, 0.5)).toBe(0);
    });

    it('handles zero inputs', () => {
      expect(veracityGate(0, 0)).toBe(0);
      expect(veracityGate(0.5, 0)).toBeCloseTo(0.5);
      expect(veracityGate(0, 0.5)).toBe(0);
    });
  });

  describe('invalid input guards', () => {
    it('returns 0 for NaN inputs', () => {
      expect(veracityGate(NaN, 0.5)).toBe(0);
      expect(veracityGate(0.5, NaN)).toBe(0);
      expect(veracityGate(NaN, NaN)).toBe(0);
    });

    it('returns 0 for Infinity inputs', () => {
      expect(veracityGate(Infinity, 0.5)).toBe(0);
      expect(veracityGate(0.5, Infinity)).toBe(0);
      expect(veracityGate(-Infinity, 0.5)).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles very small differences', () => {
      expect(veracityGate(0.0001, 0.00005)).toBeCloseTo(0.00005);
    });

    it('handles negative inputs (clamps to 0)', () => {
      expect(veracityGate(-0.5, 0.5)).toBe(0);
      expect(veracityGate(0.5, -0.5)).toBeCloseTo(1.0);
    });
  });
});

describe('calculateNodeVeracity', () => {
  const createNode = (overrides: Partial<NodeAtom>): NodeAtom => ({
    nodeId: 'test-node',
    veracityScore: 0.8,
    resonanceScore: 0.5,
    virtualResonance: 0.5,
    veracityVelocity: 0,
    lastPhysicalizationTs: 0,
    frictionMultiplier: 1,
    pillarMastery: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    systemicSliders: { temperature: 0.5, noiseFilter: 0.3 },
    status: 'virtual',
    deprecated: false,
    healedTimestamp: null,
    auditTrail: [],
    ...overrides,
  });

  it('calculates control as friction * resonance', () => {
    const node = createNode({
      veracityScore: 1.0,
      frictionMultiplier: 0.5,
      resonanceScore: 0.4,
    });
    // control = 0.5 * 0.4 = 0.2
    // veracity = max(0, 1.0 - 0.2) = 0.8
    expect(calculateNodeVeracity(node)).toBeCloseTo(0.8);
  });

  it('returns 0 when friction causes control overflow', () => {
    const node = createNode({
      veracityScore: 0.5,
      frictionMultiplier: 2,
      resonanceScore: 0.5,
    });
    // control = 2 * 0.5 = 1.0
    // veracity = max(0, 0.5 - 1.0) = 0
    expect(calculateNodeVeracity(node)).toBe(0);
  });

  it('handles Infinity friction (pain-inducing state)', () => {
    const node = createNode({
      veracityScore: 0.8,
      frictionMultiplier: Infinity,
      resonanceScore: 0.5,
    });
    // Infinity * 0.5 = Infinity, guard should return 0
    expect(calculateNodeVeracity(node)).toBe(0);
  });

  it('handles zero resonance with Infinity friction (NaN case)', () => {
    const node = createNode({
      veracityScore: 0.8,
      frictionMultiplier: Infinity,
      resonanceScore: 0,
    });
    // Infinity * 0 = NaN, guard should return 0
    expect(calculateNodeVeracity(node)).toBe(0);
  });
});
