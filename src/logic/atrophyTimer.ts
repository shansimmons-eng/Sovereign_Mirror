import { ATROPHY_T_LIMIT, ATROPHY_DECAY_RATE } from './types';

export function calculateAtrophyDecay(
  virtualResonance: number,
  elapsedMs: number
): number {
  if (elapsedMs <= 0) return virtualResonance;
  const t = Math.floor(elapsedMs / ATROPHY_T_LIMIT);
  return virtualResonance * Math.pow(ATROPHY_DECAY_RATE, t);
}

export function getAtrophyTimerTicks(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / ATROPHY_T_LIMIT);
}

export function isAtrophied(virtualResonance: number, elapsedMs: number): boolean {
  return calculateAtrophyDecay(virtualResonance, elapsedMs) < 0.001;
}
