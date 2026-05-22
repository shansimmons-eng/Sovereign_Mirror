/**
 * mockLedgerTypes.ts - Type definitions for mock ledger milestones
 * Mirrors the structure from mock_ledger.json
 */

export type SimulationState = 'ACTIVE' | 'SYNCING' | 'STANDBY';
export type ProfileType = 'STANDARD_OPERATIONAL' | 'HIGH_NOISE_FISSION' | 'ZERO_ALPHA_STANDBY';

export interface StateMilestone {
  id: string;
  profile_type: ProfileType;
  state: SimulationState;
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

/**
 * Mock ledger state milestones - 8 profiles cycling every 15 seconds
 * Total cycle time: 120 seconds (2 minutes)
 */
export const STATE_MILESTONES: StateMilestone[] = [
  {
    id: 'profile_standard_001',
    profile_type: 'STANDARD_OPERATIONAL',
    state: 'ACTIVE',
    timestamp: 1716163200000,
    alpha: 0.82,
    noise: 0.12,
    temp: 0.55,
    velocity: 0.38,
    resonance: 0.71,
    nodes_count: 47,
    particle_count: 4700,
    fission_stretch: 0.0,
    description: 'Standard operational state - balanced veracity flow'
  },
  {
    id: 'profile_standard_002',
    profile_type: 'STANDARD_OPERATIONAL',
    state: 'SYNCING',
    timestamp: 1716166800000,
    alpha: 0.68,
    noise: 0.18,
    temp: 0.48,
    velocity: 0.25,
    resonance: 0.58,
    nodes_count: 52,
    particle_count: 5000,
    fission_stretch: 0.0,
    description: 'Standard sync phase - consensus building with moderate noise'
  },
  {
    id: 'profile_fission_001',
    profile_type: 'HIGH_NOISE_FISSION',
    state: 'ACTIVE',
    timestamp: 1716170400000,
    alpha: 0.45,
    noise: 0.88,
    temp: 0.92,
    velocity: 0.67,
    resonance: 0.41,
    nodes_count: 63,
    particle_count: 5000,
    fission_stretch: 1.42,
    description: 'Dumbbell fission mode - extreme noise creates particle separation'
  },
  {
    id: 'profile_fission_002',
    profile_type: 'HIGH_NOISE_FISSION',
    state: 'SYNCING',
    timestamp: 1716174000000,
    alpha: 0.38,
    noise: 0.95,
    temp: 0.89,
    velocity: 0.72,
    resonance: 0.33,
    nodes_count: 58,
    particle_count: 5000,
    fission_stretch: 1.48,
    description: 'Peak fission state - maximum toroidal deformation'
  },
  {
    id: 'profile_standby_001',
    profile_type: 'ZERO_ALPHA_STANDBY',
    state: 'STANDBY',
    timestamp: 1716177600000,
    alpha: 0.001,
    noise: 0.05,
    temp: 0.08,
    velocity: 0.02,
    resonance: 0.12,
    nodes_count: 12,
    particle_count: 1200,
    fission_stretch: 0.0,
    description: 'Zero-alpha dormant state - minimal particle activity'
  },
  {
    id: 'profile_standby_002',
    profile_type: 'ZERO_ALPHA_STANDBY',
    state: 'STANDBY',
    timestamp: 1716181200000,
    alpha: 0.001,
    noise: 0.03,
    temp: 0.05,
    velocity: 0.01,
    resonance: 0.08,
    nodes_count: 8,
    particle_count: 800,
    fission_stretch: 0.0,
    description: 'Deep standby - network in hibernation mode'
  },
  {
    id: 'profile_standard_003',
    profile_type: 'STANDARD_OPERATIONAL',
    state: 'ACTIVE',
    timestamp: 1716184800000,
    alpha: 0.91,
    noise: 0.15,
    temp: 0.62,
    velocity: 0.44,
    resonance: 0.85,
    nodes_count: 78,
    particle_count: 5000,
    fission_stretch: 0.0,
    description: 'Peak operational state - maximum veracity throughput'
  },
  {
    id: 'profile_fission_003',
    profile_type: 'HIGH_NOISE_FISSION',
    state: 'ACTIVE',
    timestamp: 1716188400000,
    alpha: 0.32,
    noise: 0.91,
    temp: 0.85,
    velocity: 0.68,
    resonance: 0.28,
    nodes_count: 55,
    particle_count: 5000,
    fission_stretch: 1.45,
    description: 'Sustained fission - dumbbell morphology stabilized'
  }
];

export const SIMULATION_CONFIG = {
  cycleIntervalMs: 15000,
  maxParticles: 5000,
  goldenRatio: 0.618,
  thresholdEntropy: 0.07,
  tickRateMs: 400,
  confirmationCycles: 7,
  atrophyLimitMs: 86400000
};