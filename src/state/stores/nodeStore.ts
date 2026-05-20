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
  syncStatus: 'STANDBY' | 'SYNCING' | 'ACTIVE';
  syncProgress: number;
  setNodeIds: (ids: string[]) => void;
  updateNode: (nodeId: string, updates: Partial<NodeAtom>) => void;
  getNode: (nodeId: string) => NodeAtom | undefined;
  updatePGateState: (nodeId: string, state: Partial<PGateState>) => void;
  getPGateState: (nodeId: string) => PGateState;
  setFlux: (flux: number) => void;
  setRTSW: (data: RTSWData) => void;
  setSyncStatus: (status: 'STANDBY' | 'SYNCING' | 'ACTIVE', progress?: number) => void;
}

export const useNodeStore = create<NodeState>((set, get) => ({
  nodeIds: [],
  nodes: {},
  pGateStates: {},
  flux: 0.75,
  rtsw: null,
  syncStatus: 'ACTIVE',
  syncProgress: 7,

  setNodeIds: (ids) => set({ nodeIds: ids }),

  updateNode: (nodeId, updates) => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    const updated = existing
      ? { ...existing, ...updates, nodeId }
      : { ...updates, nodeId } as NodeAtom;
    // Immutable update - avoid direct mutation before set()
    set({ nodes: { ...nodes, [nodeId]: updated } });
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

  setFlux: (newFlux) => {
    // Validate and clamp flux to prevent NaN/Infinity and lerp collapse
    if (!isFinite(newFlux)) return;
    // Clamp at 0.95 max to prevent lerp collapse per AGENTS.md
    const clamped = Math.max(0, Math.min(0.95, newFlux));
    set({ flux: clamped });
  },

  setRTSW: (data) => set({ rtsw: data }),

  setSyncStatus: (status, progress = 7) => set({ syncStatus: status, syncProgress: progress }),
}));

// Selector function - use this instead of static export which captured initial []
export const getNodeIds = () => useNodeStore.getState().nodeIds;