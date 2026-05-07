export function veracityGate(active, control) {
  return Math.max(0, active - control);
}

export function calculateQuorum(activeNodes) {
  const sqrtPlusTwo = Math.ceil(Math.sqrt(activeNodes)) + 2;
  return Math.min(activeNodes, sqrtPlusTwo);
}

export function isQuorumReached(activeNodes, affirmingNodes) {
  const quorum = calculateQuorum(activeNodes);
  return affirmingNodes >= quorum;
}

export function calculateAtrophyDecay(virtualResonance, elapsedMs, T_LIMIT = 86400000, DECAY_RATE = 0.95) {
  if (elapsedMs <= 0) return virtualResonance;
  const t = Math.floor(elapsedMs / T_LIMIT);
  return virtualResonance * Math.pow(DECAY_RATE, t);
}

export function getAtrophyTimerTicks(elapsedMs, T_LIMIT = 86400000) {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / T_LIMIT);
}

export function tombstoneEntry(entry) {
  return {
    ...entry,
    remediationStatus: 'deprecated',
    healedTimestamp: null,
  };
}

export function healEntry(entry) {
  return {
    ...entry,
    remediationStatus: 'healed',
    healedTimestamp: Date.now(),
  };
}

export function deprecateVeracityImpact(entry) {
  if (entry.remediationStatus === 'healed') {
    return 0;
  }
  return entry.veracityDelta;
}

export function calculateFriction(paths) {
  return paths.reduce((max, friction) => Math.max(max, friction), Infinity);
}

export function isPainInducing(friction) {
  return friction === Infinity;
}

export function selectLowFrictionPath(paths) {
  const validPaths = paths.filter(p => p !== Infinity);
  if (validPaths.length === 0) return Infinity;
  return Math.min(...validPaths);
}

export function getPThreshold(PHI = 0.618) {
  return PHI;
}

export function getThresholdWithEntropy(PHI = 0.618, ENTROPY = 0.07) {
  return PHI * (1 + ENTROPY);
}

export function isAtThreshold(resonance, PHI = 0.618, ENTROPY = 0.07) {
  return resonance >= getThresholdWithEntropy(PHI, ENTROPY);
}