/**
 * INTEGRATION_EXAMPLE.tsx
 * Example code showing how to integrate the zero-cost simulation engine
 * with the ResonanceTrajectory canvas component
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { CORE_GATEWAY } from './core/CryptoWrapper';
import { STATE_LOADER, useSimulationState } from './core/stateFileLoader';
import * as THREE from 'three';

/**
 * Example 1: Direct state access in useFrame (recommended for Three.js)
 */
export function ResonanceTrajectoryWithSimulation() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Get current simulation state from Python stream
    const uniforms = CORE_GATEWAY.getCurrentSimulationState();

    // Apply state to mesh transformations
    const time = state.clock.elapsedTime;
    const mesh = meshRef.current;

    for (let i = 0; i < 2000; i++) {
      const dummy = new THREE.Object3D();

      // Use simulation uniforms for toroidal geometry
      const theta = (i / 2000) * Math.PI * 2;
      const phi = time * uniforms.orbitalVelocity;

      // Apply alpha-driven radius
      const majorRadius = uniforms.toroidalRadius * 2.0;
      const minorRadius = 0.5;

      // Position on torus with fission stretch
      const stretchFactor = 1.0 + (uniforms.fissionStretch * 0.3);
      dummy.position.x = (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta) * stretchFactor;
      dummy.position.y = (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta);
      dummy.position.z = minorRadius * Math.sin(phi);

      // Apply noise-based jitter
      dummy.position.x += (Math.random() - 0.5) * uniforms.noise * 0.2;
      dummy.position.y += (Math.random() - 0.5) * uniforms.noise * 0.2;
      dummy.position.z += (Math.random() - 0.5) * uniforms.noise * 0.2;

      // Apply temperature-based scale
      const scale = 0.02 + (uniforms.temp * 0.03);
      dummy.scale.set(scale, scale, scale);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 2000]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#00ffff" />
    </instancedMesh>
  );
}

/**
 * Example 2: React component with simulation state hook
 */
export function SimulationDashboard() {
  const simState = useSimulationState(1000); // Refresh every 1s

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-green-400 p-4 rounded font-mono text-xs">
      <h3 className="font-bold mb-2">Simulation Engine</h3>
      <div className="space-y-1">
        <div>Cycle: #{simState.metadata.cycle_count}</div>
        <div>Profile: {simState.metadata.profile_type}</div>
        <div>State: {simState.telemetry.state}</div>
        <div className="border-t border-green-800 my-2" />
        <div>Alpha: {simState.telemetry.alpha.toFixed(3)}</div>
        <div>Noise: {simState.telemetry.noise.toFixed(3)}</div>
        <div>Temp: {simState.telemetry.temp.toFixed(3)}</div>
        <div className="border-t border-green-800 my-2" />
        <div>Particles: {simState.system.particle_count}</div>
        <div>Resonance: {simState.system.resonance.toFixed(3)}</div>
        {simState.system.fission_stretch > 0 && (
          <div className="text-yellow-400">
            Fission: {simState.system.fission_stretch.toFixed(2)}x
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: Conditional rendering based on profile type
 */
export function AdaptiveParticleSystem() {
  const isFission = STATE_LOADER.isFissionMode();
  const isStandby = STATE_LOADER.isStandbyMode();
  const particleCount = STATE_LOADER.getParticleCount();

  return (
    <>
      {isStandby && (
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#333333" wireframe />
        </mesh>
      )}

      {isFission && (
        <group>
          {/* Dumbbell morphology visualization */}
          <mesh position={[-2, 0, 0]}>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[2, 0, 0]}>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}

      {!isStandby && !isFission && (
        <instancedMesh args={[undefined, undefined, particleCount]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#00ffff" />
        </instancedMesh>
      )}
    </>
  );
}

/**
 * Example 4: Integration with existing HUD store
 */
export function SyncSimulationToHUD() {
  const simState = useSimulationState(500); // Fast refresh for HUD

  // In a real implementation, this would update your Zustand HUD store
  // Example:
  // useEffect(() => {
  //   useHUDStore.setState({
  //     flux: simState.telemetry.noise,
  //     sunriseOpacity: simState.telemetry.alpha,
  //     // ... other mappings
  //   });
  // }, [simState]);

  return null; // Pure sync component
}

/**
 * Example 5: Debug overlay showing all simulation data
 */
export function SimulationDebugOverlay() {
  const uniforms = CORE_GATEWAY.getCurrentSimulationState();
  const cycleCount = STATE_LOADER.getCycleCount();
  const uptime = STATE_LOADER.getUptime();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900/90 text-white p-3 rounded text-xs font-mono max-w-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>Cycle:</div>
        <div className="text-cyan-400">#{cycleCount}</div>

        <div>Uptime:</div>
        <div className="text-cyan-400">{uptime}s</div>

        <div className="col-span-2 border-t border-gray-700 my-1" />

        <div>Alpha:</div>
        <div className="text-green-400">{uniforms.alpha.toFixed(3)}</div>

        <div>Noise:</div>
        <div className="text-green-400">{uniforms.noise.toFixed(3)}</div>

        <div>Temp:</div>
        <div className="text-green-400">{uniforms.temp.toFixed(3)}</div>

        <div className="col-span-2 border-t border-gray-700 my-1" />

        <div>Orbital V:</div>
        <div className="text-yellow-400">{uniforms.orbitalVelocity.toFixed(3)}</div>

        <div>Toroidal R:</div>
        <div className="text-yellow-400">{uniforms.toroidalRadius.toFixed(3)}</div>

        <div>Fission:</div>
        <div className={uniforms.fissionStretch > 1.0 ? "text-red-400" : "text-gray-500"}>
          {uniforms.fissionStretch.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

/**
 * USAGE IN APP.tsx
 * 
 * import { SimulationDashboard } from './mirror/INTEGRATION_EXAMPLE';
 * 
 * function App() {
 *   return (
 *     <>
 *       <Canvas>
 *         <ResonanceTrajectoryWithSimulation />
 *       </Canvas>
 *       <SimulationDashboard />
 *     </>
 *   );
 * }
 */
