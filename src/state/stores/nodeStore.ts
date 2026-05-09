import { create } from 'zustand';
import { NodeAtom } from '../../logic/types';

interface PGateState {
  crossingFrame: number;
  cyclesHeld: number;
  canTrigger: boolean;
}

interface RTSWData {
  speed: number;
  density: number;
  temperature: number;
  bx: number;
  by: number;
  bz: number;
  bt: number;
  timestamp: number;
  source: string;
}

interface NodeState {
  nodeIds: string[];
  nodes: Record<string, NodeAtom>;
  pGateStates: Record<string, PGateState>;
  flux: number;
  rtsw: RTSWData | null;
  setNodeIds: (ids: string[]) => void;
  updateNode: (nodeId: string, updates: Partial<NodeAtom>) => void;
  getNode: (nodeId: string) => NodeAtom | undefined;
  updatePGateState: (nodeId: string, state: Partial<PGateState>) => void;
  getPGateState: (nodeId: string) => PGateState;
  setFlux: (flux: number) => void;
  setRTSW: (data: RTSWData) => void;
}

export const useNodeStore = create<NodeState>((set, get) => ({
  nodeIds: [],
  nodes: {},
  pGateStates: {},
  flux: 0.130,
  rtsw: null,

  setNodeIds: (ids) => set({ nodeIds: ids }),

  updateNode: (nodeId, updates) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    const updated = existing
      ? Object.assign({}, existing, updates, { nodeId })
      : { ...updates, nodeId } as NodeAtom;
    nodes[nodeId] = updated;
    set({ nodes });
  },

  getNode: (nodeId) => get().nodes[nodeId],

  updatePGateState: (nodeId, state) => {
    const { pGateStates } = get();
    const current = pGateStates[nodeId] || { crossingFrame: 0, cyclesHeld: 0, canTrigger: false };
    set({
      pGateStates: {
        ...pGateStates,
        [nodeId]: { ...current, ...state },
      },
    });
  },

  getPGateState: (nodeId) => {
    return get().pGateStates[nodeId] || { crossingFrame: 0, cyclesHeld: 0, canTrigger: false };
  },

  setFlux: (newFlux) => set({ flux: newFlux }),

  setRTSW: (data) => set({ rtsw: data }),
}));

export const nodeIdsAtom = useNodeStore.getState().nodeIds;