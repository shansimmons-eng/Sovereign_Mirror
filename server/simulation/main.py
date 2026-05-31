#!/usr/bin/env python3
"""
main.py - Entry point for simulation backend

Usage:
    python main.py                      # Run with defaults
    python main.py --api-only          # Run API only (no simulation)
    python main.py --headless          # Run simulation without API
    python main.py --port 5002         # Custom port
"""

import argparse
import sys
import threading
import time

from real_time_bridge import initialize_bridge, SimulationBridge
from model import SimulationConfig
from network import NetworkTopology


def main():
    parser = argparse.ArgumentParser(description="Governance Simulation Backend")
    parser.add_argument(
        "--api-only", action="store_true", help="Run API only, no simulation"
    )
    parser.add_argument(
        "--headless", action="store_true", help="Run simulation only, no API"
    )
    parser.add_argument(
        "--port", type=int, default=5001, help="API port (default: 5001)"
    )
    parser.add_argument(
        "--agents", type=int, default=10, help="Initial number of agents (default: 10)"
    )
    parser.add_argument(
        "--tick-ms",
        type=int,
        default=1000,
        help="Simulation tick rate in ms (default: 1000)",
    )
    parser.add_argument(
        "--topology",
        choices=["sparse", "full", "hub", "small_world"],
        default="sparse",
        help="Network topology",
    )
    parser.add_argument(
        "--no-evolution", action="store_true", help="Disable evolutionary dynamics"
    )

    args = parser.parse_args()

    # Map topology string to enum
    topology_map = {
        "sparse": NetworkTopology.SPARSE,
        "full": NetworkTopology.FULLY_CONNECTED,
        "hub": NetworkTopology.HUB_AND_SPOKE,
        "small_world": NetworkTopology.SMALL_WORLD,
    }

    # Create config
    config = SimulationConfig(
        n_initial_agents=args.agents,
        network_topology=topology_map[args.topology],
        simulation_tick_ms=args.tick_ms,
        enable_evolution=not args.no_evolution,
    )

    # Initialize bridge
    bridge = initialize_bridge(config)

    # Start components
    if args.headless:
        # Simulation only
        print("[SIM] Starting simulation (headless mode)...")
        bridge.start(background=False)
    elif args.api_only:
        # API only
        print(f"[API] Starting API server on port {args.port}...")
        from api import create_app

        app = create_app(bridge)
        app.run(host="0.0.0.0", port=args.port, debug=False, threaded=True)
    else:
        # Both simulation and API
        print("[SIM] Starting simulation + API server...")

        # Start simulation in background
        bridge.start(background=True)

        # Start API in main thread
        from api import create_app

        app = create_app(bridge)
        app.run(host="0.0.0.0", port=args.port, debug=False, threaded=True)


if __name__ == "__main__":
    main()
