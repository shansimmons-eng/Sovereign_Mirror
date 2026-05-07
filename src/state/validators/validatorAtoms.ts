import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { NodeAtom } from '../../logic/types';
import { veracityGate } from '../../logic/veracityGate';

export type ValidatorStatus = 'PENDING' | 'VALIDATING' | 'VERIFIED' | 'REJECTED';

export interface ValidatorResult {
  validatorId: string;
  nodeId: string;
  status: ValidatorStatus;
  veracityScore: number;
  isConsistent: boolean;
  timestamp: number;
  message?: string;
}

export interface ValidatorAtom {
  validatorId: string;
  status: ValidatorStatus;
  lastResult: ValidatorResult | null;
  verifiedCount: number;
  rejectedCount: number;
}

const createDefaultValidator = (validatorId: string): ValidatorAtom => ({
  validatorId,
  status: 'PENDING',
  lastResult: null,
  verifiedCount: 0,
  rejectedCount: 0,
});

export const validatorAtomFamily = atomFamily((validatorId: string) =>
  atom<ValidatorAtom>(createDefaultValidator(validatorId))
);

export const requiredValidatorCount = 3;

export const validatorIds = ['VALIDATOR_ALPHA', 'VALIDATOR_BETA', 'VALIDATOR_GAMMA'];

export async function validateNode(validatorId: string, node: NodeAtom): Promise<ValidatorResult> {
  const computedVeracity = veracityGate(node.veracityScore, node.frictionMultiplier * node.resonanceScore);
  const expectedGateResult = Math.max(0, node.veracityScore - (node.frictionMultiplier * node.resonanceScore));

  const isConsistent = Math.abs(computedVeracity - expectedGateResult) < 0.0001;

  const processingTime = 50 + Math.random() * 100;
  await new Promise((resolve) => setTimeout(resolve, processingTime));

  const result: ValidatorResult = {
    validatorId,
    nodeId: node.nodeId,
    status: isConsistent ? 'VERIFIED' : 'REJECTED',
    veracityScore: computedVeracity,
    isConsistent,
    timestamp: Date.now(),
    message: isConsistent ? 'Veracity gate integrity confirmed' : 'State drift detected',
  };

  return result;
}

export function aggregateValidatorResults(results: ValidatorResult[]): {
  consensus: boolean;
  verifiedCount: number;
  rejectedCount: number;
  avgVeracity: number;
} {
  const verified = results.filter((r) => r.status === 'VERIFIED');
  const rejected = results.filter((r) => r.status === 'REJECTED');

  const consensus = verified.length >= requiredValidatorCount;

  return {
    consensus,
    verifiedCount: verified.length,
    rejectedCount: rejected.length,
    avgVeracity: results.reduce((sum, r) => sum + r.veracityScore, 0) / results.length,
  };
}

export function getValidatorFaultTolerance(): number {
  return requiredValidatorCount - 1;
}