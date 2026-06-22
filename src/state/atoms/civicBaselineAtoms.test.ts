import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultStore } from 'jotai/vanilla';
import {
  civicBaselineAtomFamily,
  civicBaselineKeysAtom,
  loadCivicBaselines,
  clearCivicBaselines,
} from './civicBaselineAtoms';
import { normalizeCivicBaselineDataset } from '../../logic/civicBaseline';
import civicBaselineSample from './fixtures/civicBaselineSample.json';

describe('civicBaselineAtoms', () => {
  beforeEach(() => {
    clearCivicBaselines();
  });

  it('populates baseline atoms keyed by regionId:source', () => {
    const records = normalizeCivicBaselineDataset(civicBaselineSample);
    loadCivicBaselines(records);

    const store = getDefaultStore();
    const keys = store.get(civicBaselineKeysAtom);
    expect(keys).toEqual(['us-tx:world_bank', 'us-tx:data_gov']);

    const worldBank = store.get(civicBaselineAtomFamily('us-tx:world_bank'));
    expect(worldBank?.indicatorId).toBe('VA.EST');

    const dataGov = store.get(civicBaselineAtomFamily('us-tx:data_gov'));
    expect(dataGov?.indicatorId).toBe('voter-turnout-2024');
  });

  it('clearCivicBaselines resets all baseline atoms to empty', () => {
    const records = normalizeCivicBaselineDataset(civicBaselineSample);
    loadCivicBaselines(records);
    clearCivicBaselines();

    const store = getDefaultStore();
    expect(store.get(civicBaselineKeysAtom)).toEqual([]);
  });
});
