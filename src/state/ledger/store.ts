import { configureStore } from '@reduxjs/toolkit';
import veracityReducer from './slices/veracitySlice';
import physicalizationReducer from './slices/physicalizationSlice';

export const store = configureStore({
  reducer: {
    veracity: veracityReducer,
    physicalization: physicalizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['veracity/LOG_EVENT', 'physicalization/TRIGGER'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
