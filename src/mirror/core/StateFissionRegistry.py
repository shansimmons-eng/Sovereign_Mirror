class StateFissionRegistry:
    def __init__(self):
        self.pending_fissions = []
        self.active_contradictions = set()

    def register_contradiction(self, node_id: str, reason: str) -> dict:
        entry = {
            "node_id": node_id,
            "reason": reason,
            "isolated_at": self._timestamp()
        }
        self.pending_fissions.append(entry)
        self.active_contradictions.add(node_id)
        return entry

    def clear_contradiction(self, node_id: str) -> bool:
        if node_id in self.active_contradictions:
            self.active_contradictions.remove(node_id)
            return True
        return False

    def get_fission_status(self, node_id: str) -> dict:
        is_isolated = node_id in self.active_contradictions
        pending = any(f.get("node_id") == node_id for f in self.pending_fissions)
        return {
            "isolated": is_isolated,
            "pending_fission": pending
        }

    def _timestamp(self) -> str:
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()

    def flush_resolved(self) -> int:
        count = len(self.pending_fissions)
        self.pending_fissions = []
        return count