/**
 * Calculate maximum friction from a set of paths.
 * Returns 0 for empty array, filters out NaN values.
 */
export function calculateFriction(paths: number[]): number {
  if (paths.length === 0) return 0;
  // Filter out NaN values which would corrupt the result
  const validPaths = paths.filter(isFinite);
  if (validPaths.length === 0) return Infinity; // All paths blocked
  return Math.max(...validPaths);
}

/**
 * Check if friction level indicates pain (Infinity or NaN).
 */
export function isPainInducing(friction: number): boolean {
  return !isFinite(friction) || friction === Infinity;
}

/**
 * Select the lowest friction path, excluding blocked (Infinity) paths.
 * Returns Infinity if no valid paths exist.
 */
export function selectLowFrictionPath(paths: number[]): number {
  // Filter out Infinity AND NaN values
  const validPaths = paths.filter(p => isFinite(p) && p !== Infinity);
  if (validPaths.length === 0) return Infinity;
  return Math.min(...validPaths);
}
