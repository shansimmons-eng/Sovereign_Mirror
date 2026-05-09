export interface AuditEntry {
  timestamp: number;
  action: string;
  veracityDelta: number;
  causalChain: string[];
  deprecated: boolean;
  healedTimestamp: number | null;
}

export interface NodeAtom {
  nodeId: string;
  veracityScore: number;
  resonanceScore: number;
  virtualResonance: number;
  veracityVelocity: number;
  lastPhysicalizationTs: number;
  frictionMultiplier: number;
  pillarMastery: number[];
  systemicSliders: {
    temperature: number;
    noiseFilter: number;
  };
  status: 'virtual' | 'refining' | 'physical' | 'corrective';
  deprecated: boolean;
  healedTimestamp: number | null;
  auditTrail: AuditEntry[];
}

export interface ProjectThreshold {
  value: number;
  entropyVariance: number;
}

export const THRESHOLD_ENTROPY = 0.07;
export const ATROPHY_T_LIMIT = 86400000;
export const ATROPHY_DECAY_RATE = 0.95;
export const GOLDEN_RATIO = 0.618;

export function getThresholdWithEntropy(): number {
  return GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);
}
