import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultStore } from 'jotai/vanilla';
import {
  civicOrgAtomFamily,
  civicPersonAtomFamily,
  civicVoteEventAtomFamily,
  civicOrgIdsAtom,
  civicPersonIdsAtom,
  civicVoteEventIdsAtom,
  loadCivicDataset,
  clearCivicDataset,
} from './civicAtoms';
import { normalizeCivicDataset } from '../../logic/civicSchema';
import civicSample from './fixtures/civicSample.json';

describe('civicAtoms', () => {
  beforeEach(() => {
    clearCivicDataset();
  });

  it('populates id-list atoms and per-entity atoms from a normalized dataset', () => {
    const dataset = normalizeCivicDataset(civicSample);
    loadCivicDataset(dataset);

    const store = getDefaultStore();
    const orgIds = store.get(civicOrgIdsAtom);
    const personIds = store.get(civicPersonIdsAtom);
    const voteEventIds = store.get(civicVoteEventIdsAtom);

    expect(orgIds).toHaveLength(1);
    expect(personIds).toHaveLength(2);
    expect(voteEventIds).toHaveLength(1);

    const org = store.get(civicOrgAtomFamily(orgIds[0]));
    expect(org?.name).toBe('Austin City Council');

    const person = store.get(civicPersonAtomFamily(personIds[0]));
    expect(person?.name).toBe('Jane Rivera');

    const voteEvent = store.get(civicVoteEventAtomFamily(voteEventIds[0]));
    expect(voteEvent?.result).toBe('pass');
  });

  it('clearCivicDataset resets all civic atoms to empty', () => {
    const dataset = normalizeCivicDataset(civicSample);
    loadCivicDataset(dataset);
    clearCivicDataset();

    const store = getDefaultStore();
    expect(store.get(civicOrgIdsAtom)).toEqual([]);
    expect(store.get(civicPersonIdsAtom)).toEqual([]);
    expect(store.get(civicVoteEventIdsAtom)).toEqual([]);
  });
});
