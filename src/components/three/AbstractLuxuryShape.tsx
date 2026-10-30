import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshDistortMaterial, Float } from '@react-three/drei';

interface AbstractLuxuryShapeProps {
  color?: string;
  size?: number;
}

export const AbstractLuxuryShape: React.FC<AbstractLuxuryShapeProps> = ({ 
  color = "#E5BC53",
  size = 1
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const { mouse } = useThree();

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock?.getElapsedTime() || (performance.now() / 1000);
    
    const targetX = (mouse?.x || 0) * 0.5;
    const targetY = (mouse?.y || 0) * 0.5;

    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, targetY + time * 0.2, 0.05);
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetX + time * 0.3, 0.05);
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh}>
        <octahedronGeometry args={[size, 0]} />
        <MeshDistortMaterial 
          color={color} 
          speed={2} 
          distort={0.4} 
          radius={1}
          transparent
          opacity={0.7}
          wireframe
        />
      </mesh>
    </Float>
  );
};

class ShapeErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export const LuxuryShapeCanvas: React.FC<AbstractLuxuryShapeProps> = (props) => {
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setCanRender(gl);
    } catch {
      setCanRender(false);
    }
  }, []);

  if (!canRender) {
    return null;
  }

  return (
    <ShapeErrorBoundary>
      <div className="w-64 h-64 pointer-events-none select-none">
        <Canvas 
          camera={{ position: [0, 0, 3] }} 
          gl={{ alpha: true, powerPreference: 'default' }}
          dpr={[1, 1.25]}
        >
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} color="#E5BC53" />
          <AbstractLuxuryShape {...props} />
        </Canvas>
      </div>
    </ShapeErrorBoundary>
  );
};

