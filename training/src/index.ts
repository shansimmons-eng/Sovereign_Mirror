export { EpistemicValidator, epistemicValidator } from './validators/EpistemicValidator';
export { SlidingWindowBuffer } from './cluster/SlidingWindowBuffer';
export { GravityWell, GravityWellRegistry, ManifoldDeformer, SemanticBridge } from './cluster/GravityWell';
export { useTrainingSession } from './interface/TrainingSession';
export { CognoscentaeUltrans } from './interface/CognoscentaeUltrans';

export {
  InverionState,
  FALLACY_CRITICAL_THRESHOLD,
  FALLACY_ID_REGEX,
  UUID_REGEX,
  veracityGate,
  createEpistemicFrame,
  validateVeracityFrame,
} from './types';

export type {
  FallacyVector,
  EpistemicFrame,
  EpistemicFrameHeader,
  EpistemicFramePayload,
  ClusterSettlement,
  TrainingProgress,
  NodeEpistemicState,
  TrainingMetrics,
  ManifoldNode,
  ManifoldUpdate,
  SlidingWindowChunk,
} from './types';