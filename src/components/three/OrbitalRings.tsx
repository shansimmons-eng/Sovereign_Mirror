import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbitalRingProps {
  radius: number;
  opacity: number;
  color?: string;
  rotationSpeed?: number;
  rotationDirection?: 1 | -1;
  thickness?: number;
}

function OrbitalRing({
  radius,
  opacity,
  color = '#FFB300',
  rotationSpeed = 1,
  rotationDirection = 1,
  thickness = 0.004
}: OrbitalRingProps) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    if (ringRef.current) {
      ringRef.current.rotation.z = timeRef.current * rotationSpeed * rotationDirection;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - thickness, radius + thickness, 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface ConcentricRingProps {
  inverionAlpha: number;
  temperature: number;
}

export function ConcentricRings({ inverionAlpha, temperature }: ConcentricRingProps) {
  const outerRingRef = useRef<THREE.Group>(null!);
  const middleRingRef = useRef<THREE.Group>(null!);
  const innerRingRef = useRef<THREE.Group>(null!);
  const crosshairRef = useRef<THREE.Group>(null!);

  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = timeRef.current * 0.05;
    }
    if (middleRingRef.current) {
      middleRingRef.current.rotation.z = -timeRef.current * 0.08;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = timeRef.current * 0.12;
    }
    if (crosshairRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.08;
      crosshairRef.current.scale.setScalar(pulse);
    }
  });

  const baseOpacity = 0.4 + temperature * 0.3;
  const haloOpacity = 0.25 + inverionAlpha * 0.35;

  return (
    <group>
      {/* Outer halo - large faint glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.8, 5.2, 128]} />
        <meshBasicMaterial color="#FFD79B" transparent opacity={haloOpacity * 0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer ring group */}
      <group ref={outerRingRef}>
        <OrbitalRing radius={4.5} opacity={haloOpacity * 0.5} color="#FFD79B" rotationSpeed={0} thickness={0.006} />
        <OrbitalRing radius={4.2} opacity={baseOpacity * 0.3} color="#FFB300" rotationSpeed={0} thickness={0.003} />
      </group>

      {/* Middle ring group */}
      <group ref={middleRingRef}>
        <OrbitalRing radius={3.5} opacity={baseOpacity * 0.6} color="#FFB300" rotationSpeed={0} thickness={0.005} />
        <OrbitalRing radius={3.2} opacity={baseOpacity * 0.35} color="#FF8F00" rotationSpeed={0} thickness={0.003} />
      </group>

      {/* Inner ring group */}
      <group ref={innerRingRef}>
        <OrbitalRing radius={2.4} opacity={baseOpacity * 0.8} color="#FF8F00" rotationSpeed={0} thickness={0.005} />
        <OrbitalRing radius={2.1} opacity={baseOpacity * 0.4} color="#FFB300" rotationSpeed={0} thickness={0.003} />
      </group>

      {/* Central crosshair */}
      <group ref={crosshairRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.24, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.5 + inverionAlpha * 0.4} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.8, 0.008]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.008, 1.8]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.6} />
        </mesh>
        {/* Inner crosshair ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.15, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.3 + inverionAlpha * 0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}