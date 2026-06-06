'use client';

import { Component, Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Box } from 'lucide-react';
import * as THREE from 'three';

interface ModelViewerProps {
  src: string;
  className?: string;
  format?: 'gltf' | 'secure';
}

type SecureGeometryData = {
  type: 'SecureGeometry';
  positions: number[];
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

class ModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (previousProps.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return <ViewerPlaceholder label="3D önizleme yüklenemedi" />;
    }

    return this.props.children;
  }
}

function ViewerPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-emerald-50 text-center text-sm text-slate-500">
      <Box className="mb-2 h-8 w-8 text-slate-400" />
      {label}
    </div>
  );
}

function GLTFModel({ src }: { src: string }) {
  const gltf = useGLTF(src);

  useEffect(() => {
    return () => {
      useGLTF.clear(src);
    };
  }, [src]);

  return (
    <Bounds fit clip observe margin={1.25}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </Bounds>
  );
}

function SecureGeometryModel({ src }: { src: string }) {
  const [data, setData] = useState<SecureGeometryData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await fetch(src);
      if (!response.ok) throw new Error('Secure geometry could not be loaded.');
      const json = (await response.json()) as SecureGeometryData;
      if (!cancelled) setData(json);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const geometry = useMemo(() => {
    if (!data?.positions?.length) return null;
    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    nextGeometry.computeVertexNormals();
    nextGeometry.center();
    return nextGeometry;
  }, [data]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!geometry) return null;

  return (
    <Bounds fit clip observe margin={1.25}>
      <Center>
        <mesh geometry={geometry}>
          <meshStandardMaterial color="#d1d5db" roughness={0.55} metalness={0.08} />
        </mesh>
      </Center>
    </Bounds>
  );
}

export default function ModelViewer({ src, className, format = 'gltf' }: ModelViewerProps) {
  return (
    <div className={className ?? 'relative h-full w-full'}>
      <ModelErrorBoundary key={src}>
        <Suspense fallback={<ViewerPlaceholder label="3D önizleme yükleniyor..." />}>
          <Canvas camera={{ position: [2.4, 1.8, 2.4], fov: 42 }} dpr={[1, 2]} shadows>
            <ambientLight intensity={0.8} />
            <directionalLight position={[3, 4, 5]} intensity={1.8} castShadow />
            {format === 'secure' ? <SecureGeometryModel src={src} /> : <GLTFModel src={src} />}
            <Environment preset="city" />
            <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={8} />
          </Canvas>
        </Suspense>
      </ModelErrorBoundary>
    </div>
  );
}
