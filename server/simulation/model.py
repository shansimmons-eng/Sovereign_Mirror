#!/usr/bin/env python3
"""
model.py - Core simulation model using Mesa-inspired architecture

Real-time governance simulation that mirrors real opencode agent outputs.
"""

import time
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from pathlib import Path
import json
import random

from agents import RealNodeAgent, AgentConfig, Strategy, InverionState
from game_logic import GameEngine
from network import AgentNetwork, NetworkTopology


# Paths from setup directory
TRUTH_CLAIMS_PATH = Path("/home/retroporter/setup/truth_claims.json")
VERACITY_LOG_PATH = Path("/home/retroporter/setup/veracity_log.json")
NEWS_DIR = Path("/home/retroporter/experiment/news")


@dataclass
class SimulationMetrics:
    """Snapshot of simulation state"""

    timestep: int
    collective_v_active: float
    avg_veracity: float
    cooperation_rate: float
    defection_rate: float
    cascade_risk: float
    pgate_success_rate: float
    agent_count: int
    energy_average: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class SimulationConfig:
    """Configuration for simulation run"""

    n_initial_agents: int = 10
    network_topology: NetworkTopology = NetworkTopology.SPARSE
    connection_prob: float = 0.2
    simulation_tick_ms: int = 1000  # 1 second per tick
    max_agents: int = 100
    enable_evolution: bool = True
    mutation_rate: float = 0.05


class RealTimeGovernanceModel:
    """
    Main simulation model.

    Reads from real agent outputs (truth_check_pipeline) and runs
    game-theoretic simulation with agent interactions.
    """

    def __init__(self, config: Optional[SimulationConfig] = None):
        self.config = config or SimulationConfig()

        # State
        self.agents: Dict[str, RealNodeAgent] = {}
        self.network = AgentNetwork(self.config.network_topology)
        self.game_engine = GameEngine()

        self.timestep = 0
        self.running = False
        self.last_data_scan = 0
        self.history: List[SimulationMetrics] = []

        # Callbacks
        self.on_metrics_update: Optional[Callable[[SimulationMetrics], None]] = None

        # Initialize
        self._initialize_network()

    def _initialize_network(self) -> None:
        """Set up initial network topology"""
        for i in range(self.config.n_initial_agents):
            agent_id = f"node_{i}"
            config = AgentConfig(
                agent_id=agent_id,
                veracity_adherence=random.uniform(0.4, 0.8),
                emotional_regulation=random.uniform(0.5, 0.9),
                module_adoption=random.uniform(0.3, 0.7),
                strategy=random.choice(list(Strategy)),
            )
            agent = RealNodeAgent(config)
            self.agents[agent_id] = agent
            self.network.add_node(agent_id)

        # Create network edges
        self._create_network_edges()

    def _create_network_edges(self) -> None:
        """Create edges based on topology"""
        if self.config.network_topology == NetworkTopology.SPARSE:
            prob = self.config.connection_prob
            for agent_id in self.agents:
                for other_id in self.agents:
                    if agent_id != other_id and random.random() < prob:
                        self.network.add_edge(agent_id, other_id)
        elif self.config.network_topology == NetworkTopology.FULLY_CONNECTED:
            for agent_id in self.agents:
                for other_id in self.agents:
                    if agent_id != other_id:
                        self.network.add_edge(agent_id, other_id)
        elif self.config.network_topology == NetworkTopology.HUB_AND_SPOKE:
            n_hubs = max(2, len(self.agents) // 5)
            hubs = list(self.agents.keys())[:n_hubs]
            for agent_id in self.agents:
                hub = (
                    random.choice(hubs)
                    if agent_id not in hubs
                    else random.choice([h for h in hubs if h != agent_id])
                )
                self.network.add_edge(agent_id, hub)

    def load_agents_from_truth_check(self) -> int:
        """
        Load/update agents from truth_check_pipeline outputs.

        Returns number of new/updated agents.
        """
        if not TRUTH_CLAIMS_PATH.exists():
            return 0

        try:
            with open(TRUTH_CLAIMS_PATH) as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError):
            return 0

        new_count = 0
        for i, result in enumerate(data.get("results", [])):
            agent_id = f"truth_agent_{i}"

            if agent_id not in self.agents:
                # Create new agent from claim
                config = AgentConfig(
                    agent_id=agent_id,
                    veracity_adherence=result.get("veracity_score", 0.5),
                    emotional_regulation=1.0 - result.get("V_control", 0),
                    module_adoption=0.8,
                    strategy=Strategy.TIT_FOR_TAT,
                )
                agent = RealNodeAgent(config)
                self.agents[agent_id] = agent
                self.network.add_node(agent_id)
                new_count += 1
            else:
                # Update existing agent
                self.agents[agent_id].receive_claim(result)

        return new_count

    def scan_for_new_data(self) -> bool:
        """Check if truth_check_pipeline has produced new output"""
        if not TRUTH_CLAIMS_PATH.exists():
            return False

        mtime = TRUTH_CLAIMS_PATH.stat().st_mtime
        if mtime > self.last_data_scan:
            self.last_data_scan = mtime
            return True
        return False

    def step(self) -> SimulationMetrics:
        """
        Advance simulation one timestep.

        1. Scan for new data from truth_check
        2. Run agent interactions
        3. Update metrics
        4. Record history
        """
        self.timestep += 1

        # Check for new real data
        if self.scan_for_new_data():
            new_agents = self.load_agents_from_truth_check()
            if new_agents > 0:
                self._create_network_edges()

        # Run agent interactions
        self._run_interactions()

        # Apply evolutionary dynamics
        if self.config.enable_evolution:
            self._apply_evolution()

        # Calculate metrics
        metrics = self._calculate_metrics()
        self.history.append(metrics)

        # Trim history if too long
        if len(self.history) > 1000:
            self.history = self.history[-1000:]

        # Callback
        if self.on_metrics_update:
            self.on_metrics_update(metrics)

        return metrics

    def _run_interactions(self) -> None:
        """Run interactions between neighboring agents"""
        agent_ids = list(self.agents.keys())
        random.shuffle(agent_ids)

        for i in range(0, len(agent_ids) - 1, 2):
            agent_a = self.agents[agent_ids[i]]
            agent_b = self.agents[agent_ids[i + 1]]

            # Calculate interaction
            payoff_a = agent_a.calculate_payoff(agent_b)
            payoff_b = agent_b.calculate_payoff(agent_a)

            # Apply payoffs
            agent_a.apply_payoff(payoff_a)
            agent_b.apply_payoff(payoff_b)

            # Record in network
            self.network.record_interaction(agent_a.agent_id, agent_b.agent_id)

    def _apply_evolution(self) -> None:
        """
        Apply evolutionary dynamics.

        Agents with low fitness may change strategy or be replaced.
        """
        if len(self.agents) < 3:
            return

        # Find lowest performing agents
        sorted_agents = sorted(
            self.agents.values(),
            key=lambda a: a.payoff_total / max(1, len(a.payoff_history)),
            reverse=True,
        )

        # Bottom 10% may mutate
        n_mutate = max(1, len(self.agents) // 10)
        for agent in sorted_agents[-n_mutate:]:
            if random.random() < self.config.mutation_rate:
                # Mutate strategy
                new_strategy = random.choice(list(Strategy))
                agent.strategy = new_strategy

    def _calculate_metrics(self) -> SimulationMetrics:
        """Calculate current metrics snapshot"""
        if not self.agents:
            return SimulationMetrics(
                timestep=self.timestep,
                collective_v_active=0.0,
                avg_veracity=0.0,
                cooperation_rate=0.0,
                defection_rate=0.0,
                cascade_risk=0.0,
                pgate_success_rate=0.0,
                agent_count=0,
                energy_average=0.0,
            )

        agent_states = [a.to_dict() for a in self.agents.values()]

        # Collective V_active via game engine
        collective = self.game_engine.calculate_collective_metrics(agent_states)

        # P-gate success
        pgate_success = self.game_engine.calculate_pgate_success(agent_states)

        # Network stats
        v_values = [a.veracity_adherence for a in self.agents.values()]
        energy_values = [a.energy for a in self.agents.values()]

        coop_count = sum(
            1 for a in self.agents.values() if a.last_action == "COOPERATE"
        )
        defect_count = sum(1 for a in self.agents.values() if a.last_action == "DEFECT")
        n = len(self.agents)

        return SimulationMetrics(
            timestep=self.timestep,
            collective_v_active=collective["collective_v_active"],
            avg_veracity=collective["avg_veracity"],
            cooperation_rate=coop_count / n if n > 0 else 0,
            defection_rate=defect_count / n if n > 0 else 0,
            cascade_risk=collective["cascade_risk"],
            pgate_success_rate=pgate_success,
            agent_count=n,
            energy_average=sum(energy_values) / n if n > 0 else 0,
        )

    def get_state(self) -> Dict:
        """Get current simulation state for API"""
        latest = self.history[-1] if self.history else self._calculate_metrics()

        return {
            "running": self.running,
            "timestep": self.timestep,
            "metrics": {
                "collective_v_active": latest.collective_v_active,
                "avg_veracity": latest.avg_veracity,
                "cooperation_rate": latest.cooperation_rate,
                "defection_rate": latest.defection_rate,
                "cascade_risk": latest.cascade_risk,
                "pgate_success_rate": latest.pgate_success_rate,
                "agent_count": latest.agent_count,
                "energy_average": latest.energy_average,
            },
            "network": self.network.get_network_stats(),
            "time_series": [
                {
                    "timestep": m.timestep,
                    "collective_v_active": m.collective_v_active,
                    "cascade_risk": m.cascade_risk,
                }
                for m in self.history[-100:]
            ],
            "agent_states": [
                a.to_dict()
                for a in list(self.agents.values())[:20]  # Limit to 20 for API
            ],
        }

    def start(self) -> None:
        """Start the simulation loop"""
        self.running = True
        while self.running:
            self.step()
            time.sleep(self.config.simulation_tick_ms / 1000)

    def stop(self) -> None:
        """Stop the simulation loop"""
        self.running = False

    def run_until(
        self,
        condition: Callable[["RealTimeGovernanceModel"], bool],
        max_timesteps: int = 10000,
    ) -> None:
        """Run until condition is met or max timesteps reached"""
        self.running = True
        while self.running and self.timestep < max_timesteps:
            if condition(self):
                break
            self.step()
        self.running = False
