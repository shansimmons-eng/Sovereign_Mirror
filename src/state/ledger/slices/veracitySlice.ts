import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type VeracityEventType =
  | 'VERACITY_CALCULATED'
  | 'VERACITY_GATE_CROSSED'
  | 'RESONANCE_SPIKE_DETECTED'
  | 'ATROPHY_TRIGGERED';

export interface VeracityEvent {
  id: string;
  nodeId: string;
  eventType: VeracityEventType;
  veracityScore: number;
  velocity: number;
  timestamp: number;
  causalChain: string[];
}

interface VeracityState {
  events: VeracityEvent[];
}

const initialState: VeracityState = {
  events: [],
};

const veracitySlice = createSlice({
  name: 'veracity',
  initialState,
  reducers: {
    logEvent: (state, action: PayloadAction<VeracityEvent>) => {
      state.events.push(action.payload);
    },
  },
});

export const { logEvent } = veracitySlice.actions;
export default veracitySlice.reducer;
