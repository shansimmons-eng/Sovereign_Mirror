import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { getDefaultStore } from 'jotai/vanilla';
import { CivicBaselineRecord } from '../../logic/civicBaseline';

export const civicBaselineAtomFamily = atomFamily((_key: string) =>
  atom<CivicBaselineRecord | null>(null)
);

export const civicBaselineKeysAtom = atom<string[]>([]);

function baselineKey(record: CivicBaselineRecord): string {
  return `${record.regionId}:${record.source}`;
}

/**
 * Imperatively populates the civic baseline atoms from a normalized list.
 * Keyed by `${regionId}:${source}` since a region can have a baseline from
 * more than one source at once.
 */
export function loadCivicBaselines(records: CivicBaselineRecord[]): void {
  const store = getDefaultStore();
  const keys = records.map(baselineKey);

  store.set(civicBaselineKeysAtom, keys);
  records.forEach((record, i) => {
    store.set(civicBaselineAtomFamily(keys[i]), record);
  });
}

/** Resets all civic baseline atoms to empty. Primarily for tests. */
export function clearCivicBaselines(): void {
  const store = getDefaultStore();
  const keys = store.get(civicBaselineKeysAtom);

  for (const key of keys) civicBaselineAtomFamily.remove(key);

  store.set(civicBaselineKeysAtom, []);
}
