import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { useRef, useState } from "react";
import * as THREE from "three";

type Controls =
  | "forward"
  | "back"
  | "left"
  | "right"
  | "grow"
  | "shrink"
  | "rotateLeft"
  | "rotateRight"
  | "jump"
  | "squeeze";

export function Player() {
  const playerRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [, get] = useKeyboardControls<Controls>();
  const [scale, setScale] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [isGrounded, setIsGrounded] = useState(true);

  useFrame(() => {
    if (!playerRef.current) return;

    const {
      forward,
      back,
      left,
      right,
      grow,
      shrink,
      rotateLeft,
      rotateRight,
      jump,
      squeeze,
    } = get();

    // Handle rotation
    const rotationSpeed = 0.05;
    if (rotateLeft) {
      setRotation(rotation + rotationSpeed);
    }
    if (rotateRight) {
      setRotation(rotation - rotationSpeed);
    }

    // Check if player is grounded (simple check based on Y velocity)
    const currentVelocity = playerRef.current.linvel();
    const isCurrentlyGrounded = Math.abs(currentVelocity.y) < 0.1;
    setIsGrounded(isCurrentlyGrounded);

    // Handle movement relative to player's rotation
    const velocity: { x: number; y: number; z: number } = {
      x: 0,
      y: currentVelocity.y, // Preserve Y velocity for gravity/jumping
      z: 0,
    };
    const moveSpeed = 5;

    // Handle jumping (improved for stair climbing)
    if (jump && isGrounded) {
      velocity.y = 6; // Increased jump force for better stair climbing
    }

    // Calculate forward/backward movement based on rotation
    if (forward) {
      velocity.x -= Math.sin(rotation) * moveSpeed;
      velocity.z -= Math.cos(rotation) * moveSpeed;
    }
    if (back) {
      velocity.x += Math.sin(rotation) * moveSpeed;
      velocity.z += Math.cos(rotation) * moveSpeed;
    }

    // Calculate left/right strafe movement based on rotation
    if (left) {
      velocity.x -= Math.cos(rotation) * moveSpeed;
      velocity.z += Math.sin(rotation) * moveSpeed;
    }
    if (right) {
      velocity.x += Math.cos(rotation) * moveSpeed;
      velocity.z -= Math.sin(rotation) * moveSpeed;
    }

    // Apply velocity - use squeeze mode if modifier is held
    if (squeeze && (forward || back || left || right)) {
      // Squeeze mode: Apply movement directly to position (but not falling through the floor)
      const currentPos = playerRef.current.translation();
      const deltaTime = 0.016; // Approximate 60fps frame time
      playerRef.current.setTranslation(
        {
          x: currentPos.x + velocity.x * deltaTime,
          y: currentPos.y, // NO TOUCHING!!
          z: currentPos.z + velocity.z * deltaTime,
        },
        true
      );
    } else {
      // Normal physics-respecting movement
      playerRef.current.setLinvel(velocity, true);
    }

    // Apply rotation to the rigid body using proper quaternion
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    playerRef.current.setRotation(
      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
      true
    );

    // Handle scaling
    const scaleSpeed = 0.01;
    const minScale = 0.3;
    const maxScale = 3.0;

    if (grow && scale < maxScale) {
      const newScale = Math.min(scale + scaleSpeed, maxScale);
      setScale(newScale);

      // Dynamically adjust rigid body position to keep bottom at ground
      const currentPos = playerRef.current.translation();
      playerRef.current.setTranslation(
        {
          x: currentPos.x,
          y: newScale * 0.9, // Slightly lower to account for capsule shape
          z: currentPos.z,
        },
        true
      );
    }

    if (shrink && scale > minScale) {
      const newScale = Math.max(scale - scaleSpeed, minScale);
      setScale(newScale);

      // Dynamically adjust rigid body position to keep bottom at ground
      const currentPos = playerRef.current.translation();
      playerRef.current.setTranslation(
        {
          x: currentPos.x,
          y: newScale * 0.9, // Slightly lower to account for capsule shape
          z: currentPos.z,
        },
        true
      );
    }
  });

  return (
    <RigidBody
      ref={playerRef}
      type="dynamic"
      position={[0, 0.9 * 0.5, 0]} // Initial position based on initial scale
      lockRotations={true}
    >
      {/* Capsule collider that matches the box mesh dimensions */}
      <CapsuleCollider args={[0.9 * scale, 0.5 * scale]} />
      <mesh ref={meshRef} name="player" scale={scale}>
        <boxGeometry args={[1, 2, 1]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </RigidBody>
  );
}
