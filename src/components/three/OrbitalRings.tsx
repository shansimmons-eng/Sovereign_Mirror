import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConcentricRingProps {
  inverionAlpha: number;
  temperature: number;
  ecoHealth: number;
}

interface RingLayer {
  inner: number;
  outer: number;
  color: string;
  speed: number;
  spokeCount: number;
  spokeSpeed: number;
  z: number;
}

const RING_LAYERS: RingLayer[] = [
  { inner: 3.6, outer: 3.85, color: '#FF8F00', speed: 0.12, spokeCount: 24, spokeSpeed: 0.04, z: 0.0 },
  { inner: 2.9, outer: 3.0,  color: '#FFB300', speed: -0.20, spokeCount: 16, spokeSpeed: 0.06, z: 0.01 },
  { inner: 2.1, outer: 2.25, color: '#FFD700', speed: 0.30, spokeCount: 12, spokeSpeed: 0.08, z: 0.02 },
  { inner: 1.4, outer: 1.55, color: '#FFB300', speed: -0.45, spokeCount: 8,  spokeSpeed: 0.10, z: 0.03 },
  { inner: 0.8, outer: 0.88, color: '#FFD700', speed: 0.65, spokeCount: 6,  spokeSpeed: 0.12, z: 0.04 },
];

const PARTICLE_COUNT_PER_RING = 32;

const ECO_COLOR_STRESSED = new THREE.Color('#c0392b');
const ECO_COLOR_NEUTRAL  = new THREE.Color('#FF8F00');
const ECO_COLOR_HEALTHY  = new THREE.Color('#7fba6a');

function ecoRingColor(health: number): THREE.Color {
  const c = new THREE.Color();
  if (health >= 0.5) {
    c.lerpColors(ECO_COLOR_NEUTRAL, ECO_COLOR_HEALTHY, (health - 0.5) * 2);
  } else {
    c.lerpColors(ECO_COLOR_STRESSED, ECO_COLOR_NEUTRAL, health * 2);
  }
  return c;
}

export function ConcentricRings({ inverionAlpha, temperature, ecoHealth }: ConcentricRingProps) {
  const ringRefs = useRef<(THREE.Group | null)[]>([]);
  const spokeRefs = useRef<(THREE.Group | null)[]>([]);
  const barbellRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Group>(null!);
  const discRef = useRef<THREE.Group>(null!);
  const discMarkRef = useRef<THREE.Mesh>(null!);
  const reticleRef = useRef<THREE.Group>(null!);
  const wireSphereRef = useRef<THREE.Mesh>(null!);
  const pulseRingRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const particleRefs = useRef<(THREE.Mesh | null)[]>([]);

  const timeRef = useRef(0);

  // Build particle positions along the outermost ring
  const particleData = useMemo(() => {
    return RING_LAYERS.map((ring) => {
      const positions: Array<{ x: number; y: number; angle: number; speed: number }> = [];
      for (let i = 0; i < PARTICLE_COUNT_PER_RING; i++) {
        const angle = (i / PARTICLE_COUNT_PER_RING) * Math.PI * 2;
        const r = (ring.inner + ring.outer) / 2;
        positions.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          angle,
          speed: ring.speed * (0.6 + Math.random() * 0.8),
        });
      }
      return positions;
    });
  }, []);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    const t = timeRef.current;

    // Each ring layer rotates at its own speed (alternating direction)
    // Outermost ring (index 0) shifts color with ecoHealth
    const outerColor = ecoRingColor(ecoHealth);
    RING_LAYERS.forEach((ring, i) => {
      if (ringRefs.current[i]) {
        ringRefs.current[i]!.rotation.z = t * ring.speed;
        if (i === 0) {
          ringRefs.current[i]!.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
              if (mat?.color) mat.color.copy(outerColor);
            }
          });
        }
      }
      if (spokeRefs.current[i]) {
        spokeRefs.current[i]!.rotation.z = t * ring.spokeSpeed;
      }
    });

    // Particles drift along their rings
    particleRefs.current.forEach((mesh, globalIdx) => {
      if (!mesh) return;
      const layerIdx = Math.floor(globalIdx / PARTICLE_COUNT_PER_RING);
      const particleIdx = globalIdx % PARTICLE_COUNT_PER_RING;
      const data = particleData[layerIdx]?.[particleIdx];
      if (!data) return;
      const ring = RING_LAYERS[layerIdx];
      const newAngle = data.angle + t * data.speed;
      const r = (ring.inner + ring.outer) / 2;
      mesh.position.x = Math.cos(newAngle) * r;
      mesh.position.y = Math.sin(newAngle) * r;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5 + Math.sin(t * 2 + globalIdx * 0.3) * 0.3;
    });

    if (coreRef.current) {
      const breathe = 1 + Math.sin(t * 2) * 0.12;
      coreRef.current.scale.setScalar(breathe);
    }
    if (barbellRef.current) {
      barbellRef.current.rotation.z = t * 0.03;
    }
    if (discRef.current) {
      discRef.current.rotation.z = t * 0.85;
    }
    if (discMarkRef.current) {
      const material = discMarkRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 + Math.sin(t * 3) * 0.25;
    }
    if (reticleRef.current) {
      reticleRef.current.rotation.z = t * 0.25;
    }
    if (wireSphereRef.current) {
      wireSphereRef.current.rotation.y = t * 0.08;
      wireSphereRef.current.rotation.x = t * 0.05;
    }
    if (pulseRingRef.current) {
      const pulse = 0.85 + Math.sin(t * 1.5) * 0.15;
      pulseRingRef.current.scale.setScalar(pulse);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(t * 1.5) * 0.15;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.18 + Math.sin(t * 0.8) * 0.05;
    }
  });

  const isDecayed = inverionAlpha < 0.22;
  const baseOpacity = Math.max(0.4, 0.6 + temperature * 0.3);
  const coreBrightness = isDecayed ? 0.4 + (inverionAlpha / 0.22) * 0.4 : 0.7 + inverionAlpha * 0.4;
  const strandIntensity = isDecayed ? (1 - inverionAlpha / 0.22) : 0;
  const showBarbell = strandIntensity > 0.5;

  const lobeRadius = 0.6;
  const lobeDistance = 2.8;
  const strandRadius = 0.04;

  // Build spoke geometry for a ring
  const renderSpokes = (count: number, radius: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const isMajor = i % 4 === 0;
      return (
        <mesh key={i} position={[x, y, 0]}>
          <boxGeometry args={[isMajor ? 0.04 : 0.02, isMajor ? 0.18 : 0.10, 0.01]} />
          <meshBasicMaterial
            color={isMajor ? '#FFFFFF' : '#FFB300'}
            transparent
            opacity={isMajor ? 0.7 : 0.5}
          />
        </mesh>
      );
    });
  };

  return (
    <group position={[0, 0, 0]}>
      {/* Wireframe outer sphere - subtle, rotates on Y axis per design spec */}
      <mesh ref={wireSphereRef}>
        <sphereGeometry args={[4.2, 24, 16]} />
        <meshBasicMaterial
          color="#FFB300"
          wireframe
          transparent
          opacity={isDecayed ? 0.08 : 0.12}
        />
      </mesh>

      {/* Outer glow ring - radial gradient via larger transparent ring */}
      <mesh ref={glowRef}>
        <ringGeometry args={[3.4, 4.1, 96]} />
        <meshBasicMaterial
          color={isDecayed ? '#FF6B35' : '#FFB300'}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Pulse ring - breathes outward */}
      <mesh ref={pulseRingRef}>
        <ringGeometry args={[2.6, 2.7, 96]} />
        <meshBasicMaterial
          color={isDecayed ? '#FF6B35' : '#FFD700'}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main concentric rings with spokes and particles */}
      {RING_LAYERS.map((ring, i) => (
        <group key={i}>
          {/* Ring body */}
          <group ref={(el) => { ringRefs.current[i] = el; }}>
            <mesh>
              <ringGeometry args={[ring.inner, ring.outer, 128]} />
              <meshBasicMaterial
                color={ring.color}
                transparent
                opacity={showBarbell ? baseOpacity * 0.2 : baseOpacity * (0.85 - i * 0.1)}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
          {/* Inner thin tracer line for definition */}
          <mesh>
            <ringGeometry args={[ring.inner - 0.04, ring.inner, 128]} />
            <meshBasicMaterial
              color={isDecayed ? '#FF4500' : '#FFD700'}
              transparent
              opacity={showBarbell ? 0.2 : 0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry args={[ring.outer, ring.outer + 0.04, 128]} />
            <meshBasicMaterial
              color={isDecayed ? '#FF4500' : '#FFD700'}
              transparent
              opacity={showBarbell ? 0.2 : 0.45}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Spokes - rotate at spokeSpeed */}
          <group ref={(el) => { spokeRefs.current[i] = el; }}>
            {renderSpokes(ring.spokeCount, (ring.inner + ring.outer) / 2)}
          </group>
          {/* Particles along the ring */}
          {particleData[i].map((_, pIdx) => (
            <mesh
              key={pIdx}
              ref={(el) => { particleRefs.current[i * PARTICLE_COUNT_PER_RING + pIdx] = el; }}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Rotating crosshair/reticle - 4 spokes at cardinal directions */}
      <group ref={reticleRef}>
        <mesh position={[1.0, 0, 0]}>
          <boxGeometry args={[0.5, 0.02, 0.01]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={0.6} />
        </mesh>
        <mesh position={[-1.0, 0, 0]}>
          <boxGeometry args={[0.5, 0.02, 0.01]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[0.02, 0.5, 0.01]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, -1.0, 0]}>
          <boxGeometry args={[0.02, 0.5, 0.01]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Barbell lobes - visible when alpha is very low (strands state) */}
      <group ref={barbellRef} visible={showBarbell}>
        <mesh position={[-lobeDistance, 0, 0]}>
          <sphereGeometry args={[lobeRadius, 32, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={strandIntensity * 0.85} />
        </mesh>
        <mesh position={[lobeDistance, 0, 0]}>
          <sphereGeometry args={[lobeRadius, 32, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={strandIntensity * 0.85} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[strandRadius, strandRadius, lobeDistance * 2 + lobeRadius * 2, 16]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={strandIntensity * 0.5} />
        </mesh>
        {showBarbell && Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[-(lobeDistance - lobeRadius) + i * (lobeDistance * 2 / 4) - lobeDistance + lobeRadius, 0, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={strandIntensity * 0.6} />
          </mesh>
        ))}
      </group>

      {/* Central core - always visible */}
      <group ref={coreRef}>
        <mesh>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial
            color={isDecayed ? '#FFD700' : '#FFFFFF'}
            transparent
            opacity={coreBrightness}
          />
        </mesh>
        <mesh>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial
            color={isDecayed ? '#FFD700' : '#FFFFFF'}
            transparent
            opacity={coreBrightness * 0.3}
          />
        </mesh>
      </group>

      {/* Spinning disc with pulse markers */}
      <group ref={discRef}>
        <mesh>
          <ringGeometry args={[1.05, 1.2, 96]} />
          <meshBasicMaterial
            color={isDecayed ? '#FF6B35' : '#FFB300'}
            transparent
            opacity={isDecayed ? baseOpacity * 0.6 : baseOpacity * 0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={discMarkRef} position={[1.125, 0, 0.01]}>
          <boxGeometry args={[0.05, 0.22, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
        </mesh>
        <mesh position={[-1.125, 0, 0.01]}>
          <boxGeometry args={[0.05, 0.22, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}
