import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const MAX_EVENTS = 500;

export type PhysicalizationEventType =
  | 'P_GATE_ACTIVATED'
  | 'P_GATE_TRIGGERED'
  | 'QUORUM_REACHED'
  | 'NODE_PHYSICALIZED'
  | 'PHYSICALIZATION_REJECTED'
  | 'CRYPTO_SIG_RECEIVED';

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
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
    },
    logPGateState: (state, action: PayloadAction<PhysicalizationEvent>) => {
      state.events.push(action.payload);
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
    },
    rejectPhysicalization: (state, action: PayloadAction<PhysicalizationEvent>) => {
      state.events.push({ ...action.payload, eventType: 'PHYSICALIZATION_REJECTED' });
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
    },
  },
});

export const { triggerPhysicalization, logPGateState, rejectPhysicalization } = physicalizationSlice.actions;
export default physicalizationSlice.reducer;
