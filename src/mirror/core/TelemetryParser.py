import json
from pathlib import Path
from typing import Optional
from .QuantumUndecidableGate import QuantumUndecidableGate
from .StateFissionRegistry import StateFissionRegistry

class TelemetryParser:
    def __init__(self, schema_path: Optional[str] = None):
        if schema_path is None:
            schema_path = str(Path(__file__).parent / "payload_schema.json")
        with open(str(schema_path), 'r') as f:
            self.schema = json.load(f)
        self.quantum_gate = QuantumUndecidableGate()
        self.fission_registry = StateFissionRegistry()

    def process_incoming_packet(self, raw_json_string: str) -> dict:
        try:
            data = json.loads(raw_json_string)
            self._validate_schema(data)

            gate_status = self.quantum_gate.screen_incoming_telemetry(data.get("cryptographic_gate", {}))

            if gate_status == "STATE_VERIFIED":
                return {
                    "status": "SUCCESS",
                    "action": "COMMIT_TO_LEDGER",
                    "data": data,
                    "node_id": data.get("packet_metadata", {}).get("source_node_id", "UNKNOWN")
                }
            else:
                node_id = data.get("packet_metadata", {}).get("source_node_id", "UNKNOWN")
                self.fission_registry.register_contradiction(node_id, "LOGICAL_CONTRADICTION")
                return {
                    "status": "FAIL",
                    "action": "TRIGGER_CORE_FISSION",
                    "reason": "LOGICAL_CONTRADICTION",
                    "node_id": node_id
                }

        except json.JSONDecodeError as e:
            return {
                "status": "FAIL",
                "action": "TRIGGER_CORE_FISSION",
                "reason": f"STRUCTURAL_INVALID_PAYLOAD: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "FAIL",
                "action": "TRIGGER_CORE_FISSION",
                "reason": f"VALIDATION_ERROR: {str(e)}"
            }

    def _validate_schema(self, data: dict) -> None:
        from jsonschema import validate, ValidationError
        validate(instance=data, schema=self.schema)

    def get_fission_status(self, node_id: str) -> dict:
        return self.fission_registry.get_fission_status(node_id)

    def load_ledger_packets(self, ledger_path: str) -> list:
        with open(ledger_path, 'r') as f:
            data = json.load(f)
            if isinstance(data, dict) and "events" in data:
                return data["events"]
            if isinstance(data, list):
                return data
            return []