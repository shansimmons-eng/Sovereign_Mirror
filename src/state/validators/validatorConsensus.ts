import { store } from '../ledger/store';
import { logEvent } from '../ledger/slices/veracitySlice';
import { triggerPhysicalization } from '../ledger/slices/physicalizationSlice';
import { nodeAtomFamily } from '../atoms/nodeAtoms';
import { validatorAtomFamily, validatorIds, validateNode, aggregateValidatorResults, ValidatorResult } from './validatorAtoms';
import { veracityGate } from '../../logic/veracityGate';
import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from '../../logic/types';

const CONFIRMATION_CYCLES = 7;

interface ValidatorState {
  pendingValidations: Map<string, Promise<ValidatorResult[]>>;
  validatedNodes: Set<string>;
}

const validationState: ValidatorState = {
  pendingValidations: new Map(),
  validatedNodes: new Set(),
};

async function runValidators(nodeId: string, node: ReturnType<typeof nodeAtomFamily.get>): Promise<ValidatorResult[]> {
  const results = await Promise.all(
    validatorIds.map(async (validatorId) => {
      const result = await validateNode(validatorId, node as NodeAtom);
      store.dispatch(logEvent({
        id: `VAL_${Date.now()}_${validatorId}`,
        nodeId,
        eventType: 'VERACITY_GATE_CROSSED',
        veracityScore: result.veracityScore,
        velocity: 0,
        timestamp: Date.now(),
        causalChain: [`Validator: ${validatorId}`, `Status: ${result.status}`],
      }));
      return result;
    })
  );

  return results;
}

export async function validateAndCommit(nodeId: string): Promise<boolean> {
  if (validationState.validatedNodes.has(nodeId)) {
    return true;
  }

  const pending = validationState.pendingValidations.get(nodeId);
  if (pending) {
    return pending.then(() => true);
  }

  const node = nodeAtomFamily(nodeId);
  const nodeValue = typeof node === 'function' ? node : node;

  const validationPromise = runValidators(nodeId, nodeValue as NodeAtom);
  validationState.pendingValidations.set(nodeId, validationPromise);

  try {
    const results = await validationPromise;
    const aggregate = aggregateValidatorResults(results);

    if (aggregate.consensus) {
      validationState.validatedNodes.add(nodeId);

      const resonanceScore = nodeValue.resonanceScore;
      const threshold = GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);

      store.dispatch(triggerPhysicalization({
        id: `PHY_${Date.now()}_${nodeId}`,
        nodeId,
        eventType: 'P_GATE_TRIGGERED',
        resonanceScore,
        threshold,
        quorumSize: aggregate.verifiedCount,
        affirmingNodes: aggregate.verifiedCount,
        timestamp: Date.now(),
      }));

      return true;
    } else {
      console.warn(
        `%c[VALIDATOR_CONSENSUS] %c${nodeId} rejected by validators`,
        'color: #FB923C; font-weight: bold;',
        'color: #FFF7ED;',
        `\n  Verified: ${aggregate.verifiedCount}/${results.length}`,
        `\n  Rejected: ${aggregate.rejectedCount}/${results.length}`
      );
      return false;
    }
  } finally {
    validationState.pendingValidations.delete(nodeId);
  }
}

export function isNodeValidated(nodeId: string): boolean {
  return validationState.validatedNodes.has(nodeId);
}

export function getValidatorCount(): number {
  return validatorIds.length;
}

export function resetValidationState(): void {
  validationState.pendingValidations.clear();
  validationState.validatedNodes.clear();
}

export { runValidators, aggregateValidatorResults };