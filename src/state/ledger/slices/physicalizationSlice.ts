import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PhysicalizationEventType =
  | 'P_GATE_ACTIVATED'
  | 'P_GATE_TRIGGERED'
  | 'QUORUM_REACHED'
  | 'NODE_PHYSICALIZED'
  | 'PHYSICALIZATION_REJECTED';

export interface PhysicalizationEvent {
  id: string;
  nodeId: string;
  eventType: PhysicalizationEventType;
  resonanceScore: number;
  threshold: number;
  quorumSize: number;
  affirmingNodes: number;
  timestamp: number;
}

interface PhysicalizationState {
  events: PhysicalizationEvent[];
}

const initialState: PhysicalizationState = {
  events: [],
};

const physicalizationSlice = createSlice({
  name: 'physicalization',
  initialState,
  reducers: {
    triggerPhysicalization: (state, action: PayloadAction<PhysicalizationEvent>) => {
      state.events.push(action.payload);
    },
    logPGateState: (state, action: PayloadAction<PhysicalizationEvent>) => {
      state.events.push(action.payload);
    },
    rejectPhysicalization: (state, action: PayloadAction<PhysicalizationEvent>) => {
      state.events.push({ ...action.payload, eventType: 'PHYSICALIZATION_REJECTED' });
    },
  },
});

export const { triggerPhysicalization, logPGateState, rejectPhysicalization } = physicalizationSlice.actions;
export default physicalizationSlice.reducer;
