import { useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";
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
  | "jump";

export function CharacterPlayer() {
  const playerRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [, get] = useKeyboardControls<Controls>();
  const [scale, setScale] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [showDebug, setShowDebug] = useState(false);

  // Access Rapier world and API
  const { world, rapier } = useRapier();
  const characterControllerRef = useRef<InstanceType<
    typeof rapier.KinematicCharacterController
  > | null>(null);

  // Track velocity for gravity accumulation
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const jumpVelocity = 3;
  const isJumpingRef = useRef(false);

  // Get invalidate function for frameloop="demand"
  const { invalidate } = useThree();

  // Set up keyboard event listeners to invalidate on keypress
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key is one of our control keys
      const controlKeys = [
        "KeyW",
        "KeyS",
        "KeyA",
        "KeyD", // Movement
        "KeyQ",
        "KeyE",
        "ArrowLeft",
        "ArrowRight", // Rotation
        "ArrowUp",
        "ArrowDown", // Scaling
        "Space", // Jump
      ];

      if (controlKeys.includes(event.code)) {
        invalidate();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // Also invalidate on key release to ensure smooth transitions
      const controlKeys = [
        "KeyW",
        "KeyS",
        "KeyA",
        "KeyD",
        "KeyQ",
        "KeyE",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space",
      ];

      if (controlKeys.includes(event.code)) {
        invalidate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [invalidate]); // Initialize character controller
  useEffect(() => {
    if (world && rapier) {
      // Create character controller with optimal offset for stability
      const controller = world.createCharacterController(0.02);

      // Configure the character controller for better movement
      controller.enableAutostep(0.3, 0.1, true); // Enable auto-stepping over small obstacles
      controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180); // Allow climbing 50-degree slopes
      controller.setMinSlopeSlideAngle((35 * Math.PI) / 180); // Start sliding on slopes steeper than 35 degrees
      controller.enableSnapToGround(0.2); // Snap to ground if within 0.2 units
      controller.setApplyImpulsesToDynamicBodies(true); // Push dynamic bodies

      characterControllerRef.current = controller;

      return () => {
        if (controller) {
          world.removeCharacterController(controller);
        }
      };
    }
  }, [world, rapier]);

  useFrame((_, delta) => {
    if (!playerRef.current || !characterControllerRef.current) return;

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
    } = get();

    // Check if there's any input or movement that requires frame updates
    const hasInput =
      forward ||
      back ||
      left ||
      right ||
      grow ||
      shrink ||
      rotateLeft ||
      rotateRight ||
      jump;
    const isFalling = Math.abs(velocityRef.current.y) > 0.01;

    // Invalidate frame if there's any activity
    if (hasInput || isFalling) {
      invalidate();
    }

    // Handle rotation
    const rotationSpeed = 0.05;
    if (rotateLeft) {
      setRotation(rotation + rotationSpeed);
    }
    if (rotateRight) {
      setRotation(rotation - rotationSpeed);
    }

    // Apply rotation to the rigid body using proper quaternion
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    playerRef.current.setRotation(
      { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
      true
    );

    // Calculate horizontal movement based on input and rotation
    let movementX = 0;
    let movementZ = 0;
    const moveSpeed = 5;

    // Calculate forward/backward movement based on rotation
    if (forward) {
      movementX -= Math.sin(rotation) * moveSpeed;
      movementZ -= Math.cos(rotation) * moveSpeed;
    }
    if (back) {
      movementX += Math.sin(rotation) * moveSpeed;
      movementZ += Math.cos(rotation) * moveSpeed;
    }

    // Calculate left/right strafe movement based on rotation
    if (left) {
      movementX -= Math.cos(rotation) * moveSpeed;
      movementZ += Math.sin(rotation) * moveSpeed;
    }
    if (right) {
      movementX += Math.cos(rotation) * moveSpeed;
      movementZ -= Math.sin(rotation) * moveSpeed;
    }

    // Handle jumping
    if (jump && !isJumpingRef.current) {
      // Check if we're grounded before allowing jump
      const collider = world.getCollider(playerRef.current.handle);
      if (collider) {
        characterControllerRef.current.computeColliderMovement(
          collider,
          { x: 0, y: 0, z: 0 }
        );
        const isGrounded = characterControllerRef.current.computedGrounded();
        
        if (isGrounded) {
          velocityRef.current.y = jumpVelocity;
          isJumpingRef.current = true;
        }
      }
    }

    // Apply gravity to vertical velocity (accumulate over time)
    const gravity = -9.81;
    velocityRef.current.y += gravity * delta;

    // Reset horizontal velocity each frame (no momentum for horizontal movement)
    velocityRef.current.x = movementX;
    velocityRef.current.z = movementZ;

    // Create desired movement vector for this frame
    const desiredMovement = {
      x: velocityRef.current.x * delta,
      y: velocityRef.current.y * delta,
      z: velocityRef.current.z * delta,
    };

    // Get the collider associated with this rigid body
    const collider = world.getCollider(playerRef.current.handle);
    if (collider) {
      // Use character controller to compute safe movement
      characterControllerRef.current.computeColliderMovement(
        collider,
        desiredMovement
      );

      // Get the computed movement from the character controller
      const computedMovement =
        characterControllerRef.current.computedMovement();

      // Check if we're grounded (touching floor)
      const isGrounded = characterControllerRef.current.computedGrounded();

      // If grounded, reset vertical velocity and jump state
      if (isGrounded) {
        if (velocityRef.current.y <= 0) {
          velocityRef.current.y = 0;
          isJumpingRef.current = false;
        }
      }

      // For kinematicVelocity bodies, set the velocity directly
      // Convert the computed movement back to velocity (movement per second)
      const velocity = {
        x: computedMovement.x / delta,
        y: computedMovement.y / delta,
        z: computedMovement.z / delta,
      };

      playerRef.current.setLinvel(velocity, true);
    }

    // Handle scaling
    const scaleSpeed = 0.01;
    const minScale = 0.3;
    const maxScale = 3.0;

    if (grow && scale < maxScale) {
      const newScale = Math.min(scale + scaleSpeed, maxScale);
      setScale(newScale);
    }

    if (shrink && scale > minScale) {
      const newScale = Math.max(scale - scaleSpeed, minScale);
      setScale(newScale);
    }
    
    // Toggle debug view with 'G' key (can be added to keyboard controls later)
    // For now, enable debug by default for testing
    if (!showDebug) {
      setShowDebug(true);
    }
  });

  // Calculate camera offset based on scale
  const cameraOffsetY = 0.8 * scale; // Eye level relative to character scale
  

  return (
    <RigidBody
      ref={playerRef}
      type="kinematicVelocity"
      position={[0, 1.4, 0]} // Position so capsule bottom touches ground at y=0 (ground + halfHeight + radius = 0 + 0.9 + 0.5)
      lockRotations={true}
    >
      {/* Fixed-size capsule collider for consistent physics */}
      <CapsuleCollider args={[0.9, 0.5]} />
      
      {/* Visual representation that scales height only from bottom */}
      <mesh ref={meshRef} name="player" scale={[1, scale, 1]} position={[0, (scale - 1), 0]}>
        <boxGeometry args={[1, 2, 1]} />
        <meshBasicMaterial color="green" transparent opacity={0.8} />
      </mesh>
      
      {/* Debug collision visualization - shows actual CapsuleCollider bounds */}
      {showDebug && (
        <mesh position={[0, 0, 0]}>
          <capsuleGeometry args={[0.5, 0.9]} />
          <meshBasicMaterial color="red" wireframe transparent opacity={0.5} />
        </mesh>
      )}
      
      {/* Camera eye indicator - positioned on front face like a cyclops */}
      <mesh position={[0, (scale - 1) + cameraOffsetY, -0.51]} scale={0.1}>
        <sphereGeometry args={[1]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
    </RigidBody>
  );
}
