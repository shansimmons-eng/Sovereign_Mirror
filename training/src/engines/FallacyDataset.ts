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

const DATASET_URL = '/classify/fallacy-data';

let cachedDataset: FallacyDataset | null = null;

export async function loadFallacyDataset(): Promise<FallacyDataset> {
  if (cachedDataset) return cachedDataset;
  
  try {
    const response = await fetch(DATASET_URL);
    if (response.ok) {
      cachedDataset = await response.json();
      return cachedDataset!;
    }
  } catch {
    // Fallback to embedded data
  }
  
  return { entries: [], by_type: {}, total: 0, sources: [] };
}

export function findMatchingFallacy(input: string, dataset: FallacyDataset): FallacyEntry | null {
  const inputLower = input.toLowerCase();
  
  for (const entry of dataset.entries) {
    const entryWords = entry.text.toLowerCase().split(/\s+/);
    const inputWords = inputLower.split(/\s+/);
    
    const matchCount = entryWords.filter(w => inputWords.includes(w)).length;
    const matchRatio = matchCount / entryWords.length;
    
    if (matchRatio > 0.6) {
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