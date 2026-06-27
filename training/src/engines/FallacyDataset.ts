export interface FallacyEntry {
  text: string;
  fallacy_type: string;
  source: string;
  original_label: string;
  explanation: string;
  response: string;
}

export interface FallacyDataset {
  entries: FallacyEntry[];
  by_type: Record<string, FallacyEntry[]>;
  total: number;
  sources: string[];
}

const DATASET_URL = () => `${(typeof window !== 'undefined' && window.__kylosApiBase) ? window.__kylosApiBase : ''}/classify/fallacy-data`;

let cachedDataset: FallacyDataset | null = null;
const entryWordSets = new Map<FallacyEntry, Set<string>>();

export async function loadFallacyDataset(): Promise<FallacyDataset> {
  if (cachedDataset) return cachedDataset;
  
  try {
    const response = await fetch(DATASET_URL());
    if (response.ok) {
      cachedDataset = await response.json();
      for (const entry of cachedDataset!.entries) {
        entryWordSets.set(entry, new Set(entry.text.toLowerCase().split(/\s+/)));
      }
      return cachedDataset!;
    }
  } catch {
    // Fallback to embedded data
  }
  
  return { entries: [], by_type: {}, total: 0, sources: [] };
}

export function findMatchingFallacy(input: string, dataset: FallacyDataset): FallacyEntry | null {
  const inputWords = new Set(input.toLowerCase().split(/\s+/));
  
  for (const entry of dataset.entries) {
    const entryWords = entryWordSets.get(entry);
    if (!entryWords || entryWords.size === 0) continue;
    
    let matchCount = 0;
    for (const word of entryWords) {
      if (inputWords.has(word)) matchCount++;
    }
    
    if (matchCount / entryWords.size > 0.6) {
      return entry;
    }
  }
  
  return null;
}

export function getRandomFallacy(fallacyType?: string): FallacyEntry | null {
  if (!cachedDataset) return null;
  
  const entries = fallacyType 
    ? cachedDataset.by_type[fallacyType] || cachedDataset.entries
    : cachedDataset.entries;
  
  if (entries.length === 0) return null;
  
  return entries[Math.floor(Math.random() * entries.length)];
}