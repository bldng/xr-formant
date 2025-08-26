import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef } from "react";
import * as THREE from "three";

// XR Visual Filter component - for blur/glass effects since postprocessing doesn't work in XR
export function XRVisualFilter() {
  const { gl } = useThree();
  const boxRef = useRef<THREE.Mesh>(null);

  const { glasses } = useControls({ glasses: { value: true } });

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
        <>
          <mesh position={[0, 0.5, -1]} scale={[15, 15, 5]}>
            <sphereGeometry args={[0.2]} />
            <meshPhysicalMaterial
              transmission={1}
              thickness={1.5}
              roughness={0.5}
              ior={1.5}
              anisotropy={0.15}
              transparent={true}
              opacity={0.8}
              color="#88ccff"
            />
          </mesh>
        </>
      )}
    </group>
  );
}
