import { VeracityEvent, VeracityEventType } from '../ledger/slices/veracitySlice';
import { PhysicalizationEvent, PhysicalizationEventType } from '../ledger/slices/physicalizationSlice';
import { NodeAtom } from '../../logic/types';

type HUDCallback = (state: { temperature: number; noiseFilter: number }) => void;
type NodeCallback = (node: NodeAtom) => void;

const hudSubscriptions = new Set<HUDCallback>();
const nodeSubscriptions = new Map<string, NodeCallback>();

export function subscribeToHUD(callback: HUDCallback): () => void {
  hudSubscriptions.add(callback);
  return () => hudSubscriptions.delete(callback);
}

export function subscribeToNode(nodeId: string, callback: NodeCallback): () => void {
  nodeSubscriptions.set(nodeId, callback);
  return () => nodeSubscriptions.delete(nodeId);
}

export function notifyPGateRejection(nodeId: string, reason: string): void {
  const callback = nodeSubscriptions.get(nodeId);
  if (callback) {
    callback({
      nodeId,
      veracityScore: 0,
      resonanceScore: 0,
      virtualResonance: 0,
      veracityVelocity: 0,
      lastPhysicalizationTs: 0,
      frictionMultiplier: Infinity,
      pillarMastery: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      systemicSliders: { temperature: 0.5, noiseFilter: 0.3 },
      status: 'corrective',
      deprecated: false,
      healedTimestamp: null,
      auditTrail: [],
    });
  }
}

export function dispatchPGateEvent(
  nodeId: string,
  eventType: PhysicalizationEventType,
  resonanceScore: number,
  threshold: number,
  quorumSize: number,
  affirmingNodes: number
): PhysicalizationEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    nodeId,
    eventType,
    resonanceScore,
    threshold,
    quorumSize,
    affirmingNodes,
    timestamp: Date.now(),
  };
}

export function dispatchVeracityEvent(
  nodeId: string,
  eventType: VeracityEventType,
  veracityScore: number,
  velocity: number,
  causalChain: string[]
): VeracityEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    nodeId,
    eventType,
    veracityScore,
    velocity,
    timestamp: Date.now(),
    causalChain,
  };
}
