import { NodeAtom } from './types';

/**
 * Core veracity gate: V = max(0, V_active - V_control)
 * Returns 0 for invalid inputs (NaN, Infinity).
 */
export function veracityGate(active: number, control: number): number {
  // Guard against NaN/Infinity inputs
  if (!isFinite(active) || !isFinite(control)) return 0;
  return Math.max(0, active - control);
}

/**
 * Calculate node veracity using the veracity gate formula.
 * Control is computed as friction * resonance.
 */
export function calculateNodeVeracity(node: NodeAtom): number {
  const control = node.frictionMultiplier * node.resonanceScore;
  // Guard against Infinity * 0 = NaN
  if (!isFinite(control)) return 0;
  return veracityGate(node.veracityScore, control);
}
