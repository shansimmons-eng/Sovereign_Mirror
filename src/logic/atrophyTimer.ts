import { ATROPHY_T_LIMIT, ATROPHY_DECAY_RATE } from './types';

/** Threshold below which a node is considered fully atrophied */
const ATROPHY_THRESHOLD = 0.001;

/**
 * Calculate atrophy decay: V * (decay_rate)^floor(elapsed/T_limit)
 * Returns 0 for invalid inputs or values below threshold.
 */
export function calculateAtrophyDecay(
  virtualResonance: number,
  elapsedMs: number
): number {
  // Guard against invalid inputs
  if (!isFinite(virtualResonance) || !isFinite(elapsedMs)) return 0;
  if (elapsedMs <= 0) return virtualResonance;
  if (virtualResonance <= 0) return 0;
  
  const t = Math.floor(elapsedMs / ATROPHY_T_LIMIT);
  const decay = virtualResonance * Math.pow(ATROPHY_DECAY_RATE, t);
  
  // Clamp to 0 if below threshold to avoid precision issues with very small numbers
  return decay < ATROPHY_THRESHOLD ? 0 : decay;
}

/**
 * Get the number of atrophy timer ticks that have elapsed.
 */
export function getAtrophyTimerTicks(elapsedMs: number): number {
  if (!isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / ATROPHY_T_LIMIT);
}

/**
 * Check if a node has fully atrophied (decayed below threshold).
 */
export function isAtrophied(virtualResonance: number, elapsedMs: number): boolean {
  return calculateAtrophyDecay(virtualResonance, elapsedMs) < ATROPHY_THRESHOLD;
}
