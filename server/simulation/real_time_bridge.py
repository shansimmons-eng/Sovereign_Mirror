#!/usr/bin/env python3
"""
real_time_bridge.py - Bridge between simulation and real agent outputs

Monitors truth_check_pipeline outputs and feeds them into simulation.
"""

import time
import threading
from pathlib import Path
from typing import Optional, Callable, Dict
import json

from .model import RealTimeGovernanceModel, SimulationConfig, SimulationMetrics
from .network import NetworkTopology


class SimulationBridge:
    """
    Main bridge class for real-time simulation.

    Handles:
    - Simulation lifecycle
    - External data monitoring
    - API state serving
    """

    def __init__(self, config: Optional[SimulationConfig] = None):
        self.model = RealTimeGovernanceModel(config)
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._last_state: Optional[Dict] = None
        self._subscribers: list = []

    @property
    def is_running(self) -> bool:
        return self._running and self._thread is not None and self._thread.is_alive()

    def start(self, background: bool = True) -> None:
        """Start the simulation"""
        if self._running:
            return

        self._running = True

        if background:
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()
        else:
            self._run_loop()

    def _run_loop(self) -> None:
        """Main simulation loop"""
        while self._running:
            self.model.step()
            self._last_state = self.model.get_state()

            # Notify subscribers
            for callback in self._subscribers:
                try:
                    callback(self._last_state)
                except Exception:
                    pass  # Don't let subscriber errors crash simulation

            # Simulation tick (default 1 second)
            time.sleep(self.model.config.simulation_tick_ms / 1000)

    def stop(self) -> None:
        """Stop the simulation"""
        self._running = False
        if self._thread and not self._thread.daemon:
            self._thread.join(timeout=5)
        self._thread = None

    def get_state(self) -> Dict:
        """Get current simulation state"""
        if self._last_state is None:
            self._last_state = self.model.get_state()
        return self._last_state

    def get_metrics(self) -> SimulationMetrics:
        """Get latest metrics"""
        if not self.model.history:
            return self.model._calculate_metrics()
        return self.model.history[-1]

    def subscribe(self, callback: Callable[[Dict], None]) -> None:
        """Subscribe to state updates"""
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[Dict], None]) -> None:
        """Unsubscribe from state updates"""
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def reset(self) -> None:
        """Reset simulation to initial state"""
        self.stop()
        self.model = RealTimeGovernanceModel(self.model.config)
        self._last_state = None


class DataMonitor:
    """
    Monitors directories for new data from truth_check_pipeline.

    Uses file modification time to detect changes.
    """

    def __init__(self, watch_paths: list):
        self.watch_paths = [Path(p) for p in watch_paths]
        self._last_mtimes: Dict[Path, float] = {}
        self._callbacks: list = []

    def check(self) -> bool:
        """Check if any watched files have changed"""
        for path in self.watch_paths:
            if not path.exists():
                continue

            mtime = path.stat().st_mtime
            if path not in self._last_mtimes:
                self._last_mtimes[path] = mtime
                continue

            if mtime > self._last_mtimes[path]:
                self._last_mtimes[path] = mtime
                return True

        return False

    def on_change(self, callback: Callable[[Path], None]) -> None:
        """Register callback for file changes"""
        self._callbacks.append(callback)

    def notify(self, path: Path) -> None:
        """Notify callbacks of change"""
        for callback in self._callbacks:
            try:
                callback(path)
            except Exception:
                pass


class VeracityAggregator:
    """
    Aggregates veracity data from multiple sources.

    Combines:
    - truth_claims.json
    - veracity_log.json
    - experiment/news/*.json
    """

    def __init__(self, base_path: Path = Path("/home/retroporter/setup")):
        self.base_path = base_path

    def get_aggregate_veracity(self) -> float:
        """Calculate aggregate veracity from all sources"""
        scores = []

        # From truth_claims.json
        claims_file = self.base_path / "truth_claims.json"
        if claims_file.exists():
            try:
                with open(claims_file) as f:
                    data = json.load(f)
                for result in data.get("results", []):
                    scores.append(result.get("veracity_score", 0.5))
            except (json.JSONDecodeError, IOError):
                pass

        # From veracity_log.json
        log_file = self.base_path / "veracity_log.json"
        if log_file.exists():
            try:
                with open(log_file) as f:
                    log = json.load(f)
                for entry in log[-10:]:  # Last 10 entries
                    scores.append(entry.get("avg_veracity", 0.5))
            except (json.JSONDecodeError, IOError):
                pass

        return sum(scores) / len(scores) if scores else 0.5

    def get_veracity_trend(self) -> str:
        """Determine veracity trend direction"""
        log_file = self.base_path / "veracity_log.json"
        if not log_file.exists():
            return "STABLE"

        try:
            with open(log_file) as f:
                log = json.load(f)

            if len(log) < 3:
                return "STABLE"

            recent = [e.get("avg_veracity", 0.5) for e in log[-5:]]
            if all(recent[i] >= recent[i - 1] for i in range(1, len(recent))):
                return "RISING"
            if all(recent[i] <= recent[i - 1] for i in range(1, len(recent))):
                return "FALLING"
            return "STABLE"
        except (json.JSONDecodeError, IOError):
            return "STABLE"


# Global bridge instance (for use in API)
_bridge: Optional[SimulationBridge] = None


def get_bridge() -> SimulationBridge:
    """Get or create global bridge instance"""
    global _bridge
    if _bridge is None:
        _bridge = SimulationBridge()
    return _bridge


def initialize_bridge(config: Optional[SimulationConfig] = None) -> SimulationBridge:
    """Initialize global bridge with config"""
    global _bridge
    if _bridge is not None:
        _bridge.stop()
    _bridge = SimulationBridge(config)
    return _bridge
