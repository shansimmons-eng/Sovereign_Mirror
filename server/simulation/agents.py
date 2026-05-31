#!/usr/bin/env python3
"""
agents.py - Agent classes for governance simulation

Each simulation agent mirrors a real opencode agent's behavior
based on outputs from truth_check_pipeline.py.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from enum import Enum
import random


class Strategy(Enum):
    COOPERATE = "COOPERATE"
    DEFECT = "DEFECT"
    TIT_FOR_TAT = "TIT_FOR_TAT"
    TIT_FOR_TWO_TATS = "TIT_FOR_TWO_TATS"
    GRUDGE = "GRUDGE"
    RANDOM = "RANDOM"


class InverionState(Enum):
    UNSPECIFIED = 0
    SUBJECTIVE_NOISE = 1
    TRANSITIONAL = 2
    OBJECTIVE_REALITY = 3


@dataclass
class AgentState:
    """Snapshot of agent state at a point in time"""

    agent_id: str
    veracity_adherence: float
    emotional_regulation: float
    module_adoption: float
    energy: float
    strategy: Strategy
    inverion_state: InverionState
    fallacy_count: int
    payoff_total: float
    timestamp: float


@dataclass
class AgentConfig:
    """Configuration for initializing a simulation agent"""

    agent_id: str
    veracity_adherence: float = 0.5
    emotional_regulation: float = 0.7
    module_adoption: float = 0.5
    energy: float = 1.0
    strategy: Strategy = Strategy.TIT_FOR_TAT
    initial_claims: List[Dict] = field(default_factory=list)


class RealNodeAgent:
    """
    Simulation agent that mirrors a real opencode agent.

    Attributes mirror those in the CU framework:
    - veracity_adherence: V_active - V_control from veracity gate
    - emotional_regulation: ability to maintain stable ratings
    - module_adoption: which training modules agent has completed
    - energy: compute/resources available
    - strategy: game-theoretic approach to interactions
    """

    FALLACY_CRITICAL_THRESHOLD = 0.15

    def __init__(self, config: AgentConfig):
        self.agent_id = config.agent_id
        self.veracity_adherence = config.veracity_adherence
        self.emotional_regulation = config.emotional_regulation
        self.module_adoption = config.module_adoption
        self.energy = config.energy
        self.strategy = config.strategy
        self.inverion_state = InverionState.OBJECTIVE_REALITY

        self.fallacy_count = 0
        self.payoff_total = 0.0
        self.payoff_history: List[float] = []
        self.interaction_history: List[Dict] = []
        self.last_action: Optional[str] = None
        self.grudge_counter = 0

    @property
    def state(self) -> AgentState:
        return AgentState(
            agent_id=self.agent_id,
            veracity_adherence=self.veracity_adherence,
            emotional_regulation=self.emotional_regulation,
            module_adoption=self.module_adoption,
            energy=self.energy,
            strategy=self.strategy,
            inverion_state=self.inverion_state,
            fallacy_count=self.fallacy_count,
            payoff_total=self.payoff_total,
            timestamp=0,  # Will be set by model
        )

    def calculate_payoff(self, other: "RealNodeAgent") -> float:
        """
        Calculate payoff from interaction using Iterated Prisoner's Dilemma.

        Payoff matrix (scaled by veracity adherence):
        - Both cooperate: Both gain veracity bonus
        - One defects: Defector gains short-term, cooperator loses
        - Both defect: Both lose veracity (escalation)
        """
        my_action = self.decide_action(other)
        their_action = other.last_action or "COOPERATE"
        self.last_action = my_action

        # Base payoff calculation
        base_payoff = self._base_payoff(my_action, their_action)

        # Scale by veracity adherence (higher veracity = higher stakes)
        v_scaling = (self.veracity_adherence + other.veracity_adherence) / 2

        payoff = base_payoff * v_scaling

        # Track for TFT/grudge strategies
        if their_action == "DEFECT":
            self.grudge_counter = 2 if self.strategy == Strategy.TIT_FOR_TWO_TATS else 1
        elif self.grudge_counter > 0:
            self.grudge_counter -= 1

        return payoff

    def _base_payoff(self, my_action: str, their_action: str) -> float:
        """Core payoff matrix values"""
        if my_action == "COOPERATE" and their_action == "COOPERATE":
            return 1.0
        elif my_action == "COOPERATE" and their_action == "DEFECT":
            return -0.5
        elif my_action == "DEFECT" and their_action == "COOPERATE":
            return 0.8
        else:  # Both defect
            return -0.2

    def decide_action(self, other: Optional["RealNodeAgent"] = None) -> str:
        """Decide action based on strategy"""
        if self.strategy == Strategy.COOPERATE:
            return "COOPERATE"
        elif self.strategy == Strategy.DEFECT:
            return "DEFECT"
        elif self.strategy == Strategy.TIT_FOR_TAT:
            if other and other.last_action == "DEFECT":
                return "DEFECT"
            return "COOPERATE"
        elif self.strategy == Strategy.TIT_FOR_TWO_TATS:
            if other and other.grudge_counter > 0:
                return "DEFECT"
            return "COOPERATE"
        elif self.strategy == Strategy.GRUDGE:
            if self.grudge_counter > 0:
                return "DEFECT"
            return "COOPERATE"
        elif self.strategy == Strategy.RANDOM:
            return random.choice(["COOPERATE", "DEFECT"])
        return "COOPERATE"

    def apply_payoff(self, payoff: float) -> None:
        """Apply payoff and update agent state"""
        self.payoff_history.append(payoff)
        self.payoff_total += payoff

        # Veracity update based on action
        if self.last_action == "DEFECT":
            # Defection has veracity cost
            self.veracity_adherence = max(0.1, self.veracity_adherence - 0.02)
        else:
            # Cooperation builds veracity
            self.veracity_adherence = min(1.0, self.veracity_adherence + 0.01)

        # Energy decays with each interaction
        self.energy *= 0.98

        # Update InverionState based on veracity
        if self.veracity_adherence >= 0.7:
            self.inverion_state = InverionState.OBJECTIVE_REALITY
        elif self.veracity_adherence >= 0.3:
            self.inverion_state = InverionState.TRANSITIONAL
        else:
            self.inverion_state = InverionState.SUBJECTIVE_NOISE

    def receive_claim(self, claim_data: Dict) -> None:
        """Process a claim from the truth_check_pipeline"""
        veracity_score = claim_data.get("veracity_score", 0.5)
        status = claim_data.get("status", "UNVERIFIED")

        # Update veracity based on claim verification
        if status == "VERIFIED":
            self.veracity_adherence = min(1.0, self.veracity_adherence + 0.05)
        elif status == "DISPUTED":
            pass  # No change for disputed
        else:
            self.veracity_adherence = max(0.1, self.veracity_adherence - 0.02)

        # Track fallacies if detected
        fallacies = claim_data.get("detected_fallacies", [])
        self.fallacy_count += len(fallacies)

        # Check InverionState
        self._update_inverion_state()

    def _update_inverion_state(self) -> None:
        """Update InverionState based on current metrics"""
        if self.fallacy_count > 5:
            self.inverion_state = InverionState.SUBJECTIVE_NOISE
        elif self.veracity_adherence >= 0.7:
            self.inverion_state = InverionState.OBJECTIVE_REALITY
        elif self.veracity_adherence >= 0.3:
            self.inverion_state = InverionState.TRANSITIONAL
        else:
            self.inverion_state = InverionState.SUBJECTIVE_NOISE

    def to_dict(self) -> Dict:
        """Serialize agent state to dict"""
        return {
            "agent_id": self.agent_id,
            "veracity_adherence": round(self.veracity_adherence, 4),
            "emotional_regulation": round(self.emotional_regulation, 4),
            "module_adoption": round(self.module_adoption, 4),
            "energy": round(self.energy, 4),
            "strategy": self.strategy.value,
            "inverion_state": self.inverion_state.name,
            "fallacy_count": self.fallacy_count,
            "payoff_total": round(self.payoff_total, 4),
            "payoff_trend": self._calculate_trend(),
        }

    def _calculate_trend(self) -> str:
        """Calculate payoff trend from history"""
        if len(self.payoff_history) < 5:
            return "STABLE"
        recent = self.payoff_history[-5:]
        avg_recent = sum(recent) / len(recent)
        if avg_recent > 0.1:
            return "RISING"
        elif avg_recent < -0.1:
            return "FALLING"
        return "STABLE"

    @classmethod
    def from_claim_result(cls, agent_id: str, claim_result: Dict) -> "RealNodeAgent":
        """Create an agent from a truth_claims.json result"""
        config = AgentConfig(
            agent_id=agent_id,
            veracity_adherence=claim_result.get("veracity_score", 0.5),
            emotional_regulation=1.0 - claim_result.get("V_control", 0),
            module_adoption=0.8,  # Default if doing truth checks
            strategy=Strategy.TIT_FOR_TAT,
        )
        return cls(config)
