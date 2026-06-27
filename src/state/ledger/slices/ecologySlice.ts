import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const MAX_EVENTS = 200;

export type EcologyEventType = 'ECO_READING_RECEIVED' | 'ECO_THRESHOLD_BREACH';

export interface EcologyEvent {
  id: string;
  eventType: EcologyEventType;
  ecoHealth: number;
  temperatureAnomaly: number;
  timestamp: number;
}

interface EcologyState {
  events: EcologyEvent[];
}

const initialState: EcologyState = { events: [] };

const ecologySlice = createSlice({
  name: 'ecology',
  initialState,
  reducers: {
    logEcologyEvent: (state, action: PayloadAction<EcologyEvent>) => {
      state.events.push(action.payload);
      if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
      }
    },
  },
});

export const { logEcologyEvent } = ecologySlice.actions;
export default ecologySlice.reducer;
