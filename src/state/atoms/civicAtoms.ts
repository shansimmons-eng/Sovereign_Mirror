import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getDefaultStore } from 'jotai/vanilla';
import { CivicDataset, CivicOrganization, CivicPerson, CivicVoteEvent } from '../../logic/civicSchema';

export const civicOrgAtomFamily = atomFamily((_id: string) =>
  atom<CivicOrganization | null>(null)
);

export const civicPersonAtomFamily = atomFamily((_id: string) =>
  atom<CivicPerson | null>(null)
);

export const civicVoteEventAtomFamily = atomFamily((_id: string) =>
  atom<CivicVoteEvent | null>(null)
);

export const civicOrgIdsAtom = atom<string[]>([]);
export const civicPersonIdsAtom = atom<string[]>([]);
export const civicVoteEventIdsAtom = atom<string[]>([]);

/**
 * Imperatively populates the civic atoms from a normalized dataset. Uses
 * Jotai's default store since this app has no <Provider> and ingestion
 * happens outside the React tree (e.g. on app init).
 */
export function loadCivicDataset(dataset: CivicDataset): void {
  const store = getDefaultStore();

  store.set(civicOrgIdsAtom, dataset.organizations.map((org) => org.id));
  for (const org of dataset.organizations) {
    store.set(civicOrgAtomFamily(org.id), org);
  }

  store.set(civicPersonIdsAtom, dataset.people.map((person) => person.id));
  for (const person of dataset.people) {
    store.set(civicPersonAtomFamily(person.id), person);
  }

  store.set(civicVoteEventIdsAtom, dataset.voteEvents.map((voteEvent) => voteEvent.id));
  for (const voteEvent of dataset.voteEvents) {
    store.set(civicVoteEventAtomFamily(voteEvent.id), voteEvent);
  }
}

/** Resets all civic atoms to empty. Primarily for tests. */
export function clearCivicDataset(): void {
  const store = getDefaultStore();
  const orgIds = store.get(civicOrgIdsAtom);
  const personIds = store.get(civicPersonIdsAtom);
  const voteEventIds = store.get(civicVoteEventIdsAtom);

  for (const id of orgIds) civicOrgAtomFamily.remove(id);
  for (const id of personIds) civicPersonAtomFamily.remove(id);
  for (const id of voteEventIds) civicVoteEventAtomFamily.remove(id);

  store.set(civicOrgIdsAtom, []);
  store.set(civicPersonIdsAtom, []);
  store.set(civicVoteEventIdsAtom, []);
}
