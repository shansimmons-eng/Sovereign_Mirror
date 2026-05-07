import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNodeStore } from '../../state/stores/nodeStore';
import { useHUDStore } from '../../state/stores/hudStore';

const MAX_NODES = 50;
const AMBER = new THREE.Color('#FB923C');
const ROSE = new THREE.Color('#F43F5E');
const DORMANT = new THREE.Color('#475569');
const GOLD = new THREE.Color('#FFD700');
const ELECTRIC_BLUE = new THREE.Color('#00D4FF');

function generateSierpinskiPoints(depth: number, size: number, offset: THREE.Vector3 = new THREE.Vector3()): Float32Array {
  const points: number[] = [];

  function tetra(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: number): void {
    if (n === 0) {
      points.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      points.push(b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z);
      return;
    }

    const midAB = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const midAC = new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5);
    const midAD = new THREE.Vector3().addVectors(a, d).multiplyScalar(0.5);
    const midBC = new THREE.Vector3().addVectors(b, c).multiplyScalar(0.5);
    const midBD = new THREE.Vector3().addVectors(b, d).multiplyScalar(0.5);
    const midCD = new THREE.Vector3().addVectors(c, d).multiplyScalar(0.5);

    tetra(a, midAB, midAC, midAD, n - 1);
    tetra(midAB, b, midBC, midBD, n - 1);
    tetra(midAC, midBC, c, midCD, n - 1);
    tetra(midAD, midBD, midCD, d, n - 1);
  }

  const a = new THREE.Vector3(0, size, 0).add(offset);
  const b = new THREE.Vector3(size * 0.866, 0, -size * 0.5).add(offset);
  const c = new THREE.Vector3(-size * 0.866, 0, -size * 0.5).add(offset);
  const d = new THREE.Vector3(0, 0, size).add(offset);

  tetra(a, b, c, d, depth);

  return new Float32Array(points);
}

function createThreadCurve(t: number, velocity: number, index: number): THREE.Vector3 {
  const frequency = 0.5 + velocity * 0.1;
  const amplitude = 0.8 + velocity * 0.1;
  return new THREE.Vector3(
    Math.sin(t * frequency + index * 0.1) * amplitude,
    Math.cos(t * frequency * 1.3 + index * 0.1) * amplitude * 0.6,
    Math.sin(t * frequency * 0.7 + index * 0.05) * amplitude * 0.3
  );
}

function generateThreadGeometry(velocity: number, segments: number = 20): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 4;
    points.push(createThreadCurve(t, velocity, i));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, segments, 0.015 + velocity * 0.005, 8, false);
}

interface SceneContentProps {
  nodeIds: string[];
  flux: number;
}

function SceneContent({ nodeIds, flux }: SceneContentProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const fractalMeshRef = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(MAX_NODES * 3), []);
  const opacityArray = useMemo(() => new Float32Array(MAX_NODES), []);
  const nodeDataCache = useMemo(() => new Map<string, { veracityVelocity: number; resonanceVelocity: number; status: string }>(), []);

  const fluxRef = useRef(flux);
  const smoothedFlux = useRef(flux);

  const sierpinskiPoints = useMemo(() => generateSierpinskiPoints(2, 3), []);

  const sierpinskiGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(sierpinskiPoints, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [sierpinskiPoints]);

  const threadGeometry = useMemo(() => generateThreadGeometry(0.1, 20), []);

  useEffect(() => {
    return () => {
      if (sierpinskiGeometry) sierpinskiGeometry.dispose();
      if (threadGeometry) threadGeometry.dispose();
    };
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geometry = mesh.geometry;
    if (!geometry) return;

    const time = state.clock.getElapsedTime();
    const delta = state.clock.getDelta();
    if (delta > 0.1 || !isFinite(delta)) return;

    fluxRef.current = useNodeStore.getState().flux;
    smoothedFlux.current = THREE.MathUtils.lerp(smoothedFlux.current, Math.min(fluxRef.current, 0.95), 0.05);

    const morphFactor = THREE.MathUtils.clamp(smoothedFlux.current, 0, 1);
    if (!isFinite(morphFactor)) return;

    const nodeCount = Math.min(nodeIds.length, MAX_NODES);
    const noiseFilter = Math.min(useHUDStore.getState().noiseFilter, 0.7);
    const sunriseOpacity = useHUDStore.getState().sunriseOpacity;

    const noiseClampLimit = 0.12;
    const effectiveNoise = Math.min(noiseFilter, 0.5);
    const normalizedNoise = effectiveNoise * 0.1;
    const jitterFrequency = 1 + effectiveNoise * 3;

    const zkSyncPhase = Math.sin(time * 2.5) * 0.5 + 0.5;
    const oscillationStrength = Math.min(morphFactor * zkSyncPhase, 1.5);
    const baselineOpacity = 0.08 + sunriseOpacity * 0.12;

    for (let i = 0; i < MAX_NODES; i++) {
      const nodeId = nodeIds[i] ?? `NODE_${i}`;
      let data = nodeDataCache.get(nodeId);

      if (!data) {
        data = { veracityVelocity: 0, resonanceVelocity: 0, status: 'virtual' };
        nodeDataCache.set(nodeId, data);
      }

      const timeOffset = i * 0.008;
      const instanceTime = time + timeOffset;

      const spreadRadius = 3.5;
      const baseX = Math.sin(instanceTime * 0.08) * spreadRadius;
      const baseY = Math.cos(instanceTime * 0.12) * spreadRadius * 0.6;
      const baseZ = Math.sin(instanceTime * 0.05) * spreadRadius * 0.5;

      const pulseAlpha = 0.15 + 0.35 * Math.sin(instanceTime * 2 + i * 0.15);
      const oscillationX = Math.sin(instanceTime * 2.5 + i * 0.3) * oscillationStrength * 0.25;
      const oscillationY = Math.cos(instanceTime * 2.5 + i * 0.2) * oscillationStrength * 0.2;
      const oscillationZ = Math.sin(instanceTime * 2.5 + i * 0.4) * oscillationStrength * 0.15;

      const jitterX = Math.sin(instanceTime * jitterFrequency + i * 0.7) * normalizedNoise * Math.min(delta, 0.05) * 50;
      const jitterY = Math.cos(instanceTime * jitterFrequency * 1.3 + i * 0.5) * normalizedNoise * Math.min(delta, 0.05) * 50;
      const jitterZ = Math.sin(instanceTime * jitterFrequency * 0.8 + i * 0.9) * normalizedNoise * Math.min(delta, 0.05) * 50;

      const jitterMagnitude = Math.sqrt(jitterX * jitterX + jitterY * jitterY + jitterZ * jitterZ);
      const clampedJitterMag = Math.min(jitterMagnitude, noiseClampLimit);
      const jitterScale = jitterMagnitude > 0.001 ? clampedJitterMag / jitterMagnitude : 0;
      const clampedJitterX = jitterX * jitterScale;
      const clampedJitterY = jitterY * jitterScale;
      const clampedJitterZ = jitterZ * jitterScale;

      if (morphFactor > 0.1 && i % 3 === 0) {
        const spiralAngle = (i / Math.max(1, nodeCount)) * Math.PI * 4;
        const spiralRadius = 1.2 * morphFactor;
        const px = baseX + Math.cos(spiralAngle) * spiralRadius * morphFactor + clampedJitterX + oscillationX;
        const py = baseY + spiralAngle * 0.08 * morphFactor + clampedJitterY + oscillationY;
        const pz = baseZ + Math.sin(spiralAngle) * spiralRadius * morphFactor + clampedJitterZ + oscillationZ;
        if (isFinite(px) && isFinite(py) && isFinite(pz)) {
          dummy.position.set(px, py, pz);
        }
      } else {
        const px = baseX + clampedJitterX + oscillationX;
        const py = baseY + clampedJitterY + oscillationY;
        const pz = baseZ + clampedJitterZ + oscillationZ;
        if (isFinite(px) && isFinite(py) && isFinite(pz)) {
          dummy.position.set(px, py, pz);
        }
      }

      const rotX = instanceTime * (0.08 + data.veracityVelocity * 0.01) * (1 - morphFactor);
      const rotY = instanceTime * (0.08 + data.resonanceVelocity * 0.005) * (1 - morphFactor);
      const rotZ = Math.sin(instanceTime * 0.4 + i) * 0.15 * (1 + data.veracityVelocity) * (1 - morphFactor);
      dummy.rotation.x = isFinite(rotX) ? rotX : 0;
      dummy.rotation.y = isFinite(rotY) ? rotY : 0;
      dummy.rotation.z = isFinite(rotZ) ? rotZ : 0;

      const threadScale = 0.2 + data.veracityVelocity * 0.001;
      const fractalScale = morphFactor * 0.4;
      const scale = THREE.MathUtils.lerp(threadScale, fractalScale, morphFactor);
      dummy.scale.setScalar(Math.min(isFinite(scale) ? scale : 0.2, 0.6));
      dummy.updateMatrix();
      if (isNaN(dummy.matrix.elements[0])) continue;
      mesh.setMatrixAt(i, dummy.matrix);

      let color = DORMANT;
      const shimmerBase = Math.sin(instanceTime * 2.5 + i) * 0.3 + 0.7;
      const shimmer = shimmerBase * oscillationStrength + shimmerBase * 0.3;

      const dvFactor = THREE.MathUtils.clamp(data.veracityVelocity * 100, 0, 1);

      if (morphFactor > 0.7) {
        const veracityColor = GOLD.clone().lerp(ELECTRIC_BLUE, dvFactor);
        const constructionGlow = veracityColor.clone().lerp(ROSE, morphFactor * 0.3);
        color = constructionGlow.clone().multiplyScalar(shimmer);
      } else if (morphFactor > 0.3) {
        const veracityColor = AMBER.clone().lerp(ELECTRIC_BLUE, dvFactor * 0.5);
        color = veracityColor.clone().lerp(ROSE, (morphFactor - 0.3) * 2).multiplyScalar(shimmer);
      } else {
        const veracityColor = DORMANT.clone().lerp(ELECTRIC_BLUE, dvFactor * 0.3);
        color = veracityColor.clone().multiplyScalar(shimmer);
      }

      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
      const finalOpacity = baselineOpacity + pulseAlpha * morphFactor;
      opacityArray[i] = Math.max(0.1, Math.min(0.6, finalOpacity));
    }

    for (let i = nodeCount; i < MAX_NODES; i++) {
      dummy.position.set(0, 0, -1000);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      if (isNaN(dummy.matrix.elements[0])) continue;
      mesh.setMatrixAt(i, dummy.matrix);
      opacityArray[i] = 0;
    }

    mesh.instanceMatrix.needsUpdate = true;

    const colorAttr = geometry.attributes.color;
    if (colorAttr) {
      colorAttr.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[threadGeometry, undefined, MAX_NODES]} frustumCulled={false}>
        <meshStandardMaterial
          vertexColors
          roughness={0.1}
          metalness={0.95}
          emissive={flux > 0.5 ? GOLD : AMBER}
          emissiveIntensity={0.2 + flux * 0.4}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      {false && isMorphing && flux > 0.3 && (
        <mesh ref={fractalMeshRef} geometry={sierpinskiGeometry}>
          <meshStandardMaterial
            color={ROSE}
            emissive={GOLD}
            emissiveIntensity={flux * 0.5}
            wireframe
            transparent
            opacity={Math.max(0.08, Math.min(0.2, flux * 0.2 + sunriseOpacity * 0.1))}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </>
  );
}

interface ResonanceTrajectoryProps {
  nodeId?: string;
}

function SceneController({ nodeId }: { nodeId?: string }) {
  const storeNodeIds = useNodeStore((s) => s.nodeIds);
  const nodeIds = storeNodeIds.length > 0 ? storeNodeIds : (nodeId ? [nodeId] : []);
  const flux = useNodeStore((s) => s.flux);

  return <SceneContent nodeIds={nodeIds} flux={flux} />;
}

export function ResonanceTrajectory({ nodeId }: ResonanceTrajectoryProps) {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div className="relative w-full h-full">
      <Canvas>
        <ambientLight intensity={sunriseOpacity * 0.15} />
        <pointLight position={[10, 10, 10]} intensity={sunriseOpacity * 0.6} color="#FB923C" />
        <pointLight position={[-10, -10, -10]} intensity={sunriseOpacity * 0.3} color="#F43F5E" />
        <SceneController nodeId={nodeId} />
      </Canvas>
    </div>
  );
}