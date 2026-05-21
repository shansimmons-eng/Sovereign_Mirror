#!/usr/bin/env python3
"""
simulate_stream.py - Zero-cost local simulation engine
Cycles through mock_ledger.json profiles on a 15-second loop
Outputs current state to current_state.json for frontend consumption
"""

import json
import time
import os
from pathlib import Path
from datetime import datetime

# Configuration
CYCLE_INTERVAL_SECONDS = 15
SCRIPT_DIR = Path(__file__).parent
MOCK_LEDGER_PATH = SCRIPT_DIR / "mock_ledger.json"
OUTPUT_STATE_PATH = SCRIPT_DIR / "current_state.json"


class SimulationEngine:
    def __init__(self, ledger_path: Path, output_path: Path):
        self.ledger_path = ledger_path
        self.output_path = output_path
        self.milestones = []
        self.current_index = 0
        self.start_time = time.time()
        self.cycle_count = 0

        self._load_ledger()

    def _load_ledger(self):
        """Load mock ledger configuration"""
        try:
            with open(self.ledger_path, "r") as f:
                data = json.load(f)
                self.milestones = data.get("state_milestones", [])
                print(
                    f"✓ Loaded {len(self.milestones)} milestones from {self.ledger_path.name}"
                )
        except FileNotFoundError:
            print(f"✗ ERROR: {self.ledger_path} not found")
            exit(1)
        except json.JSONDecodeError as e:
            print(f"✗ ERROR: Invalid JSON in {self.ledger_path}: {e}")
            exit(1)

    def _get_current_milestone(self):
        """Get current milestone based on cycle index"""
        if not self.milestones:
            return None
        return self.milestones[self.current_index]

    def _advance_cycle(self):
        """Move to next milestone in sequence"""
        self.current_index = (self.current_index + 1) % len(self.milestones)
        self.cycle_count += 1

    def _build_state_payload(self, milestone):
        """Convert milestone to frontend-ready payload"""
        return {
            "metadata": {
                "simulation_timestamp": int(time.time() * 1000),
                "cycle_count": self.cycle_count,
                "current_milestone_id": milestone.get("id"),
                "profile_type": milestone.get("profile_type"),
                "uptime_seconds": int(time.time() - self.start_time),
            },
            "telemetry": {
                "alpha": milestone.get("alpha", 0.75),
                "inverion_alpha": milestone.get("alpha", 0.75),
                "noise": milestone.get("noise", 0.15),
                "boltzmann_noise": milestone.get("noise", 0.15),
                "temp": milestone.get("temp", 0.45),
                "boltzmann_temperature": milestone.get("temp", 0.45),
                "velocity": milestone.get("velocity", 0.25),
                "state": milestone.get("state", "ACTIVE"),
            },
            "system": {
                "resonance": milestone.get("resonance", 0.5),
                "nodes_count": milestone.get("nodes_count", 0),
                "particle_count": milestone.get("particle_count", 0),
                "fission_stretch": milestone.get("fission_stretch", 0.0),
            },
            "description": milestone.get("description", "No description"),
        }

    def _write_state(self, payload):
        """Write current state to output file"""
        try:
            with open(self.output_path, "w") as f:
                json.dump(payload, f, indent=2)
        except IOError as e:
            print(f"✗ ERROR writing state file: {e}")

    def _print_status(self, milestone):
        """Print current cycle status"""
        profile_type = milestone.get("profile_type", "UNKNOWN")
        state = milestone.get("state", "UNKNOWN")
        alpha = milestone.get("alpha", 0)
        noise = milestone.get("noise", 0)
        particle_count = milestone.get("particle_count", 0)

        timestamp = datetime.now().strftime("%H:%M:%S")
        print(
            f"[{timestamp}] Cycle #{self.cycle_count:03d} | {profile_type:20s} | "
            f"{state:8s} | α={alpha:.3f} n={noise:.3f} | "
            f"particles={particle_count:4d}"
        )

    def run(self):
        """Main simulation loop"""
        print("\n" + "=" * 80)
        print("SOVEREIGN MIRROR - Zero-Cost Local Simulation Engine")
        print("=" * 80)
        print(f"Cycle Interval: {CYCLE_INTERVAL_SECONDS}s")
        print(f"Output File: {self.output_path}")
        print(f"Milestones: {len(self.milestones)}")
        print("=" * 80 + "\n")

        try:
            while True:
                milestone = self._get_current_milestone()
                if milestone is None:
                    print("✗ No milestones available")
                    break

                # Build and write state payload
                payload = self._build_state_payload(milestone)
                self._write_state(payload)

                # Print status
                self._print_status(milestone)

                # Advance to next milestone
                self._advance_cycle()

                # Wait for next cycle
                time.sleep(CYCLE_INTERVAL_SECONDS)

        except KeyboardInterrupt:
            print("\n\n" + "=" * 80)
            print(f"Simulation stopped after {self.cycle_count} cycles")
            print(f"Total uptime: {int(time.time() - self.start_time)}s")
            print("=" * 80)


def main():
    engine = SimulationEngine(MOCK_LEDGER_PATH, OUTPUT_STATE_PATH)
    engine.run()


if __name__ == "__main__":
    main()
