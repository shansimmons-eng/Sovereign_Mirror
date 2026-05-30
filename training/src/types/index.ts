export function veracityGate(active: number, control: number): number {
  if (!isFinite(active) || !isFinite(control)) return 0;
  return Math.max(0, active - control);
}

export enum InverionState {
  UNSPECIFIED = 0,
  SUBJECTIVE_NOISE = 1,
  TRANSITIONAL = 2,
  OBJECTIVE_REALITY = 3,
}

export interface FallacyVector {
  fallacyId: string;
  confidenceScore: number;
  validationProof: string;
}

export interface EpistemicFrameHeader {
  frameId: string;
  nodePublicKey: string;
  sequenceNumber: number;
  timestamp: string;
  previousFrameHash: string;
  nodeSignature: string;
}

export interface EpistemicFramePayload {
  rawInput: string;
  inverionDivide: InverionState;
  detectedFallacies: FallacyVector[];
  radicalVeracityPassed: boolean;
  refactoredInput?: string;
}

export interface ClusterSettlement {
  replicationWeight: number;
  peerEndorsements: string[];
  isGloballySettled: boolean;
}

export interface EpistemicFrame {
  header: EpistemicFrameHeader;
  payload: EpistemicFramePayload;
  settlement: ClusterSettlement;
}

export const FALLACY_CRITICAL_THRESHOLD = 0.15;
export const FALLACY_ID_REGEX = /^CU-FALLACY-[A-Z_-]+$/;
export const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export interface TrainingProgress {
  nodeId: string;
  moduleId: string;
  interceptCount: number;
  averageRefactorTime: number;
  veracityScore: number;
  lastUpdated: number;
}

export interface NodeEpistemicState {
  nodeId: string;
  currentFrame: EpistemicFrame | null;
  interceptActive: boolean;
  fallaciesDetected: FallacyVector[];
  rawInput: string;
  refactoredInput: string;
}

export interface TrainingMetrics {
  totalIntercepts: number;
  successfulRefactors: number;
  averageResolutionTime: number;
  currentStreak: number;
  maxStreak: number;
}

export interface ManifoldNode {
  id: string;
  text: string;
  fallacyType: string | null;
  magnitude: number;
  persistence: number;
  position: [number, number, number];
  temporalIndex: number;
}

export interface ManifoldUpdate {
  nodes: ManifoldNode[];
  V_active: number;
  V_cost: number;
  bypass_triggered: boolean;
  inverion_triggered: boolean;
  timestamp: number;
  root_fallacy_id: string | null;
}

export interface SlidingWindowChunk {
  text: string;
  startToken: number;
  endToken: number;
  timestamp: number;
  contentHash: string;
  fallacyCount: number;
}

export function createEpistemicFrame(
  nodeId: string,
  rawInput: string,
  analysisResult: { detectedFallacies: FallacyVector[]; inverionState: InverionState; radicalVeracityPassed: boolean },
  refactoredInput?: string
): EpistemicFrame {
  const now = new Date().toISOString();
  return {
    header: {
      frameId: crypto.randomUUID(),
      nodePublicKey: btoa(nodeId).substring(0, 32),
      sequenceNumber: Date.now(),
      timestamp: now,
      previousFrameHash: '',
      nodeSignature: '',
    },
    payload: {
      rawInput,
      inverionDivide: analysisResult.inverionState,
      detectedFallacies: analysisResult.detectedFallacies,
      radicalVeracityPassed: analysisResult.radicalVeracityPassed,
      refactoredInput,
    },
    settlement: {
      replicationWeight: 0,
      peerEndorsements: [],
      isGloballySettled: false,
    },
  };
}

export function validateVeracityFrame(frame: EpistemicFrame): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!UUID_REGEX.test(frame.header.frameId)) {
    errors.push('Invalid frame_id format');
  }

  if (frame.payload.inverionDivide === InverionState.UNSPECIFIED) {
    errors.push('InverionState cannot be UNSPECIFIED');
  }

  for (const fallacy of frame.payload.detectedFallacies) {
    if (!FALLACY_ID_REGEX.test(fallacy.fallacyId)) {
      errors.push(`Invalid fallacy_id: ${fallacy.fallacyId}`);
    }
    if (fallacy.confidenceScore < 0 || fallacy.confidenceScore > 1) {
      errors.push(`Invalid confidence_score: ${fallacy.confidenceScore}`);
    }
  }

  const hasHighFallacy = frame.payload.detectedFallacies.some(f => f.confidenceScore > FALLACY_CRITICAL_THRESHOLD);
  if (frame.payload.radicalVeracityPassed && hasHighFallacy) {
    errors.push(`Invariant violation: radical_veracity_passed=true with fallacy > ${FALLACY_CRITICAL_THRESHOLD}`);
  }

  return { valid: errors.length === 0, errors };
}