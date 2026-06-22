#!/usr/bin/env python3
"""
game_logic.py - Game theory payoffs and payoff matrix

Implements the Iterated Prisoner's Dilemma variant for governance simulation
with veracity-scaled payoffs.
"""

from dataclasses import dataclass
from typing import Dict, Tuple, List, Optional
from enum import Enum
import math


class Action(Enum):
    COOPERATE = "COOPERATE"
    DEFECT = "DEFECT"


class Outcome(Enum):
    MUTUAL_COOP = "MUTUAL_COOPERATION"
    EXPLOITATION = "EXPLOITATION"
    BEING_EXPLOITED = "BEING_EXPLOITED"
    MUTUAL_DEFECT = "MUTUAL_DEFECTION"
    UNDETERMINED = "UNDETERMINED"


@dataclass
class PayoffMatrix:
    """
    Payoff matrix for the governance game.

    Base values (before veracity scaling):

              | Cooperate       | Defect
    ----------+-----------------+------------------
    Cooperate | (+1.0, +1.0)    | (-0.5, +0.8)
    Defect    | (+0.8, -0.5)    | (-0.2, -0.2)

    With veracity scaling:
    - High veracity agents have more to gain/lose (higher stakes)
    - Low veracity agents have dampened payoffs (gaming the system)
    """

    # Base payoff values
    R = 1.0  # Reward for mutual cooperation
    S = -0.5  # Sucker's payoff (cooperated, got exploited)
    T = 0.8  # Temptation to defect
    P = -0.2  # Punishment for mutual defection

    # Veracity scaling parameters
    MIN_SCALING = 0.3  # Minimum scaling factor (for low veracity agents)
    MAX_SCALING = 1.5  # Maximum scaling factor (for high veracity agents)

    @classmethod
    def get_payoff(
        cls,
        my_action: Action,
        their_action: Action,
        my_veracity: float,
        their_veracity: float,
    ) -> Tuple[float, Outcome]:
        """
        Calculate payoff for a single interaction.

        Args:
            my_action: My action (COOPERATE or DEFECT)
            their_action: Their action
            my_veracity: My veracity adherence (0.0 - 1.0)
            their_veracity: Their veracity adherence (0.0 - 1.0)

        Returns:
            Tuple of (payoff_value, outcome)
        """
        # Determine base payoff
        if my_action == Action.COOPERATE and their_action == Action.COOPERATE:
            base_payoff = cls.R
            outcome = Outcome.MUTUAL_COOP
        elif my_action == Action.COOPERATE and their_action == Action.DEFECT:
            base_payoff = cls.S
            outcome = Outcome.BEING_EXPLOITED
        elif my_action == Action.DEFECT and their_action == Action.COOPERATE:
            base_payoff = cls.T
            outcome = Outcome.EXPLOITATION
        else:  # Both defect
            base_payoff = cls.P
            outcome = Outcome.MUTUAL_DEFECT

        # Calculate veracity scaling
        # High veracity = higher stakes (both gain and loss amplified)
        # Low veracity = lower stakes (gaming the system)
        avg_veracity = (my_veracity + their_veracity) / 2
        scaling = cls.MIN_SCALING + (cls.MAX_SCALING - cls.MIN_SCALING) * avg_veracity

        # Scale payoff
        scaled_payoff = base_payoff * scaling

        # High veracity agents suffer more from defection (deterrence)
        if my_action == Action.COOPERATE and their_action == Action.DEFECT:
            if my_veracity > 0.7:
                scaled_payoff *= (
                    0.8  # Extra penalty for being exploited when principled
                )
        # High veracity agents reward cooperation more
        elif my_action == Action.COOPERATE and their_action == Action.COOPERATE:
            if my_veracity > 0.7:
                scaled_payoff *= 1.2  # Extra reward for principled cooperation

        return scaled_payoff, outcome


class GameEngine:
    """
    Game logic engine for running game-theoretic simulations.

    Handles:
    - Payoff calculations
    - Strategy evaluation
    - Evolutionary dynamics (strategy fitness)
    """

    def __init__(self):
        self.matrix = PayoffMatrix()
        self.interaction_log: List[Dict] = []

    def calculate_payoff_pair(
        self, action_a: Action, action_b: Action, veracity_a: float, veracity_b: float
    ) -> Tuple[float, float, Dict]:
        """
        Calculate payoffs for both agents in an interaction.

        Returns:
            Tuple of (payoff_a, payoff_b, outcome_details)
        """
        payoff_a, outcome_a = self.matrix.get_payoff(
            action_a, action_b, veracity_a, veracity_b
        )
        payoff_b, outcome_b = self.matrix.get_payoff(
            action_b, action_a, veracity_b, veracity_a
        )

        # Log the interaction
        interaction = {
            "agent_a_action": action_a.value,
            "agent_b_action": action_b.value,
            "payoff_a": payoff_a,
            "payoff_b": payoff_b,
            "outcome": outcome_a.value,
        }
        self.interaction_log.append(interaction)

        outcome_details = {
            "outcome": outcome_a.value,
            "payoff_a": payoff_a,
            "payoff_b": payoff_b,
            "scaling_applied": (
                self.matrix.MIN_SCALING
                + (self.matrix.MAX_SCALING - self.matrix.MIN_SCALING)
                * (veracity_a + veracity_b)
                / 2
            ),
        }

        return payoff_a, payoff_b, outcome_details

    def calculate_collective_metrics(self, agents: List[Dict]) -> Dict:
        """
        Calculate collective metrics from agent states.

        Args:
            agents: List of agent state dicts

        Returns:
            Dict with collective metrics
        """
        if not agents:
            return {
                "collective_v_active": 0.0,
                "avg_veracity": 0.0,
                "cooperation_rate": 0.0,
                "defection_rate": 0.0,
                "cascade_risk": 0.0,
            }

        n = len(agents)

        # Average veracity
        v_values = [a.get("veracity_adherence", 0.5) for a in agents]
        avg_veracity = sum(v_values) / n

        # Collective V_active (veracity gate formula)
        v_active = sum(v_values) / n
        v_control = sum(a.get("control", 0.2) for a in agents) / n
        collective_v_active = max(0, v_active - v_control)

        # Cooperation/defection rates
        cooperation_count = sum(
            1 for a in agents if a.get("last_action") == "COOPERATE"
        )
        defection_count = sum(1 for a in agents if a.get("last_action") == "DEFECT")

        cooperation_rate = cooperation_count / n if n > 0 else 0
        defection_rate = defection_count / n if n > 0 else 0

        # Cascade risk: probability that defection spreads
        cascade_risk = self._calculate_cascade_risk(agents)

        return {
            "collective_v_active": collective_v_active,
            "avg_veracity": avg_veracity,
            "cooperation_rate": cooperation_rate,
            "defection_rate": defection_rate,
            "cascade_risk": cascade_risk,
        }

    def _calculate_cascade_risk(self, agents: List[Dict]) -> float:
        """
        Calculate probability of fallacy cascade.

        Cascade risk is high when:
        - Many agents have low veracity (susceptible to manipulation)
        - Few agents have high veracity (can't stop cascade)
        - Energy is low across network (can't resist)
        """
        if not agents:
            return 0.0

        low_veracity_count = sum(
            1 for a in agents if a.get("veracity_adherence", 0.5) < 0.3
        )
        high_veracity_count = sum(
            1 for a in agents if a.get("veracity_adherence", 0.5) > 0.7
        )

        low_ratio = low_veracity_count / len(agents)
        high_ratio = high_veracity_count / len(agents)

        # Cascade risk = low veracity fraction * inverse of high veracity fraction
        if high_ratio > 0:
            cascade_risk = low_ratio * (1 - high_ratio)
        else:
            cascade_risk = low_ratio

        return min(1.0, cascade_risk)

    def calculate_pgate_success(self, agents: List[Dict]) -> float:
        """
        Calculate P-gate success rate based on agent states.

        P-gate requires quorum and consensus. Success depends on:
        - Veracity distribution
        - Cooperation rate
        - Network connectivity
        """
        if not agents:
            return 0.0

        # Base success from average veracity
        v_values = [a.get("veracity_adherence", 0.5) for a in agents]
        base_success = sum(v_values) / len(v_values)

        # Adjust for cooperation
        coop_rate = sum(1 for a in agents if a.get("last_action") == "COOPERATE") / len(
            agents
        )
        coop_bonus = coop_rate * 0.2

        # Adjust for energy (resource availability)
        energy_values = [a.get("energy", 1.0) for a in agents]
        avg_energy = sum(energy_values) / len(energy_values)
        energy_factor = avg_energy * 0.1

        success_rate = min(1.0, base_success + coop_bonus + energy_factor)

        return success_rate

    def calculate_evolutionary_fitness(
        self, strategy_payoffs: Dict[str, List[float]], generations: int = 10
    ) -> Dict[str, float]:
        """
        Calculate evolutionary fitness for strategies.

        Strategies that consistently yield higher payoffs spread over time.
        Uses replicator dynamics approximation.

        Args:
            strategy_payoffs: Dict mapping strategy name to list of payoffs
            generations: Number of generations to simulate

        Returns:
            Dict mapping strategy to fitness score
        """
        if not strategy_payoffs:
            return {}

        fitness_scores = {}

        for strategy, payoffs in strategy_payoffs.items():
            if not payoffs:
                fitness_scores[strategy] = 0.0
                continue

            # Average payoff
            avg_payoff = sum(payoffs) / len(payoffs)

            # Consistency bonus (lower variance = higher fitness)
            if len(payoffs) > 1:
                variance = sum((p - avg_payoff) ** 2 for p in payoffs) / len(payoffs)
                consistency = 1 / (1 + math.sqrt(variance))
            else:
                consistency = 1.0

            # Combined fitness
            fitness = avg_payoff * 0.8 + consistency * 0.2
            fitness_scores[strategy] = max(0, fitness)

        return fitness_scores

    def get_interaction_summary(self) -> Dict:
        """Get summary of all logged interactions"""
        if not self.interaction_log:
            return {"total_interactions": 0}

        total = len(self.interaction_log)
        coop_count = sum(
            1 for i in self.interaction_log if i["agent_a_action"] == "COOPERATE"
        )
        exploit_count = sum(
            1 for i in self.interaction_log if i["outcome"] == "EXPLOITATION"
        )
        mutual_defect = sum(
            1 for i in self.interaction_log if i["outcome"] == "MUTUAL_DEFECTION"
        )

        return {
            "total_interactions": total,
            "cooperation_rate": coop_count / total,
            "exploitation_count": exploit_count,
            "mutual_defection_count": mutual_defect,
            "avg_payoff": sum(i["payoff_a"] for i in self.interaction_log) / total,
        }


class SignalingGameEngine:
    """
    Signaling game implementation for veracity proof.

    Agents can "prove" their veracity through actions, not just claims.
    Cost of signaling depends on actual veracity level.
    """

    def __init__(self):
        self.signaling_cost_multiplier = {
            "high_veracity": 0.1,  # Cheap to signal truthfully
            "low_veracity": 0.5,  # Expensive to fake
        }

    def calculate_signal_cost(
        self, agent_veracity: float, signal_strength: float
    ) -> float:
        """
        Calculate cost of sending a veracity signal.

        High veracity agents can cheaply prove themselves.
        Low veracity agents pay a steep cost to fake it.
        """
        if agent_veracity >= 0.7:
            base_cost = self.signaling_cost_multiplier["high_veracity"]
        else:
            base_cost = self.signaling_cost_multiplier["low_veracity"]
            # Exponential penalty for low veracity signaling high
            if signal_strength > agent_veracity:
                gap = signal_strength - agent_veracity
                base_cost *= 1 + gap**2

        return base_cost * signal_strength

    def evaluate_signal(
        self, sender_veracity: float, signal_strength: float, receiver_threshold: float
    ) -> Tuple[bool, float]:
        """
        Evaluate if a signal is credible.

        Returns:
            Tuple of (signal_accepted, actual_cost)
        """
        cost = self.calculate_signal_cost(sender_veracity, signal_strength)

        # Signal accepted if sender can afford it AND signal meets threshold
        accepted = (
            cost < signal_strength * 0.5 and signal_strength >= receiver_threshold
        )

        return accepted, cost
