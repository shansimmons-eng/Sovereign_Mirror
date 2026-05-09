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

export const nodeVeracityVelocityFamily = atomFamily((nodeId: string) =>
  atom((get) => {
    const node = get(nodeAtomFamily(nodeId));
    const prevVeracity = node.veracityScore;
    const prevTimestamp = node.lastPhysicalizationTs || Date.now();
    const now = Date.now();
    const dt = Math.max(1, now - prevTimestamp);
    return node.veracityScore / dt;
  })
);

export const nodeResonanceVelocityFamily = atomFamily((nodeId: string) =>
  atom((get) => {
    const node = get(nodeAtomFamily(nodeId));
    const prevResonance = node.resonanceScore;
    const prevTimestamp = node.lastPhysicalizationTs || Date.now();
    const now = Date.now();
    const dt = Math.max(1, now - prevTimestamp);
    return (node.resonanceScore - prevResonance) / dt;
  })
);

export const pGateConfirmationFamily = atomFamily((nodeId: string) =>
  atom({
    crossingFrame: 0,
    cyclesHeld: 0,
    canTrigger: false,
  })
);
