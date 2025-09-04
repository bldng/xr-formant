import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface CompanionProps {
  playerRef: React.RefObject<RapierRigidBody | null>;
  companionTargetRef: React.MutableRefObject<{
    x: number;
    y: number;
    z: number;
  }>;
  squeezeModeRef: React.MutableRefObject<boolean>;
}

export function Companion({
  playerRef,
  companionTargetRef,
  squeezeModeRef,
}: CompanionProps) {
  const companionRef = useRef<RapierRigidBody>(null);
  const [position, setPosition] = useState(new THREE.Vector3(-22, 4, -2));

  // Companion controls
  const { enabled, followDistance, companionType, size, height, followSpeed } =
    useControls(
      "Companion",
      {
        enabled: false,
        companionType: {
          value: "service-dog",
          options: ["service-dog", "pram", "suitcase"],
        },
        followDistance: { value: 2.0, min: 1.0, max: 5.0, step: 0.1 },
        followSpeed: { value: 3.0, min: 1.0, max: 8.0, step: 0.1 },
        size: { value: 0.8, min: 0.3, max: 2.0, step: 0.1 },
        height: { value: 1.0, min: 0.5, max: 2.5, step: 0.1 },
      },
      { collapsed: true }
    );

  // Access Rapier world and API
  const { world, rapier } = useRapier();

  const characterControllerRef = useRef<InstanceType<
    typeof rapier.KinematicCharacterController
  > | null>(null);

  // Character controller settings optimized for companion
  const slopeSettings = useMemo(
    () => ({
      controllerOffset: 0.01,
      maxSlopeClimbAngle: 60, // Better stair climbing than player
      minSlopeSlideAngle: 65,
      autostepHeight: 0.9, // Higher step capability
      autostepMinWidth: 0.05,
      snapToGroundDistance: 0.4,
    }),
    []
  );

  // Initialize character controller and sync position with player when enabled
  useEffect(() => {
    if (world && rapier) {
      const controller = world.createCharacterController(
        slopeSettings.controllerOffset
      );
      controller.enableAutostep(
        slopeSettings.autostepHeight,
        slopeSettings.autostepMinWidth,
        true
      );
      controller.setMaxSlopeClimbAngle(
        (slopeSettings.maxSlopeClimbAngle * Math.PI) / 180
      );
      controller.setMinSlopeSlideAngle(
        (slopeSettings.minSlopeSlideAngle * Math.PI) / 180
      );
      controller.enableSnapToGround(slopeSettings.snapToGroundDistance);
      controller.setApplyImpulsesToDynamicBodies(true);
      characterControllerRef.current = controller;

      return () => {
        if (controller) {
          world.removeCharacterController(controller);
        }
      };
    }
  }, [world, rapier, slopeSettings]);

  // Sync companion spawn position with player when first enabled
  useEffect(() => {
    if (enabled && playerRef.current) {
      const playerPos = playerRef.current.translation();
      // Add a small delay to ensure physics world is properly initialized
      setTimeout(() => {
        setPosition(new THREE.Vector3(playerPos.x - 3, playerPos.y + 5, playerPos.z - 2));
      }, 100);
    }
  }, [enabled, playerRef]);

  useFrame((_, delta) => {
    if (
      !enabled ||
      !companionRef.current ||
      !characterControllerRef.current ||
      !playerRef.current
    )
      return;

    // Get companion position
    const companionPos = companionRef.current.translation();

    // Go to the red dot position (only X and Z, let gravity handle Y)
    const targetX = companionTargetRef.current.x;
    const targetZ = companionTargetRef.current.z;

    // Calculate distance to target
    const distanceToTarget = Math.sqrt(
      Math.pow(targetX - companionPos.x, 2) +
        Math.pow(targetZ - companionPos.z, 2)
    );

    // Move toward target position using physics-based movement
    let movementX = 0;
    let movementZ = 0;

    if (distanceToTarget > 0.05) {
      // Reduced threshold for tighter following
      const directionX = (targetX - companionPos.x) / distanceToTarget;
      const directionZ = (targetZ - companionPos.z) / distanceToTarget;

      // Stronger attraction force - exponential scaling based on distance
      const baseAttraction = Math.pow(distanceToTarget / followDistance, 2) * 5;
      const speedMultiplier = Math.min(baseAttraction + 1, 8.0); // Increased max speed

      movementX = directionX * followSpeed * speedMultiplier;
      movementZ = directionZ * followSpeed * speedMultiplier;
    }

    // Use character controller for physics-based movement with proper delta time
    const desiredMovement = {
      x: movementX * delta,
      y: -9.81 * delta, // Apply proper gravity
      z: movementZ * delta,
    };

    // Apply velocity directly to the dynamic body
    const currentVelocity = companionRef.current.linvel();
    companionRef.current.setLinvel({
      x: movementX,
      y: currentVelocity.y, // Preserve Y velocity (gravity/jumping)
      z: movementZ,
    }, true);
  });

  // Get companion visual properties based on type
  const getCompanionVisuals = () => {
    switch (companionType) {
      case "service-dog":
        return {
          color: "#8B4513", // Brown
          shape: "capsule",
          width: size,
          height: height * 0.6,
          depth: size * 1.2,
        };
      case "pram":
        return {
          color: "#4169E1", // Royal Blue
          shape: "box",
          width: size * 1.2,
          height: height,
          depth: size * 0.8,
        };
      case "suitcase":
        return {
          color: "#2F4F4F", // Dark Slate Gray
          shape: "box",
          width: size * 0.6,
          height: height * 0.4,
          depth: size,
        };
      default:
        return {
          color: "#FF6347", // Tomato
          shape: "box",
          width: size,
          height: height,
          depth: size,
        };
    }
  };

  const visuals = getCompanionVisuals();

  if (!enabled) return null;

  return (
    <>
      <RigidBody
        ref={companionRef}
        type="dynamic"
        position={[position.x, position.y, position.z]}
        lockRotations={true}
        gravityScale={1} // Normal gravity
      >
        <CapsuleCollider args={[height * 0.5, visuals.width * 0.5]} />

        <group>
          {visuals.shape === "capsule" && (
            <mesh>
              <capsuleGeometry
                args={[visuals.width * 0.5, visuals.height, 4]}
              />
              <meshBasicMaterial
                color={visuals.color}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}

          {visuals.shape === "box" && (
            <mesh position={[0, visuals.height * 0.5, 0]}>
              <boxGeometry
                args={[visuals.width, visuals.height, visuals.depth]}
              />
              <meshBasicMaterial
                color={visuals.color}
                transparent
                opacity={0.8}
              />
            </mesh>
          )}
        </group>
      </RigidBody>
    </>
  );
}
