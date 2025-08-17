import { useFrame, useThree } from "@react-three/fiber";
import { XROrigin, useXRStore } from "@react-three/xr";
import { useRef } from "react";
import * as THREE from "three";

export function XRCameraRig() {
  const store = useXRStore();
  const { scene } = useThree();
  const originRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const session = store.getState().session;
    if (!session || !originRef.current) return;

    // Find the player in the scene
    const player = scene.getObjectByName("player");
    if (player) {
      // Get player's world position and rotation
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();

      player.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      // Update XR Origin position to follow player (at ground level)
      originRef.current.position.set(
        worldPosition.x, 
        worldPosition.y - 1.4, // Offset to ground level since player center is at 1.4
        worldPosition.z
      );
      
      // Update XR Origin rotation to match player rotation
      originRef.current.quaternion.copy(worldQuaternion);
      
      // Update XR Origin scale for embodied height experience
      originRef.current.scale.setScalar(worldScale.y);
    }
  });

  return <XROrigin ref={originRef} />;
}