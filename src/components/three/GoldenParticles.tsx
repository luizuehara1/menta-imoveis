import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface GoldenParticlesProps {
  count?: number;
  color?: string;
  size?: number;
  speed?: number;
}

export const GoldenParticles: React.FC<GoldenParticlesProps> = ({ 
  count = 60, 
  color = "#E5BC53", 
  size = 0.05,
  speed = 0.2
}) => {
  const mesh = useRef<THREE.Points>(null);
  const { mouse } = useThree();

  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      temp[i * 3 + 0] = (Math.random() - 0.5) * 10;
      temp[i * 3 + 1] = (Math.random() - 0.5) * 10;
      temp[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock?.getElapsedTime() || (performance.now() / 1000);
    
    // Parallax effect based on mouse
    const targetX = (mouse.x || 0) * 0.3;
    const targetY = (mouse.y || 0) * 0.3;
    
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetX + time * 0.05 * speed, 0.05);
    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, -targetY + time * 0.03 * speed, 0.05);
    
    const s = 1 + Math.sin(time * 0.5) * 0.05;
    mesh.current.scale.set(s, s, s);
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

