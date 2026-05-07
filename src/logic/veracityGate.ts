import { NodeAtom } from './types';

export function veracityGate(active: number, control: number): number {
  return Math.max(0, active - control);
}

export function calculateNodeVeracity(node: NodeAtom): number {
  return veracityGate(node.veracityScore, node.frictionMultiplier * node.resonanceScore);
}
