/**
 * BrowserSimulation.ts - Zero-cost browser-based simulation engine
 * Converts Python simulate_stream.py to TypeScript for React
 * Runs entirely in browser - no server required
 */

import { STATE_MILESTONES } from './mockLedgerTypes';

export interface SimulationConfig {
  cycleIntervalMs: number;
  onStateChange?: (state: StateMilestone) => void;
  onCycle?: (cycleCount: number, milestone: StateMilestone) => void;
}

export interface StateMilestone {
  id: string;
  profile_type: 'STANDARD_OPERATIONAL' | 'HIGH_NOISE_FISSION' | 'ZERO_ALPHA_STANDBY';
  state: 'ACTIVE' | 'SYNCING' | 'STANDBY';
  timestamp: number;
  alpha: number;
  noise: number;
  temp: number;
  velocity: number;
  resonance: number;
  nodes_count: number;
  particle_count: number;
  fission_stretch: number;
  description: string;
}

export class BrowserSimulationEngine {
  private milestones: StateMilestone[];
  private currentIndex: number = 0;
  private cycleCount: number = 0;
  private startTime: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private config: SimulationConfig;
  private currentState: StateMilestone;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.milestones = STATE_MILESTONES;
    this.currentState = this.milestones[0];
  }

  /**
   * Start the simulation loop
   */
  start(): void {
    if (this.intervalId) return; // Already running

    console.log(
      '%c✓ Browser Simulation Engine Started',
      'color: #00ff00; font-weight: bold',
      `\nCycle Interval: ${this.config.cycleIntervalMs}ms`,
      `\nMilestones: ${this.milestones.length}`,
      `\nTotal Cycle Time: ${(this.milestones.length * this.config.cycleIntervalMs) / 1000}s`
    );

    this.intervalId = setInterval(() => this.tick(), this.config.cycleIntervalMs);
  }

  /**
   * Stop the simulation loop
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('%c✗ Simulation Stopped', 'color: #ff0000', `Cycles: ${this.cycleCount}`);
    }
  }

  /**
   * Single simulation tick - advance to next milestone
   */
  private tick(): void {
    this.advance();
    this.config.onCycle?.(this.cycleCount, this.currentState);
  }

  /**
   * Advance to next milestone
   */
  advance(): void {
    this.currentIndex = (this.currentIndex + 1) % this.milestones.length;
    this.cycleCount++;
    this.currentState = this.milestones[this.currentIndex];
    this.currentState.timestamp = Date.now();
    this.config.onStateChange?.(this.currentState);
  }

  /**
   * Get current milestone
   */
  getCurrentState(): StateMilestone {
    return { ...this.currentState };
  }

  /**
   * Get telemetry payload for CryptoWrapper
   */
  getTelemetryPayload() {
    return {
      alpha: this.currentState.alpha,
      inverion_alpha: this.currentState.alpha,
      noise: this.currentState.noise,
      boltzmann_noise: this.currentState.noise,
      temp: this.currentState.temp,
      boltzmann_temperature: this.currentState.temp,
      velocity: this.currentState.velocity,
      state: this.currentState.state
    };
  }

  /**
   * Get metadata for state display
   */
  getMetadata() {
    return {
      simulation_timestamp: Date.now(),
      cycle_count: this.cycleCount,
      current_milestone_id: this.currentState.id,
      profile_type: this.currentState.profile_type,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Get full state payload (matches current_state.json structure)
   */
  getFullStatePayload() {
    return {
      metadata: this.getMetadata(),
      telemetry: this.getTelemetryPayload(),
      system: {
        resonance: this.currentState.resonance,
        nodes_count: this.currentState.nodes_count,
        particle_count: Math.min(this.currentState.particle_count, 5000),
        fission_stretch: this.currentState.fission_stretch
      },
      description: this.currentState.description
    };
  }

  /**
   * Check if simulation is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get current cycle count
   */
  getCycleCount(): number {
    return this.cycleCount;
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check current profile type
   */
  getProfileType(): string {
    return this.currentState.profile_type;
  }

  /**
   * Check if in fission mode
   */
  isFissionMode(): boolean {
    return this.currentState.profile_type === 'HIGH_NOISE_FISSION';
  }

  /**
   * Check if in standby mode
   */
  isStandbyMode(): boolean {
    return this.currentState.profile_type === 'ZERO_ALPHA_STANDBY';
  }

  /**
   * Get particle count (enforced 5000 budget)
   */
  getParticleCount(): number {
    return Math.min(this.currentState.particle_count, 5000);
  }

  /**
   * Get fission stretch factor
   */
  getFissionStretch(): number {
    return this.currentState.fission_stretch;
  }

  /**
   * Reset to first milestone
   */
  reset(): void {
    this.currentIndex = 0;
    this.cycleCount = 0;
    this.startTime = Date.now();
    this.currentState = this.milestones[0];
    console.log('%c↺ Simulation Reset', 'color: #ffff00');
  }

  /**
   * Jump to specific milestone by ID
   */
  jumpToMilestone(id: string): boolean {
    const index = this.milestones.findIndex(m => m.id === id);
    if (index !== -1) {
      this.currentIndex = index;
      this.currentState = this.milestones[index];
      this.currentState.timestamp = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get all milestones
   */
  getAllMilestones(): StateMilestone[] {
    return [...this.milestones];
  }

  /**
   * Get milestone by index
   */
  getMilestoneByIndex(index: number): StateMilestone {
    return this.milestones[index % this.milestones.length];
  }
}

const DEFAULT_CYCLE_INTERVAL = 15000;

let browserSimulation: BrowserSimulationEngine | null = null;

export function getBrowserSimulation(): BrowserSimulationEngine {
  if (!browserSimulation) {
    browserSimulation = new BrowserSimulationEngine({
      cycleIntervalMs: DEFAULT_CYCLE_INTERVAL,
      onStateChange: (state) => {
        console.log(
          `[${new Date().toLocaleTimeString()}] Cycle #${browserSimulation?.getCycleCount()}`,
          `| ${state.profile_type.padEnd(20)}`,
          `| ${state.state.padEnd(8)}`,
          `| α=${state.alpha.toFixed(3)} n=${state.noise.toFixed(3)}`,
          `| particles=${Math.min(state.particle_count, 5000)}`
        );
      }
    });
  }
  return browserSimulation;
}

if (typeof window !== 'undefined') {
  setTimeout(() => getBrowserSimulation().start(), 100);
}