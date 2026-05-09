import { store } from '../ledger/store';
import { logEvent, VeracityEventType } from '../ledger/slices/veracitySlice';
import { triggerPhysicalization, PhysicalizationEventType } from '../ledger/slices/physicalizationSlice';
import { veracityGate } from '../../logic/veracityGate';
import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from '../../logic/types';
import { useHUDStore } from '../stores/hudStore';
import { subscribeToNode, notifyPGateRejection } from './subscribe';

const CONFIRMATION_CYCLES = 7;

interface GateState {
  crossingFrame: number;
  confirmed: boolean;
  optimisticStatus: 'virtual' | 'refining' | 'physical';
}

const gateStateCache = new Map<string, GateState>();
const pendingConfirmations = new Map<string, Promise<boolean>>();

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function syncVeracityToLedger(
  nodeId: string,
  veracityScore: number,
  velocity: number,
  frictionMultiplier: number,
  resonanceScore: number
): void {
  const control = frictionMultiplier * resonanceScore;
  const result = veracityGate(veracityScore, control);

  if (result > 0) {
    const eventType: VeracityEventType = 'VERACITY_GATE_CROSSED';
    store.dispatch(logEvent({
      id: generateEventId(),
      nodeId,
      eventType,
      veracityScore: result,
      velocity,
      timestamp: Date.now(),
      causalChain: [`V_active=${veracityScore}`, `V_control=${control}`],
    }));
  }
}

export function initiatePhysicalization(
  nodeId: string,
  resonanceScore: number,
  threshold: number,
  quorumSize: number,
  affirmingNodes: number
): Promise<{ success: boolean; cyclesHeld: number }> {
  const eventType: PhysicalizationEventType = 'P_GATE_ACTIVATED';
  const event = {
    id: generateEventId(),
    nodeId,
    eventType,
    resonanceScore,
    threshold,
    quorumSize,
    affirmingNodes,
    timestamp: Date.now(),
  };

  store.dispatch(triggerPhysicalization(event));

  gateStateCache.set(nodeId, {
    crossingFrame: Date.now(),
    confirmed: false,
    optimisticStatus: 'physical',
  });

  subscribeToNode(nodeId, (node) => {
    if (node.status === 'corrective') {
      gateStateCache.delete(nodeId);
    }
  });

  const confirmationPromise = new Promise<boolean>((resolve) => {
    setTimeout(() => {
      const state = gateStateCache.get(nodeId);
      resolve(state?.confirmed ?? false);
    }, CONFIRMATION_CYCLES * useHUDStore.getState().effectiveTickRate);
  });

  pendingConfirmations.set(nodeId, confirmationPromise);

  return confirmationPromise.then((success) => {
    pendingConfirmations.delete(nodeId);
    if (!success) {
      notifyPGateRejection(nodeId, 'Quorum verification failed on ledger');
      store.dispatch(triggerPhysicalization({
        ...event,
        eventType: 'P_GATE_TRIGGERED',
      }));
    }
    return { success, cyclesHeld: CONFIRMATION_CYCLES };
  });
}

export function checkPGateWithConfirmation(
  nodeId: string,
  resonanceScore: number
): { canTrigger: boolean; confirmingCycles: number; effectiveTickRate: number } {
  const threshold = GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);
  const effectiveTickRate = useHUDStore.getState().effectiveTickRate;
  const currentFrame = Math.floor(Date.now() / effectiveTickRate);

  let state = gateStateCache.get(nodeId);

  if (resonanceScore >= threshold) {
    if (!state || state.crossingFrame < currentFrame) {
      state = { crossingFrame: currentFrame, confirmed: false, optimisticStatus: 'refining' };
      gateStateCache.set(nodeId, state);
    }

    const cyclesHeld = currentFrame - state.crossingFrame;
    if (cyclesHeld >= CONFIRMATION_CYCLES) {
      state.confirmed = true;
      state.optimisticStatus = 'physical';
    }

    return { canTrigger: state.confirmed, confirmingCycles: cyclesHeld, effectiveTickRate };
  } else {
    gateStateCache.delete(nodeId);
    return { canTrigger: false, confirmingCycles: 0, effectiveTickRate };
  }
}

export function revertNodeStatus(nodeId: string): void {
  gateStateCache.delete(nodeId);
  notifyPGateRejection(nodeId, 'Ledger rejected physicalization attempt');
}

export function getConfirmationWindowCycles(): number {
  return CONFIRMATION_CYCLES;
}

export function getPendingConfirmation(nodeId: string): Promise<boolean> | undefined {
  return pendingConfirmations.get(nodeId);
}
