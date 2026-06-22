#!/usr/bin/env python3
"""
api.py - REST API for simulation control and state

Flask API endpoints for:
- GET /api/simulation/state - Current simulation state
- POST /api/simulation/start - Start simulation
- POST /api/simulation/stop - Stop simulation
- POST /api/simulation/reset - Reset simulation
- GET /api/simulation/metrics - Latest metrics
- GET /api/simulation/time-series - Historical data
- GET /api/simulation/agents - Agent states
"""

from flask import Flask, jsonify, request
from functools import wraps
from typing import Optional
import threading
import time

from real_time_bridge import get_bridge, initialize_bridge, SimulationBridge
from model import SimulationConfig
from network import NetworkTopology


def create_app(bridge: Optional[SimulationBridge] = None) -> Flask:
    """Create and configure Flask app"""
    app = Flask(__name__)

    @app.after_request
    def add_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    _bridge = bridge or get_bridge()

    def require_sim(f):
        """Decorator to ensure simulation is available"""

        @wraps(f)
        def decorated(*args, **kwargs):
            if _bridge is None:
                return jsonify({"error": "Simulation bridge not initialized"}), 500
            return f(*args, **kwargs)

        return decorated

    @app.route("/api/simulation/state", methods=["GET"])
    @require_sim
    def get_state():
        state = _bridge.get_state()
        return jsonify(state)

    @app.route("/api/simulation/metrics", methods=["GET"])
    @require_sim
    def get_metrics():
        metrics = _bridge.get_metrics()
        return jsonify(
            {
                "timestep": metrics.timestep,
                "collective_v_active": metrics.collective_v_active,
                "avg_veracity": metrics.avg_veracity,
                "cooperation_rate": metrics.cooperation_rate,
                "defection_rate": metrics.defection_rate,
                "cascade_risk": metrics.cascade_risk,
                "pgate_success_rate": metrics.pgate_success_rate,
                "agent_count": metrics.agent_count,
                "energy_average": metrics.energy_average,
                "timestamp": metrics.timestamp,
            }
        )

    @app.route("/api/simulation/time-series", methods=["GET"])
    @require_sim
    def get_time_series():
        limit = request.args.get("limit", 100, type=int)
        state = _bridge.get_state()
        time_series = state.get("time_series", [])[-limit:]
        return jsonify({"time_series": time_series})

    @app.route("/api/simulation/agents", methods=["GET"])
    @require_sim
    def get_agents():
        limit = request.args.get("limit", 20, type=int)
        state = _bridge.get_state()
        agents = state.get("agent_states", [])[:limit]
        return jsonify({"agents": agents})

    @app.route("/api/simulation/start", methods=["POST"])
    @require_sim
    def start_simulation():
        if _bridge.is_running:
            return jsonify(
                {"status": "already_running", "timestep": _bridge.model.timestep}
            )
        _bridge.start()
        return jsonify(
            {
                "status": "started",
                "timestep": _bridge.model.timestep,
                "tick_rate_ms": _bridge.model.config.simulation_tick_ms,
            }
        )

    @app.route("/api/simulation/stop", methods=["POST"])
    @require_sim
    def stop_simulation():
        _bridge.stop()
        return jsonify({"status": "stopped", "final_timestep": _bridge.model.timestep})

    @app.route("/api/simulation/reset", methods=["POST"])
    @require_sim
    def reset_simulation():
        _bridge.reset()
        return jsonify({"status": "reset"})

    @app.route("/api/simulation/config", methods=["GET", "POST"])
    @require_sim
    def config_simulation():
        if request.method == "GET":
            config = _bridge.model.config
            return jsonify(
                {
                    "n_initial_agents": config.n_initial_agents,
                    "network_topology": config.network_topology.value,
                    "simulation_tick_ms": config.simulation_tick_ms,
                    "max_agents": config.max_agents,
                    "enable_evolution": config.enable_evolution,
                    "mutation_rate": config.mutation_rate,
                }
            )

        data = request.get_json() or {}
        config = _bridge.model.config

        if "n_initial_agents" in data:
            config.n_initial_agents = data["n_initial_agents"]
        if "network_topology" in data:
            config.network_topology = NetworkTopology(data["network_topology"])
        if "simulation_tick_ms" in data:
            config.simulation_tick_ms = data["simulation_tick_ms"]
        if "max_agents" in data:
            config.max_agents = data["max_agents"]
        if "enable_evolution" in data:
            config.enable_evolution = data["enable_evolution"]
        if "mutation_rate" in data:
            config.mutation_rate = data["mutation_rate"]

        return jsonify(
            {
                "status": "config_updated",
                "config": {
                    "n_initial_agents": config.n_initial_agents,
                    "network_topology": config.network_topology.value,
                    "simulation_tick_ms": config.simulation_tick_ms,
                },
            }
        )

    @app.route("/api/simulation/step", methods=["POST"])
    @require_sim
    def step_simulation():
        metrics = _bridge.model.step()
        return jsonify(
            {
                "status": "stepped",
                "timestep": metrics.timestep,
                "collective_v_active": metrics.collective_v_active,
            }
        )

    @app.route("/api/network/stats", methods=["GET"])
    @require_sim
    def get_network_stats():
        state = _bridge.get_state()
        return jsonify(state.get("network", {}))

    @app.route("/api/health", methods=["GET"])
    def health():
        if _bridge is None:
            return jsonify(
                {"status": "error", "error": "Simulation bridge not initialized"}
            ), 500
        return jsonify(
            {
                "status": "ok",
                "simulation_running": _bridge.is_running,
                "timestep": _bridge.model.timestep,
                "agent_count": len(_bridge.model.agents),
            }
        )

    return app


def run_api(
    bridge: Optional[SimulationBridge] = None, host: str = "0.0.0.0", port: int = 5001
):
    """Run the Flask API server"""
    app = create_app(bridge)
    app.run(host=host, port=port, debug=False, threaded=True)


if __name__ == "__main__":
    bridge = get_bridge()
    run_api(bridge)
