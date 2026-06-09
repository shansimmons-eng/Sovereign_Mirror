/**
 * mockLedgerLoader - Zero-cost local simulation state driver
 * Cycles through mock_ledger.json milestones without external network calls
 */

import mockLedger from './mock_ledger.json';
import type { TelemetryPayload } from './CryptoWrapper';

export type SimulationState = 'ACTIVE' | 'SYNCING' | 'STANDBY';

export interface MockMilestone {
  id: string;
  state: SimulationState;
  timestamp: number;
  alpha: number;
  noise: number;
  temp: number;
  velocity: number;
  resonance: number;
  nodes_count: number;
  description: string;
}

export class MockLedgerLoader {
  private currentIndex: number = 0;
  private milestones: MockMilestone[];
  private lastUpdateTime: number = Date.now();
  private updateInterval: number = 5000; // 5 seconds per milestone

  constructor() {
    this.milestones = mockLedger.state_milestones as MockMilestone[];
  }

  /**
   * Get current milestone based on elapsed time
   */
  getCurrentMilestone(): MockMilestone {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;

    if (elapsed >= this.updateInterval) {
      this.lastUpdateTime = now;
      this.currentIndex = (this.currentIndex + 1) % this.milestones.length;
    }

    return this.milestones[this.currentIndex];
  }

  /**
   * Convert milestone to telemetry payload format
   */
  getMilestoneAsPayload(): TelemetryPayload {
    const milestone = this.getCurrentMilestone();
    return {
      alpha: milestone.alpha,
      noise: milestone.noise,
      temp: milestone.temp,
      velocity: milestone.velocity,
      state: milestone.state
    };
  }

  /**
   * Get current simulation state
   */
  getCurrentState(): SimulationState {
    return this.getCurrentMilestone().state;
  }

  /**
   * Manually advance to next milestone
   */
  advanceMilestone(): MockMilestone {
    this.currentIndex = (this.currentIndex + 1) % this.milestones.length;
    this.lastUpdateTime = Date.now();
    return this.milestones[this.currentIndex];
  }

  /**
   * Set update interval (ms)
   */
  setUpdateInterval(ms: number): void {
    this.updateInterval = Math.max(1000, ms); // Min 1 second
  }

  /**
   * Get all milestones
   */
  getAllMilestones(): MockMilestone[] {
    return [...this.milestones];
  }

  /**
   * Get mock ledger configuration
   */
  getConfig() {
    return mockLedger.config;
  }

  /**
   * Get audit trail
   */
  getAuditTrail() {
    return mockLedger.audit_trail;
  }

  /**
   * Reset to first milestone
   */
  reset(): void {
    this.currentIndex = 0;
    this.lastUpdateTime = Date.now();
  }
}

// Singleton instance for global access
export const MOCK_LEDGER = new MockLedgerLoader();
