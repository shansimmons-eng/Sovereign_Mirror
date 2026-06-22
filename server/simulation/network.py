#!/usr/bin/env python3
"""
network.py - Agent network topology and interactions

Defines how agents are connected and how information/cascades spread.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Tuple
from enum import Enum
import math
import random


class NetworkTopology(Enum):
    FULLY_CONNECTED = "fully_connected"
    SPARSE = "sparse"
    HUB_AND_SPOKE = "hub_and_spoke"
    SMALL_WORLD = "small_world"
    GRID = "grid"
    RANDOM = "random"


@dataclass
class NetworkEdge:
    """Represents a connection between two agents"""

    source_id: str
    target_id: str
    weight: float = 1.0
    latency: float = 0.0  # ms
    last_interaction: float = 0


class AgentNetwork:
    """
    Network structure connecting simulation agents.

    Supports multiple topology types and tracks:
    - Who influences whom
    - Cascade pathways
    - Network resilience metrics
    """

    def __init__(self, topology: NetworkTopology = NetworkTopology.SPARSE):
        self.topology = topology
        self.nodes: Set[str] = set()
        self.edges: Dict[str, List[NetworkEdge]] = {}  # adjacency list
        self.edge_index: Dict[Tuple[str, str], NetworkEdge] = {}  # quick lookup
        self.interaction_counts: Dict[Tuple[str, str], int] = {}

    def add_node(self, node_id: str) -> None:
        """Add an agent to the network"""
        if node_id not in self.nodes:
            self.nodes.add(node_id)
            self.edges[node_id] = []

    def add_edge(self, source: str, target: str, weight: float = 1.0) -> None:
        """Add a directed edge between agents"""
        if source not in self.nodes or target not in self.nodes:
            return

        edge = NetworkEdge(source, target, weight)
        self.edges[source].append(edge)
        self.edge_index[(source, target)] = edge

        key = (source, target)
        self.interaction_counts[key] = 0

    def get_neighbors(self, node_id: str) -> List[str]:
        """Get all agents connected to this agent"""
        if node_id not in self.edges:
            return []
        return [e.target_id for e in self.edges[node_id]]

    def get_edge_weight(self, source: str, target: str) -> float:
        """Get weight of edge between two agents"""
        edge = self.edge_index.get((source, target))
        return edge.weight if edge else 0.0

    def record_interaction(self, source: str, target: str) -> None:
        """Record that two agents interacted"""
        key = (source, target)
        self.interaction_counts[key] = self.interaction_counts.get(key, 0) + 1

        # Update edge latency
        if key in self.edge_index:
            self.edge_index[key].last_interaction = 0  # Will be set by model time

    def get_influence_score(self, node_id: str) -> float:
        """
        Calculate how much influence a node has in the network.

        Based on:
        - Number of connections (degree)
        - Weighted importance of neighbors
        - Position in network (centrality approximation)
        """
        if node_id not in self.edges:
            return 0.0

        # Outgoing edges (influence it can exert)
        outgoing = len(self.edges[node_id])

        # Incoming edges (influence it receives)
        incoming = sum(
            1 for edges in self.edges.values() for e in edges if e.target_id == node_id
        )

        # Neighbors' influence (second-degree)
        neighbor_influence = 0.0
        for neighbor in self.get_neighbors(node_id):
            neighbor_degree = len(self.edges.get(neighbor, []))
            neighbor_influence += neighbor_degree / max(1, len(self.nodes))

        # Combine into influence score
        influence = (
            outgoing / max(1, len(self.nodes)) * 0.4
            + incoming / max(1, len(self.nodes)) * 0.3
            + neighbor_influence * 0.3
        )

        return min(1.0, influence)

    def get_cascade_pathways(self, source_id: str) -> List[List[str]]:
        """
        Find all pathways through which a cascade could spread.

        Returns list of paths from source to all reachable nodes.
        """
        if source_id not in self.nodes:
            return []

        paths = []
        visited = set()

        def dfs(current: str, path: List[str], depth: int):
            if depth > 10:  # Limit path length
                return

            if current in visited and current != source_id:
                return

            visited.add(current)
            path.append(current)

            if current != source_id:
                paths.append(path.copy())

            for neighbor in self.get_neighbors(current):
                dfs(neighbor, path.copy(), depth + 1)

        dfs(source_id, [], 0)
        return paths

    def calculate_clustering_coefficient(self) -> float:
        """
        Calculate network clustering coefficient.

        High clustering = agents tend to form tight-knit groups.
        Affects how quickly cascades spread within groups.
        """
        if len(self.nodes) < 3:
            return 0.0

        triangles = 0
        triples = 0

        for node in self.nodes:
            neighbors = set(self.get_neighbors(node))
            k = len(neighbors)

            if k < 2:
                continue

            triples += k * (k - 1) / 2

            # Count triangles
            for neighbor1 in neighbors:
                for neighbor2 in neighbors:
                    if neighbor1 != neighbor2:
                        if neighbor2 in self.get_neighbors(neighbor1):
                            triangles += 1

        if triples == 0:
            return 0.0

        return triangles / triples

    def calculate_network_resilience(self) -> float:
        """
        Calculate network resilience to targeted attacks.

        High resilience = network maintains function even if high-degree nodes fail.
        """
        if len(self.nodes) < 2:
            return 1.0

        # Calculate initial connectivity
        initial_conn = self._count_connected_components()

        # Remove highest-degree node and recalculate
        temp_nodes = self.nodes.copy()
        if not temp_nodes:
            return 0.0

        # Find node with most connections
        max_degree_node = max(temp_nodes, key=lambda n: len(self.get_neighbors(n)))
        temp_nodes.discard(max_degree_node)

        # Recalculate with node removed
        temp_network = AgentNetwork(self.topology)
        temp_network.nodes = temp_nodes
        for n in temp_nodes:
            temp_network.edges[n] = [
                e for e in self.edges.get(n, []) if e.target_id in temp_nodes
            ]

        final_conn = temp_network._count_connected_components()

        # Resilience = how much connectivity changed
        resilience = final_conn / initial_conn if initial_conn > 0 else 0
        return min(1.0, resilience)

    def _count_connected_components(self) -> int:
        """Count connected components using DFS"""
        visited = set()
        components = 0

        def dfs(node: str):
            visited.add(node)
            for neighbor in self.get_neighbors(node):
                if neighbor not in visited:
                    dfs(neighbor)

        for node in self.nodes:
            if node not in visited:
                dfs(node)
                components += 1

        return components

    def get_network_stats(self) -> Dict:
        """Get comprehensive network statistics"""
        if not self.nodes:
            return {
                "node_count": 0,
                "edge_count": 0,
                "avg_degree": 0.0,
                "clustering_coefficient": 0.0,
                "resilience": 0.0,
            }

        total_edges = sum(len(edges) for edges in self.edges.values())

        return {
            "node_count": len(self.nodes),
            "edge_count": total_edges,
            "avg_degree": total_edges / len(self.nodes),
            "clustering_coefficient": self.calculate_clustering_coefficient(),
            "resilience": self.calculate_network_resilience(),
            "topology": self.topology.value,
        }

    @classmethod
    def create_random_network(
        cls, n_nodes: int, connection_prob: float = 0.1
    ) -> "AgentNetwork":
        """Create a random network (Erdos-Renyi model)"""
        network = cls(NetworkTopology.RANDOM)

        for i in range(n_nodes):
            network.add_node(f"node_{i}")

        for i in range(n_nodes):
            for j in range(n_nodes):
                if i != j and random.random() < connection_prob:
                    network.add_edge(f"node_{i}", f"node_{j}")

        return network

    @classmethod
    def create_small_world_network(
        cls, n_nodes: int, k: int = 4, rewire_prob: float = 0.1
    ) -> "AgentNetwork":
        """
        Create a small-world network (Watts-Strogatz model).

        High clustering + short path lengths = small world effect.
        """
        network = cls(NetworkTopology.SMALL_WORLD)

        # Add nodes
        for i in range(n_nodes):
            network.add_node(f"node_{i}")

        # Create ring lattice (each node connected to k nearest neighbors)
        for i in range(n_nodes):
            for j in range(1, k // 2 + 1):
                target = (i + j) % n_nodes
                network.add_edge(f"node_{i}", f"node_{target}")

        # Rewire with probability
        for i in range(n_nodes):
            for j in range(len(network.edges.get(f"node_{i}", []))):
                if random.random() < rewire_prob:
                    old_target = network.edges[f"node_{i}"][j].target_id
                    new_target = random.choice(
                        [n for n in range(n_nodes) if n != i and n != old_target]
                    )
                    network.edges[f"node_{i}"][j].target_id = f"node_{new_target}"

        return network

    @classmethod
    def create_hub_network(cls, n_nodes: int, n_hubs: int = 3) -> "AgentNetwork":
        """
        Create a hub-and-spoke network.

        Few highly connected hubs, many peripheral nodes.
        """
        network = cls(NetworkTopology.HUB_AND_SPOKE)

        # Add all nodes
        for i in range(n_nodes):
            network.add_node(f"node_{i}")

        # Make first n_hubs as hubs
        hubs = [f"node_{i}" for i in range(n_hubs)]

        # Connect all nodes to random hub
        for i in range(n_nodes):
            hub = random.choice(hubs)
            network.add_edge(f"node_{i}", hub)

        # Connect hubs to each other
        for i, hub1 in enumerate(hubs):
            for hub2 in hubs[i + 1 :]:
                network.add_edge(hub1, hub2)
                network.add_edge(hub2, hub1)

        return network
