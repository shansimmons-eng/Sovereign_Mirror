import { useEffect, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { nodeAtomFamily, nodeIdsAtom } from '../../state/atoms/nodeAtoms';
import { useNodeStore } from '../../state/stores/nodeStore';
import { syncVeracityToLedger, checkPGateWithConfirmation } from '../../state/syncBridge/syncBridge';
import { veracityGate } from '../../logic/veracityGate';

interface TestNodeUpdate {
  nodeId: string;
  veracityScore: number;
  resonanceScore: number;
  frictionMultiplier: number;
  timestamp: number;
}

const INJECTION_LOG_INTERVAL = 5000;
const SIMULATION_TICK = 500;

class SimulationLogger {
  private suspiciousAttempts: Map<string, TestNodeUpdate[]> = new Map();

  logPotentialBypass(nodeId: string, update: TestNodeUpdate, reason: string): void {
    if (!this.suspiciousAttempts.has(nodeId)) {
      this.suspiciousAttempts.set(nodeId, []);
    }
    this.suspiciousAttempts.get(nodeId)!.push(update);

    console.warn(
      `%c[SIMULATION AUDIT] %c[BYPASS_DETECTED] %c${new Date().toISOString()}`,
      'color: #F43F5E; font-weight: bold;',
      'color: #FB923C; font-weight: bold;',
      'color: #FFF7ED;',
      `\n  Node: ${nodeId}`,
      `\n  Reason: ${reason}`,
      `\n  V_active: ${update.veracityScore}`,
      `\n  V_control: ${update.frictionMultiplier * update.resonanceScore}`,
      `\n  Veracity Gate Result: ${veracityGate(update.veracityScore, update.frictionMultiplier * update.resonanceScore)}`
    );
  }

  report(state: Map<string, TestNodeUpdate[]>): void {
    let totalSuspicious = 0;
    state.forEach((updates, nodeId) => {
      if (updates.length > 0) {
        totalSuspicious += updates.length;
        updates.forEach((u) => {
          this.logPotentialBypass(nodeId, u, 'State injection detected');
        });
      }
    });

    if (totalSuspicious > 0) {
      console.error(
        `%c[SIMULATION SUMMARY] %c${totalSuspicious} bypass attempts detected`,
        'color: #DC2626; font-weight: bold;',
        'color: #F43F5E;'
      );
    } else {
      console.log(
        `%c[SIMULATION SUMMARY] %cAll ${state.size} nodes verified`,
        'color: #86EFAC; font-weight: bold;',
        'color: #86EFAC;'
      );
    }
  }
}

const simulationLogger = new SimulationLogger();

function useNodeSimulation(nodeId: string, active: boolean) {
  const [node, setNode] = useAtom(nodeAtomFamily(nodeId));
  const nodeRef = useRef(node);
  const previousValuesRef = useRef({ veracityScore: 0, resonanceScore: 0 });
  const updateNode = useNodeStore((s) => s.updateNode);

  useEffect(() => {
    nodeRef.current = node;
  }, [node]);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const currentNode = nodeRef.current;
      const newVeracity = Math.random() * 1.5;
      const newResonance = Math.random() * 1.0;

      const prevV = previousValuesRef.current.veracityScore;
      const deltaV = Math.abs(newVeracity - prevV);

      if (deltaV > 0.5) {
        simulationLogger.logPotentialBypass(nodeId, {
          nodeId,
          veracityScore: newVeracity,
          resonanceScore: newResonance,
          frictionMultiplier: currentNode.frictionMultiplier,
          timestamp: Date.now(),
        }, 'Sudden veracity spike > 0.5 per tick');
      }

      const result = veracityGate(newVeracity, currentNode.frictionMultiplier * currentNode.resonanceScore);

      if (result > 0) {
        syncVeracityToLedger(
          nodeId,
          newVeracity,
          deltaV / SIMULATION_TICK,
          currentNode.frictionMultiplier,
          newResonance
        );
      }

      checkPGateWithConfirmation(nodeId, newResonance);

      previousValuesRef.current = { veracityScore: newVeracity, resonanceScore: newResonance };

      const newStatus = result > 0 ? 'refining' : 'virtual';

      setNode({
        ...currentNode,
        veracityScore: newVeracity,
        resonanceScore: newResonance,
        virtualResonance: newResonance,
        veracityVelocity: deltaV / SIMULATION_TICK,
        status: newStatus,
      });

      updateNode(nodeId, {
        veracityScore: newVeracity,
        resonanceScore: newResonance,
        virtualResonance: newResonance,
        veracityVelocity: deltaV / SIMULATION_TICK,
        status: newStatus,
      });
    }, SIMULATION_TICK);

    return () => clearInterval(interval);
  }, [active, nodeId, setNode, updateNode]);
}

function TestNodeSimulator({ nodeCount }: { nodeCount: number }) {
  const setNodeIds = useSetAtom(nodeIdsAtom);
  const setStoreNodeIds = useNodeStore((s) => s.setNodeIds);
  const activeRef = useRef(true);

  useEffect(() => {
    const ids = Array.from({ length: nodeCount }, (_, i) => `NODE_${String(i).padStart(4, '0')}`);
    setNodeIds(ids);
    setStoreNodeIds(ids);

    const auditInterval = setInterval(() => {
      console.log(
        `%c[SIMULATION TICK] %c${nodeCount} nodes active | Veracity Gate: Active | P-Gate: Monitoring`,
        'color: #86EFAC; font-weight: bold;',
        'color: #FFF7ED;'
      );
    }, INJECTION_LOG_INTERVAL);

    return () => {
      clearInterval(auditInterval);
      activeRef.current = false;
    };
  }, [nodeCount, setNodeIds, setStoreNodeIds]);

  return (
    <div className="hidden">
      {Array.from({ length: Math.min(nodeCount, 100) }, (_, i) => (
        <TestNodeSimulatorInner key={i} nodeId={`NODE_${String(i).padStart(4, '0')}`} active={activeRef.current} />
      ))}
    </div>
  );
}

function TestNodeSimulatorInner({ nodeId, active }: { nodeId: string; active: boolean }) {
  useNodeSimulation(nodeId, active);
  return null;
}

export function TestDashboard() {
  const NODE_COUNT = 1000;

  useEffect(() => {
    console.log(
      `%c[SOVEREIGN MIRROR] %cPhase 4 Integration Test Initialized | ${NODE_COUNT} Nodes`,
      'color: #FB923C; font-weight: bold; font-size: 14px;',
      'color: #FFF7ED;'
    );

    console.log(
      `%c[CONFIG] %cTick Rate: φ-exponential | Confirmation: 7 cycles | Atrophy: 24h`,
      'color: #86EFAC;',
      'color: #FFF7ED;'
    );
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <TestNodeSimulator nodeCount={NODE_COUNT} />
    </div>
  );
}

export { simulationLogger };