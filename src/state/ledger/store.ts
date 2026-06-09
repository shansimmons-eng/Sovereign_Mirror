import { configureStore, createAction, type PayloadAction } from '@reduxjs/toolkit';
import veracityReducer, { type VeracityEvent } from './slices/veracitySlice';
import physicalizationReducer, { type PhysicalizationEvent } from './slices/physicalizationSlice';
import { ledgerPersistMiddleware } from '../middleware/ledgerPersist';
import { loadLedger, type LedgerEntry } from './ledgerThunks';

export const hydrateEntries = createAction<LedgerEntry[]>('ledger/hydrateEntries');

export const store = configureStore({
  reducer: {
    veracity: veracityReducer,
    physicalization: physicalizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'veracity/logEvent',
          'physicalization/triggerPhysicalization',
          'physicalization/logPGateState',
          'physicalization/rejectPhysicalization',
        ],
      },
    }).concat(ledgerPersistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

let hydrationStarted = false;
export function startLedgerHydration(): void {
  if (hydrationStarted) return;
  hydrationStarted = true;
  void loadLedger().then((entries) => {
    for (const entry of entries) {
      const slice = (entry as { slice?: string }).slice;
      if (slice === 'veracity') {
        store.dispatch({
          type: 'veracity/logEvent',
          payload: entry as unknown as PayloadAction<VeracityEvent>['payload'],
        });
      } else if (slice === 'physicalization') {
        store.dispatch({
          type: 'physicalization/triggerPhysicalization',
          payload: entry as unknown as PayloadAction<PhysicalizationEvent>['payload'],
        });
      }
    }
  });
}
