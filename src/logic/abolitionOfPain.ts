export function calculateFriction(paths: number[]): number {
  return paths.reduce((max, friction) => Math.max(max, friction), -Infinity);
}

export function isPainInducing(friction: number): boolean {
  return friction === Infinity;
}

export function selectLowFrictionPath(paths: number[]): number {
  const validPaths = paths.filter(p => p !== Infinity);
  if (validPaths.length === 0) return Infinity;
  return Math.min(...validPaths);
}
