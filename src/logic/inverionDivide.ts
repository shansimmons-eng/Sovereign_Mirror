import { AuditEntry } from './types';

export type RemediationStatus = 'active' | 'deprecated' | 'healed';

export interface RemediationEntry extends AuditEntry {
  remediationStatus: RemediationStatus;
}

/**
 * Tombstone an entry for remediation (NOT deletion).
 * Per Radical Veracity principles, deprecated nodes are healed, not removed.
 */
export function tombstoneEntry(entry: AuditEntry): RemediationEntry {
  return {
    ...entry,
    remediationStatus: 'deprecated',
    healedTimestamp: null,
  };
}

/**
 * Heal a previously deprecated entry.
 * @param entry The entry to heal
 * @param timestampMs Current timestamp (inject for purity, use Date.now() in caller)
 */
export function healEntry(entry: RemediationEntry, timestampMs: number): RemediationEntry {
  return {
    ...entry,
    remediationStatus: 'healed',
    healedTimestamp: timestampMs,
  };
}

/**
 * Get the veracity impact of a remediation entry.
 * Healed entries have zero impact.
 */
export function deprecateVeracityImpact(entry: RemediationEntry): number {
  if (entry.remediationStatus === 'healed') {
    return 0;
  }
  // Guard against NaN/Infinity
  return isFinite(entry.veracityDelta) ? entry.veracityDelta : 0;
}

/**
 * Get the causal chain for an entry.
 * Returns empty array if undefined.
 */
export function getCausalChain(entry: RemediationEntry): string[] {
  return entry.causalChain ?? [];
}
