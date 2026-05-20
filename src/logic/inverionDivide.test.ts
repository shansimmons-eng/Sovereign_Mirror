import { describe, it, expect } from 'vitest';
import {
  tombstoneEntry,
  healEntry,
  deprecateVeracityImpact,
  getCausalChain,
  RemediationEntry,
} from './inverionDivide';
import { AuditEntry } from './types';

describe('inverionDivide', () => {
  const createAuditEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
    timestamp: Date.now(),
    action: 'VERACITY_GATE_CROSSED',
    veracityDelta: 0.1,
    causalChain: ['cause-1', 'cause-2'],
    deprecated: false,
    healedTimestamp: null,
    ...overrides,
  });

  describe('tombstoneEntry', () => {
    it('marks entry as deprecated', () => {
      const entry = createAuditEntry();
      const result = tombstoneEntry(entry);

      expect(result.remediationStatus).toBe('deprecated');
      expect(result.healedTimestamp).toBeNull();
    });

    it('preserves original entry data', () => {
      const entry = createAuditEntry({ veracityDelta: 0.5 });
      const result = tombstoneEntry(entry);

      expect(result.veracityDelta).toBe(0.5);
      expect(result.action).toBe('VERACITY_GATE_CROSSED');
      expect(result.causalChain).toEqual(['cause-1', 'cause-2']);
    });

    it('is pure - does not mutate original', () => {
      const entry = createAuditEntry();
      const original = { ...entry };
      tombstoneEntry(entry);

      expect(entry).toEqual(original);
    });
  });

  describe('healEntry', () => {
    it('marks entry as healed with timestamp', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry(),
        remediationStatus: 'deprecated',
      };
      const healTime = 1234567890;
      const result = healEntry(entry, healTime);

      expect(result.remediationStatus).toBe('healed');
      expect(result.healedTimestamp).toBe(healTime);
    });

    it('is pure - accepts timestamp as parameter', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry(),
        remediationStatus: 'deprecated',
      };

      // Same timestamp produces same result
      const result1 = healEntry(entry, 1000);
      const result2 = healEntry(entry, 1000);

      expect(result1.healedTimestamp).toBe(result2.healedTimestamp);
    });

    it('does not mutate original entry', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry(),
        remediationStatus: 'deprecated',
      };
      const original = { ...entry };
      healEntry(entry, Date.now());

      expect(entry).toEqual(original);
    });
  });

  describe('deprecateVeracityImpact', () => {
    it('returns 0 for healed entries', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ veracityDelta: 0.5 }),
        remediationStatus: 'healed',
      };

      expect(deprecateVeracityImpact(entry)).toBe(0);
    });

    it('returns veracityDelta for deprecated entries', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ veracityDelta: 0.3 }),
        remediationStatus: 'deprecated',
      };

      expect(deprecateVeracityImpact(entry)).toBe(0.3);
    });

    it('returns veracityDelta for active entries', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ veracityDelta: 0.7 }),
        remediationStatus: 'active',
      };

      expect(deprecateVeracityImpact(entry)).toBe(0.7);
    });

    it('returns 0 for NaN veracityDelta', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ veracityDelta: NaN }),
        remediationStatus: 'deprecated',
      };

      expect(deprecateVeracityImpact(entry)).toBe(0);
    });

    it('returns 0 for Infinity veracityDelta', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ veracityDelta: Infinity }),
        remediationStatus: 'deprecated',
      };

      expect(deprecateVeracityImpact(entry)).toBe(0);
    });
  });

  describe('getCausalChain', () => {
    it('returns causal chain from entry', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry({ causalChain: ['a', 'b', 'c'] }),
        remediationStatus: 'active',
      };

      expect(getCausalChain(entry)).toEqual(['a', 'b', 'c']);
    });

    it('returns empty array for undefined causalChain', () => {
      const entry: RemediationEntry = {
        ...createAuditEntry(),
        remediationStatus: 'active',
        causalChain: undefined as unknown as string[],
      };

      expect(getCausalChain(entry)).toEqual([]);
    });
  });
});
