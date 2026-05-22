/**
 * stateFileLoader - Bridge between browser simulation engine and React frontend
 * Uses BrowserSimulation.ts for zero-cost browser-based state cycling
 * No server required - runs entirely client-side
 */

import { getBrowserSimulation, BrowserSimulationEngine, StateMilestone } from './BrowserSimulation';
import { TelemetryPayload } from './CryptoWrapper';

export interface SimulationMetadata {
  simulation_timestamp: number;
  cycle_count: number;
  current_milestone_id: string;
  profile_type: string;
  uptime_seconds: number;
}

export interface SystemMetrics {
  resonance: number;
  nodes_count: number;
  particle_count: number;
  fission_stretch: number;
}

export interface StatePayload {
  metadata: SimulationMetadata;
  telemetry: TelemetryPayload;
  system: SystemMetrics;
  description: string;
}

class StateFileLoader {
  private simulation: BrowserSimulationEngine;
  private cachedState: StatePayload | null = null;
  private lastLoadTime: number = 0;
  private refreshInterval: number = 500; // Poll every 500ms for smooth updates

  constructor() {
    this.simulation = getBrowserSimulation();
  }

  /**
   * Get current simulation state from browser engine
   * Polls simulation engine for fresh state
   */
  getCurrentState(): StatePayload {
    const now = Date.now();
    
    // Return cached state if within refresh interval
    if (this.cachedState && (now - this.lastLoadTime) < this.refreshInterval) {
      return this.cachedState;
    }

    // Get fresh state from browser simulation engine
    this.cachedState = this.simulation.getFullStatePayload();
    this.lastLoadTime = now;

    return this.cachedState;
  }

  /**
   * Get telemetry payload ready for CryptoWrapper validation
   */
  getTelemetryPayload(): TelemetryPayload {
    return this.simulation.getTelemetryPayload();
  }

  /**
   * Get current profile type
   */
  getProfileType(): string {
    return this.simulation.getProfileType();
  }

  /**
   * Get particle count for canvas budget management
   */
  getParticleCount(): number {
    return this.simulation.getParticleCount();
  }

  /**
   * Check if in fission mode (high noise state)
   */
  isFissionMode(): boolean {
    return this.simulation.isFissionMode();
  }

  /**
   * Check if in standby mode (zero alpha state)
   */
  isStandbyMode(): boolean {
    return this.simulation.isStandbyMode();
  }

  /**
   * Get fission stretch factor for dumbbell morphology
   */
  getFissionStretch(): number {
    return this.simulation.getFissionStretch();
  }

  /**
   * Set refresh interval (ms)
   */
  setRefreshInterval(ms: number): void {
    this.refreshInterval = Math.max(100, ms);
  }

  /**
   * Force immediate refresh on next read
   */
  invalidateCache(): void {
    this.lastLoadTime = 0;
  }

  /**
   * Get cycle count for debugging
   */
  getCycleCount(): number {
    return this.simulation.getCycleCount();
  }

  /**
   * Get simulation uptime
   */
  getUptime(): number {
    return this.simulation.getUptime();
  }

  /**
   * Start the simulation engine
   */
  start(): void {
    this.simulation.start();
  }

  /**
   * Stop the simulation engine
   */
  stop(): void {
    this.simulation.stop();
  }

  /**
   * Reset simulation to initial state
   */
  reset(): void {
    this.simulation.reset();
  }

  /**
   * Advance to next milestone manually
   */
  advance(): void {
    this.simulation.advance();
  }

  /**
   * Jump to specific milestone
   */
  jumpToMilestone(id: string): boolean {
    return this.simulation.jumpToMilestone(id);
  }

  /**
   * Get underlying simulation engine for advanced control
   */
  getEngine(): BrowserSimulationEngine {
    return this.simulation;
  }
}

// Singleton instance for global access
export const STATE_LOADER = new StateFileLoader();

/**
 * React hook for state updates
 * Use this in components to trigger re-renders when state changes
 */
export function useSimulationState(refreshMs: number = 500) {
  const [state, setState] = React.useState<StatePayload>(() => STATE_LOADER.getCurrentState());

  React.useEffect(() => {
    const interval = setInterval(() => {
      STATE_LOADER.invalidateCache();
      setState(STATE_LOADER.getCurrentState());
    }, refreshMs);

    return () => clearInterval(interval);
  }, [refreshMs]);

  return state;
}

// Import React for the hook
import * as React from 'react';

/**
 * Hook to get raw milestone for advanced use cases
 */
export function useCurrentMilestone(): StateMilestone {
  const [milestone, setMilestone] = React.useState<StateMilestone>(() => 
    STATE_LOADER.getEngine().getCurrentState()
  );

  React.useEffect(() => {
    const engine = STATE_LOADER.getEngine();
    const interval = setInterval(() => {
      setMilestone(engine.getCurrentState());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return milestone;
}

/**
 * Hook to check if in specific profile mode
 */
export function useProfileCheck() {
  const [isFission, setIsFission] = React.useState(false);
  const [isStandby, setIsStandby] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsFission(STATE_LOADER.isFissionMode());
      setIsStandby(STATE_LOADER.isStandbyMode());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return { isFission, isStandby };
}

/**
 * Hook for animation frame sync
 * Use this in useFrame() for Three.js components
 */
export function useSimulationUniforms() {
  const [uniforms, setUniforms] = React.useState(() => STATE_LOADER.getTelemetryPayload());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setUniforms(STATE_LOADER.getTelemetryPayload());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return uniforms;
}