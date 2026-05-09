import { AuditEntry } from './types';

export type RemediationStatus = 'active' | 'deprecated' | 'healed';

export interface RemediationEntry extends AuditEntry {
  remediationStatus: RemediationStatus;
}

export function tombstoneEntry(entry: AuditEntry): RemediationEntry {
  return {
    ...entry,
    remediationStatus: 'deprecated',
    healedTimestamp: null,
  };
}

export function healEntry(entry: RemediationEntry): RemediationEntry {
  return {
    ...entry,
    remediationStatus: 'healed',
    healedTimestamp: Date.now(),
  };
}

export function deprecateVeracityImpact(entry: RemediationEntry): number {
  if (entry.remediationStatus === 'healed') {
    return 0;
  }
  return entry.veracityDelta;
}

export function getCausalChain(entry: RemediationEntry): string[] {
  return entry.causalChain;
}
