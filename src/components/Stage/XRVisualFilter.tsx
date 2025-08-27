import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef } from "react";
import * as THREE from "three";

// XR Visual Filter component - for blur/glass effects since postprocessing doesn't work in XR
export function XRVisualFilter() {
  const { gl } = useThree();
  const boxRef = useRef<THREE.Mesh>(null);

  const { glasses, vignetteIntensity } = useControls({
    glasses: { value: true },
    vignetteIntensity: { value: 50, min: 0, max: 100, step: 1 },
  });

  useFrame(() => {
    if (boxRef.current && gl.xr.isPresenting) {
      // Just add the box as child to the XR camera directly
      const xrCamera = gl.xr.getCamera();
      if (xrCamera && boxRef.current.parent !== xrCamera) {
        xrCamera.add(boxRef.current);
        boxRef.current.position.set(0, 0, -1); // 1 unit in front in camera space
        boxRef.current.rotation.set(0, 0, 0);
      }
    }
  });

  // Only render in XR mode
  if (!gl.xr.isPresenting) return null;

  return (
    <group ref={boxRef}>
      <mesh scale={[0.3, 0.2, 0.05]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>

      {glasses && (
        <mesh position={[0, 0.5, -1]} scale={[15, 15, 5]}>
          <sphereGeometry args={[0.2]} />
          <meshPhysicalMaterial
            transmission={0.1}
            thickness={1.5}
            roughness={100.5}
            ior={1.5}
            anisotropy={0.15}
            transparent={true}
            opacity={0.8}
            color="#88ccff"
          />
        </mesh>
      )}

      {vignetteIntensity > 0 && (
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[4, 4]} />
          <shaderMaterial
            transparent={true}
            opacity={vignetteIntensity / 100.0}
            depthTest={false}
            depthWrite={false}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distance = length(vUv - center);
                float vignette = smoothstep(0.15, 0.7, distance);
                gl_FragColor = vec4(0.0, 0.0, 0.0, vignette);
              }
            `}
          />
        </mesh>
      )}
    </group>
  );
}
