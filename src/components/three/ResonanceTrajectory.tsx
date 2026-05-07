import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNodeStore } from '../../state/stores/nodeStore';
import { useHUDStore } from '../../state/stores/hudStore';
import { fetchRTSW } from '../../services/apiService';

const MAX_NODES = 100;
const GOLD = new THREE.Color('#FFD700');
const ELECTRIC_BLUE = new THREE.Color('#00D4FF');
const DORMANT = new THREE.Color('#111111');

function createSoftCircleTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const softCircleTexture = createSoftCircleTexture();
const planeGeo = new THREE.PlaneGeometry(0.3, 0.3);

const DEFAULT_RTSW = {
  speed: 400,
  density: 10,
  temperature: 100000,
  bx: 0, by: 0, bz: 0, bt: 5,
};

function calculatePath(t: number, alpha: number, bFreq: number): { x: number; y: number; z: number } {
  const a = 13;
  const c = 13 + alpha * 11;
  return {
    x: Math.sin(a * t) * 4,
    y: Math.cos(bFreq * t) * 4,
    z: Math.sin(c * t) * 4,
  };
}

function SceneContent() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const fluxRef = useRef(0.130);
  const smoothedFlux = useRef(0.130);
  const lastInit = useRef(false);
  const rtswRef = useRef(DEFAULT_RTSW);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRTSW().then((data) => {
        if (data) rtswRef.current = data;
      });
    }, 10000);
    fetchRTSW().then((data) => { if (data) rtswRef.current = data; });
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.getElapsedTime();
    const delta = state.clock.getDelta();
    if (delta > 0.1 || !isFinite(delta)) return;

    if (!lastInit.current) {
      for (let i = 0; i < MAX_NODES; i++) {
        mesh.setColorAt(i, GOLD);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      lastInit.current = true;
    }

    const { nodeIds: storeIds, nodes, flux } = useNodeStore.getState();
    if (!storeIds || storeIds.length === 0) return;

    fluxRef.current = Math.min(flux, 0.95);
    smoothedFlux.current = THREE.MathUtils.lerp(smoothedFlux.current, fluxRef.current, 0.05);

    const alpha = THREE.MathUtils.clamp(smoothedFlux.current, 0, 1);
    if (!isFinite(alpha)) return;

    const rtsw = rtswRef.current;
    const speedNorm = Math.min(rtsw.speed / 700, 1);
    const tempNorm = Math.min(rtsw.temperature / 200000, 1);
    const bNorm = Math.min(rtsw.bt / 15, 1);

    const bFreq = 17 + alpha * 17 + bNorm * 30;
    const emissiveIntensity = 50 + tempNorm * 150;

    if (matRef.current) {
      matRef.current.emissiveIntensity = emissiveIntensity;
    }

    const count = Math.min(storeIds.length, MAX_NODES);

    for (let i = 0; i < count; i++) {
      const nodeId = storeIds[i];
      const nodeData = nodeId ? nodes[nodeId] : undefined;
      const veracityVelocity = nodeData?.veracityVelocity ?? 0;
      const nodeMass = 0.5 + ((i % 10) / 10) * (rtsw.density / 20);

      const tOffset = i * 0.002 + veracityVelocity * 0.05;
      const speedMultiplier = nodeMass * (0.5 + speedNorm * 0.5);
      const pos = calculatePath(time * speedMultiplier + tOffset, alpha, bFreq);

      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.quaternion.copy(state.camera.quaternion);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      if (isNaN(dummy.matrix.elements[0])) continue;
      mesh.setMatrixAt(i, dummy.matrix);

      const pinch = Math.cos(time * 1.5);
      dummy.position.multiplyScalar(pinch);
      dummy.updateMatrix();
      if (isNaN(dummy.matrix.elements[0])) continue;
      mesh.setMatrixAt(i, dummy.matrix);

      const dvFactor = THREE.MathUtils.clamp(veracityVelocity * 10 + (i / MAX_NODES) * alpha, 0, 1);
      tempColor.copy(GOLD).lerp(ELECTRIC_BLUE, dvFactor);
      if (mesh.setColorAt) mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);
  const materialOpacity = 0.3 + sunriseOpacity * 0.1;

  return (
    <instancedMesh ref={meshRef} args={[planeGeo, undefined, MAX_NODES]} frustumCulled={false}>
      <meshStandardMaterial
        ref={matRef}
        color="#FFD700"
        emissive="#FF8C00"
        emissiveIntensity={100}
        transparent
        opacity={materialOpacity}
        alphaMap={softCircleTexture}
        blending={THREE.AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export function ResonanceTrajectory() {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div className="relative w-full h-full">
      <Canvas gl={{ toneMapping: THREE.NoToneMapping, outputColorSpace: 'srgb' }}>
        <ambientLight intensity={sunriseOpacity * 0.15} />
        <pointLight position={[10, 10, 10]} intensity={sunriseOpacity * 0.6} color="#FB923C" />
        <pointLight position={[-10, -10, -10]} intensity={sunriseOpacity * 0.3} color="#F43F5E" />
        <SceneContent />
      </Canvas>
    </div>
  );
}
