import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { NodeAtom } from '../../logic/types';

const createDefaultNode = (nodeId: string): NodeAtom => ({
  nodeId,
  veracityScore: 0,
  resonanceScore: 0,
  virtualResonance: 0,
  veracityVelocity: 0,
  lastPhysicalizationTs: 0,
  frictionMultiplier: 1,
  pillarMastery: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  systemicSliders: {
    temperature: 0.5,
    noiseFilter: 0.3,
  },
  status: 'virtual',
  deprecated: false,
  healedTimestamp: null,
  auditTrail: [],
});

export const nodeAtomFamily = atomFamily((nodeId: string) =>
  atom<NodeAtom>(createDefaultNode(nodeId))
);

export const nodeIdsAtom = atom<string[]>([]);

export const meshSizeAtom = atom((get) => get(nodeIdsAtom).length);

/**
 * Cache for tracking previous values to calculate proper velocity (delta/time).
 * Without this, we cannot compute velocity since atoms only have current state.
 */
const veracityHistoryCache = new Map<string, { value: number; timestamp: number }>();
const resonanceHistoryCache = new Map<string, { value: number; timestamp: number }>();

/**
 * Calculates veracity velocity as (currentValue - previousValue) / deltaTime.
 * Updates cache on each read for next calculation.
 */
export const nodeVeracityVelocityFamily = atomFamily((nodeId: string) =>
  atom((get) => {
    const node = get(nodeAtomFamily(nodeId));
    const now = Date.now();
    const prev = veracityHistoryCache.get(nodeId);
    
    if (!prev) {
      // First read - cache current value, return 0 velocity
      veracityHistoryCache.set(nodeId, { value: node.veracityScore, timestamp: now });
      return 0;
    }
    
    const dt = Math.max(1, now - prev.timestamp);
    const velocity = (node.veracityScore - prev.value) / dt;
    
    // Update cache for next calculation
    veracityHistoryCache.set(nodeId, { value: node.veracityScore, timestamp: now });
    
    return velocity;
  })
);

/**
 * Calculates resonance velocity as (currentValue - previousValue) / deltaTime.
 * Updates cache on each read for next calculation.
 */
export const nodeResonanceVelocityFamily = atomFamily((nodeId: string) =>
  atom((get) => {
    const node = get(nodeAtomFamily(nodeId));
    const now = Date.now();
    const prev = resonanceHistoryCache.get(nodeId);
    
    if (!prev) {
      // First read - cache current value, return 0 velocity
      resonanceHistoryCache.set(nodeId, { value: node.resonanceScore, timestamp: now });
      return 0;
    }
    
    const dt = Math.max(1, now - prev.timestamp);
    const velocity = (node.resonanceScore - prev.value) / dt;
    
    // Update cache for next calculation
    resonanceHistoryCache.set(nodeId, { value: node.resonanceScore, timestamp: now });
    
    return velocity;
  })
);

/**
 * Clear velocity caches for a node (call when node is removed).
 */
export function clearVelocityCaches(nodeId: string): void {
  veracityHistoryCache.delete(nodeId);
  resonanceHistoryCache.delete(nodeId);
}

export const pGateConfirmationFamily = atomFamily((_nodeId: string) =>
  atom({
    crossingFrame: 0,
    cyclesHeld: 0,
    canTrigger: false,
  })
);
