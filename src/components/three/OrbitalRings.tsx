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
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.1;
      crosshairRef.current.scale.setScalar(pulse);
    }
  });

  const baseOpacity = 0.6 + temperature * 0.35;
  const haloOpacity = 0.5 + inverionAlpha * 0.4;

  return (
    <group position={[0, 0, 0]}>
      {/* Outer glow halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[7.5, 8.5, 128]} />
        <meshBasicMaterial color="#FFD79B" transparent opacity={haloOpacity * 0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Outer ring group - large sweeping rings */}
      <group ref={outerRingRef}>
        <OrbitalRing radius={7.0} opacity={haloOpacity * 0.4} color="#FFD79B" rotationSpeed={0} thickness={0.008} />
        <OrbitalRing radius={6.5} opacity={baseOpacity * 0.25} color="#FFB300" rotationSpeed={0} thickness={0.005} />
      </group>

      {/* Middle ring group */}
      <group ref={middleRingRef}>
        <OrbitalRing radius={5.0} opacity={baseOpacity * 0.5} color="#FFB300" rotationSpeed={0} thickness={0.007} />
        <OrbitalRing radius={4.5} opacity={baseOpacity * 0.3} color="#FF8F00" rotationSpeed={0} thickness={0.004} />
      </group>

      {/* Inner ring group */}
      <group ref={innerRingRef}>
        <OrbitalRing radius={3.2} opacity={baseOpacity * 0.7} color="#FF8F00" rotationSpeed={0} thickness={0.006} />
        <OrbitalRing radius={2.8} opacity={baseOpacity * 0.35} color="#FFB300" rotationSpeed={0} thickness={0.004} />
      </group>

      {/* Central crosshair - prominent center marker */}
      <group ref={crosshairRef}>
        {/* Outer crosshair ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.42, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.6 + inverionAlpha * 0.35} side={THREE.DoubleSide} />
        </mesh>
        {/* Inner crosshair ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.4 + inverionAlpha * 0.3} side={THREE.DoubleSide} />
        </mesh>
        {/* Horizontal line */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.0, 0.012]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.8} />
        </mesh>
        {/* Vertical line */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.012, 3.0]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.8} />
        </mesh>
        {/* Center dot */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  );
}