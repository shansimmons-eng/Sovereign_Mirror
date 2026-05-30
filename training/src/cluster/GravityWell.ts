import { ManifoldNode, ManifoldUpdate } from '../types';

export interface FallacyWell {
  fallacyType: string;
  position: [number, number, number];
  magnitude: number;
  persistence: number;
  depth: number;
  parentId: string | null;
}

const G_CONSTANT = 1.0;
const COHERENCE_THRESHOLD = 1.5;
const RADIUS_BASE = 3.0;

export class GravityWell {
  readonly fallacyType: string;
  readonly position: [number, number, number];
  readonly magnitude: number;
  readonly persistence: number;
  readonly depth: number;
  readonly parentId: string | null;

  constructor(
    fallacyType: string,
    position: [number, number, number],
    magnitude: number,
    persistence: number,
    depth = 0,
    parentId: string | null = null
  ) {
    this.fallacyType = fallacyType;
    this.position = position;
    this.magnitude = magnitude;
    this.persistence = persistence;
    this.depth = depth;
    this.parentId = parentId;
  }

  get radius(): number {
    return RADIUS_BASE * (1 - this.magnitude) + 0.5;
  }

  calculateDisplacement(targetPos: [number, number, number]): [number, number, number] {
    const dx = targetPos[0] - this.position[0];
    const dy = targetPos[1] - this.position[1];
    const dz = targetPos[2] - this.position[2];

    const distanceSq = dx * dx + dy * dy + dz * dz;
    const distance = Math.sqrt(distanceSq);

    if (distance < 0.001) {
      return [0, 0, 0];
    }

    const inverseSquare = this.magnitude * G_CONSTANT / distanceSq;

    return [
      -dx * inverseSquare,
      -dy * inverseSquare,
      -dz * inverseSquare,
    ];
  }

  getZOffset(distance: number): number {
    if (distance < 0.001) {
      return -this.magnitude * G_CONSTANT * 10;
    }
    return -(this.magnitude * G_CONSTANT) / (distance * distance);
  }
}

export class GravityWellRegistry {
  private wells: FallacyWell[] = [];
  private maxWells: number;

  constructor(maxWells = 50) {
    this.maxWells = maxWells;
  }

  addWell(well: FallacyWell): void {
    if (this.wells.length >= this.maxWells) {
      this.wells.shift();
    }
    this.wells.push(well);
  }

  removeWell(position: [number, number, number]): void {
    this.wells = this.wells.filter(w => 
      w.position[0] !== position[0] || 
      w.position[1] !== position[1] || 
      w.position[2] !== position[2]
    );
  }

  clear(): void {
    this.wells = [];
  }

  calculateSuperposition(vertexPositions: Float32Array, vertexCount: number): Float32Array {
    const displacements = new Float32Array(vertexCount * 3);

    for (const well of this.wells) {
      const gravityWell = well as GravityWell;
      for (let i = 0; i < vertexCount; i++) {
        const pos: [number, number, number] = [
          vertexPositions[i * 3],
          vertexPositions[i * 3 + 1],
          vertexPositions[i * 3 + 2],
        ];
        const disp = gravityWell.calculateDisplacement(pos);
        displacements[i * 3] += disp[0];
        displacements[i * 3 + 1] += disp[1];
        displacements[i * 3 + 2] += disp[2];
      }
    }

    return displacements;
  }

  calculateVerticalOffset(vertexPositions: Float32Array, vertexCount: number): Float32Array {
    const zOffsets = new Float32Array(vertexCount);

    for (const well of this.wells) {
      const gravityWell = well as GravityWell;
      for (let i = 0; i < vertexCount; i++) {
        const dx = vertexPositions[i * 3] - gravityWell.position[0];
        const dy = vertexPositions[i * 3 + 1] - gravityWell.position[1];
        const dz = vertexPositions[i * 3 + 2] - gravityWell.position[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        zOffsets[i] += gravityWell.getZOffset(distance);
      }
    }

    return zOffsets;
  }

  checkTearing(totalDisplacement: Float32Array, threshold = COHERENCE_THRESHOLD): boolean {
    let maxDisplacement = 0;
    for (let i = 0; i < totalDisplacement.length; i += 3) {
      const mag = Math.sqrt(
        totalDisplacement[i] ** 2 +
        totalDisplacement[i + 1] ** 2 +
        totalDisplacement[i + 2] ** 2
      );
      if (mag > maxDisplacement) {
        maxDisplacement = mag;
      }
    }
    return maxDisplacement > threshold;
  }

  getWellsByDepth(maxDepth: number): FallacyWell[] {
    return this.wells.filter(w => w.depth <= maxDepth);
  }

  getAllWells(): FallacyWell[] {
    return [...this.wells];
  }
}

export class ManifoldDeformer {
  private resolution: number;
  private vertexCount: number;
  private positions: Float32Array | null = null;
  private baseHeights: Float32Array | null = null;
  private displacements: Float32Array | null = null;
  private registry: GravityWellRegistry;

  constructor(meshResolution = 64) {
    this.resolution = meshResolution;
    this.vertexCount = meshResolution * meshResolution;
    this.registry = new GravityWellRegistry();
  }

  initializeMesh(size = 10.0): void {
    this.positions = new Float32Array(this.vertexCount * 3);
    this.baseHeights = new Float32Array(this.vertexCount);
    this.displacements = new Float32Array(this.vertexCount);

    const step = size / (this.resolution - 1);
    const half = size / 2;
    let idx = 0;

    for (let z = 0; z < this.resolution; z++) {
      for (let x = 0; x < this.resolution; x++) {
        this.positions[idx * 3] = x * step - half;
        this.positions[idx * 3 + 1] = 0;
        this.positions[idx * 3 + 2] = z * step - half;
        this.baseHeights[idx] = 0;
        idx++;
      }
    }
  }

  addFallacy(
    fallacyType: string,
    position: [number, number, number],
    magnitude: number,
    persistence: number,
    depth = 0,
    parentId: string | null = null
  ): FallacyWell {
    const well: FallacyWell = {
      fallacyType,
      position,
      magnitude,
      persistence,
      depth,
      parentId,
    };

    this.registry.addWell(well);
    this.recalculateDisplacements();

    return well;
  }

  private recalculateDisplacements(): void {
    if (this.positions === null) return;

    this.displacements = this.registry.calculateVerticalOffset(
      this.positions,
      this.vertexCount
    );
  }

  getVertexData(): Float32Array {
    if (this.positions === null || this.baseHeights === null || this.displacements === null) {
      return new Float32Array(this.vertexCount * 3);
    }

    const result = new Float32Array(this.vertexCount * 3);
    for (let i = 0; i < this.vertexCount; i++) {
      result[i * 3] = this.positions[i * 3];
      result[i * 3 + 1] = this.baseHeights[i] + this.displacements[i];
      result[i * 3 + 2] = this.positions[i * 3 + 2];
    }
    return result;
  }

  getHeatmapValues(): Float32Array {
    if (this.displacements === null) {
      return new Float32Array(this.vertexCount);
    }

    const normalized = new Float32Array(this.vertexCount);
    let maxVal = 0;

    for (let i = 0; i < this.vertexCount; i++) {
      normalized[i] = Math.abs(this.displacements[i]);
      if (normalized[i] > maxVal) {
        maxVal = normalized[i];
      }
    }

    if (maxVal > 0) {
      for (let i = 0; i < this.vertexCount; i++) {
        normalized[i] /= maxVal;
      }
    }

    return normalized;
  }

  checkCollapseImminent(): boolean {
    if (this.displacements === null) return false;

    const stacked = new Float32Array(this.vertexCount * 3);
    for (let i = 0; i < this.vertexCount; i++) {
      stacked[i * 3 + 1] = this.displacements[i];
    }

    return this.registry.checkTearing(stacked);
  }

  getRegistry(): GravityWellRegistry {
    return this.registry;
  }
}

export class SemanticBridge {
  private manifoldDeformer: ManifoldDeformer | null = null;
  private nodes: ManifoldNode[] = [];
  private temporalCounter = 0;

  constructor(manifoldDeformer: ManifoldDeformer | null = null) {
    this.manifoldDeformer = manifoldDeformer;
  }

  setManifoldDeformer(deformer: ManifoldDeformer): void {
    this.manifoldDeformer = deformer;
  }

  processLLMOutput(
    llmJson: Array<{ claim_text?: string; fallacy_type?: string; magnitude?: number; persistence?: number }>,
    V_active: number,
    V_cost = 0,
    bypass_triggered = false
  ): ManifoldUpdate {
    const nodes: ManifoldNode[] = [];
    let rootId: string | null = null;
    const inverion_triggered = V_active <= 0;

    for (let i = 0; i < llmJson.length; i++) {
      const item = llmJson[i];
      if ('error' in item) continue;

      const pos = this.calculatePosition(
        item.fallacy_type || 'unknown',
        this.temporalCounter,
        item.magnitude || 0.5
      );

      const id = this.hashText(item.claim_text || '');
      const node: ManifoldNode = {
        id,
        text: item.claim_text || '',
        fallacyType: item.fallacy_type || null,
        magnitude: item.magnitude || 0.5,
        persistence: item.persistence || 0.5,
        position: pos,
        temporalIndex: this.temporalCounter,
      };

      nodes.push(node);

      if (i === 0 && inverion_triggered && !rootId) {
        rootId = node.id;
      }

      this.temporalCounter++;
    }

    this.nodes.push(...nodes);

    return {
      nodes,
      V_active,
      V_cost,
      bypass_triggered,
      inverion_triggered,
      timestamp: Date.now(),
      root_fallacy_id: rootId,
    };
  }

  private calculatePosition(fallacyType: string, temporalIndex: number, magnitude: number): [number, number, number] {
    const xSpacing = 2.0;
    const x = temporalIndex * xSpacing;
    const y = magnitude * 2.0;
    const z = -magnitude * 3.0;
    return [x, y, z];
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 12);
  }

  applyToManifold(update: ManifoldUpdate): void {
    if (!this.manifoldDeformer) return;

    for (const node of update.nodes) {
      if (node.fallacyType) {
        this.manifoldDeformer.addFallacy(
          node.fallacyType,
          node.position,
          node.magnitude,
          node.persistence,
          0,
          null
        );
      }
    }
  }

  getCategoryForFallacy(fallacyType: string): string {
    const categoryMap: Record<string, string> = {
      'ad_hominem': 'well',
      'strawman': 'well',
      'false_dilemma': 'well',
      'appeal_to_authority': 'peak',
      'sunk_cost': 'chain',
      'slippery_slope': 'chain',
      'begging_the_question': 'loop',
      'circular_reasoning': 'loop',
      'non_sequitur': 'fracture',
    };
    return categoryMap[fallacyType.toLowerCase().replace(' ', '_')] || 'fracture';
  }

  exportTopology(): { nodeCount: number; nodes: ManifoldNode[]; temporalSpan: number } {
    return {
      nodeCount: this.nodes.length,
      nodes: [...this.nodes],
      temporalSpan: this.temporalCounter,
    };
  }

  reset(): void {
    this.nodes = [];
    this.temporalCounter = 0;
    if (this.manifoldDeformer) {
      this.manifoldDeformer.getRegistry().clear();
    }
  }
}