import { Hud, OrthographicCamera, useFBO } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

// PIP Window Component - renders player camera feed in a HUD overlay
export function CameraHUD() {
  const playerCameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const { gl, scene, size } = useThree();

  // Create an FBO for the camera feed with higher resolution
  const fbo = useFBO(512, 512);

  useFrame(() => {
    if (!playerCameraRef.current) return;

    // Find the player in the main scene
    const player = scene.getObjectByName("player");
    if (player) {
      // Get the world position and rotation of the player mesh
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();

      player.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      // Position camera at player's eye level (scaled with player size)
      const eyeHeight = 0.8 * worldScale.y; // Scale eye height with player size
      playerCameraRef.current.position.copy(worldPosition);
      playerCameraRef.current.position.y += eyeHeight;

      // Get the forward direction from the player's rotation
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(worldQuaternion);

      // Look forward from the player's position
      const lookAtTarget = new THREE.Vector3().copy(worldPosition);
      lookAtTarget.y += eyeHeight;
      lookAtTarget.add(forward.multiplyScalar(5));

      playerCameraRef.current.lookAt(lookAtTarget);
    } else {
      // Fallback position if player not found
      playerCameraRef.current.position.set(0, 1.5, 0);
      playerCameraRef.current.lookAt(0, 1.5, -5);
    }

    // Render the scene from the player's camera to the FBO
    const currentRenderTarget = gl.getRenderTarget();
    const currentAutoClear = gl.autoClear;
    gl.autoClear = true;

    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(scene, playerCameraRef.current);
    gl.setRenderTarget(currentRenderTarget);

    gl.autoClear = currentAutoClear;
  });

  return (
    <>
      {/* Hidden camera that follows the player */}
      <perspectiveCamera
        ref={playerCameraRef}
        fov={75}
        aspect={1}
        near={0.1}
        far={1000}
        position={[0, 1.5, 0]}
      />

      {/* HUD Overlay with PIP window */}
      <Hud renderPriority={1}>
        <OrthographicCamera
          makeDefault
          position={[0, 0, 10]}
          left={-size.width / 2}
          right={size.width / 2}
          top={size.height / 2}
          bottom={-size.height / 2}
          near={0}
          far={20}
        />
        <PIPWindow fboTexture={fbo.texture} screenSize={size} />
      </Hud>
    </>
  );
}

// PIP Window rendered in HUD space
function PIPWindow({
  fboTexture,
  screenSize,
}: {
  fboTexture: THREE.Texture;
  screenSize: { width: number; height: number };
}) {
  // Calculate PIP window dimensions and position
  const MULTIPLIER = 3;
  const pipWidth = 200 * MULTIPLIER;
  const pipHeight = 150 * MULTIPLIER;
  const margin = 20;

  // Position in top-right corner (screen coordinates)
  const pipX = screenSize.width / 2 - pipWidth / 2 - margin;
  const pipY = screenSize.height / 2 - pipHeight / 2 - margin;

  return (
    <group>
      {/* PIP Window Background/Border */}
      <mesh position={[pipX, pipY, 0]}>
        <planeGeometry args={[pipWidth + 8, pipHeight + 8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.8} />
      </mesh>

      {/* Camera Feed */}
      <mesh position={[pipX, pipY, 1]}>
        <planeGeometry args={[pipWidth, pipHeight]} />
        <meshBasicMaterial map={fboTexture} />
      </mesh>

      {/* Crosshair */}
      <group position={[pipX, pipY, 2]}>
        {/* Horizontal line */}
        <mesh>
          <planeGeometry args={[20, 1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.8} />
        </mesh>
        {/* Vertical line */}
        <mesh>
          <planeGeometry args={[1, 20]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
