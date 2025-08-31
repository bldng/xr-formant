import { Text, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
import {
  useXR,
  useXRControllerLocomotion,
  useXRInputSourceState,
  XROrigin,
} from "@react-three/xr";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const playerGroupRef = useRef<THREE.Group>(null);
  const [, get] = useKeyboardControls<Controls>();
  const [scale, setScale] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [showDebug] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);

  // Speed and stamina controls
  const { maxWalkingSpeed, staminaEnabled, maxStamina, staminaRegenRate } =
    useControls("Character Movement", {
      staminaEnabled: false,
      maxWalkingSpeed: { value: 5, min: 1, max: 15, step: 0.5 },
      maxStamina: { value: 100, min: 50, max: 200, step: 10 },
      staminaRegenRate: { value: 20, min: 5, max: 50, step: 5 },
    });

  // Stamina state
  const [stamina, setStamina] = useState(maxStamina);
  const staminaRef = useRef(maxStamina);

  // Initialize and sync stamina ref
  useEffect(() => {
    // Initialize stamina ref if not set
    if (staminaRef.current !== stamina) {
      staminaRef.current = stamina;
    }

    if (stamina > maxStamina) {
      setStamina(maxStamina);
      staminaRef.current = maxStamina;
    }
  }, [maxStamina, stamina]);

  // Hardcoded character controller settings
  const slopeSettings = useMemo(
    () => ({
      controllerOffset: 0.01,
      maxSlopeClimbAngle: 50,
      minSlopeSlideAngle: 55,
      autostepHeight: 0.7,
      autostepMinWidth: 0.05,
      snapToGroundDistance: 0.3,
    }),
    []
  );

  // Access Rapier world and API
  const { world, rapier } = useRapier();

  // XR and controllers
  const { session } = useXR();
  const { gl } = useThree();
  // VR controller input
  const leftController = useXRInputSourceState("controller", "left");
  const rightController = useXRInputSourceState("controller", "right");

  const characterControllerRef = useRef<InstanceType<
    typeof rapier.KinematicCharacterController
  > | null>(null);

  // Track velocity for gravity accumulation
  const velocityRef = useRef({ x: 0, y: 0, z: 0 });
  const jumpVelocity = 3;
  const isJumpingRef = useRef(false);
  const textRef = useRef(null);

  const [debugText, setDebugText] = useState("rotation: 0°");

  // Calculate XR locomotion speed based on stamina
  const getXRSpeed = () => {
    const baseSpeed = 0.025;

    if (!staminaEnabled) return baseSpeed;

    if (staminaRef.current < 5) {
      return 0; // No movement when stamina is below 5
    } else if (staminaRef.current < maxStamina * 0.3) {
      return baseSpeed * 0.3; // 30% speed when stamina is below 30%
    } else if (staminaRef.current < maxStamina * 0.6) {
      return baseSpeed * 0.7; // 70% speed when stamina is below 60%
    }

    return baseSpeed;
  };

  // Use XRControllerLocomotion to control the character RigidBody directly
  useXRControllerLocomotion(
    (velocity: THREE.Vector3, rotationYVelocity: number) => {
      if (playerRef.current && session) {
        // Apply smooth VR velocity to the RigidBody position (X,Z only - no flying!)
        const currentPos = playerRef.current.translation();
        playerRef.current.setTranslation(
          {
            x: currentPos.x + velocity.x,
            y: currentPos.y, // Keep Y unchanged - no vertical movement
            z: currentPos.z + velocity.z,
          },
          true
        );

        // Apply smooth rotation to the player group
        if (playerGroupRef.current) {
          playerGroupRef.current.rotation.y += rotationYVelocity;
          setRotation(playerGroupRef.current.rotation.y);
        }
      }
    },
    {
      speed: getXRSpeed(),
    }
  );

  // Initialize character controller
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

  useFrame((_, delta) => {
    if (
      !playerRef.current ||
      !characterControllerRef.current ||
      !playerGroupRef.current
    )
      return;

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

    // Get XR controller input with velocity-sensitive movement
    let xrMovementX = 0;
    let xrMovementZ = 0;
    let xrRotationInput = 0;
    let xrGrow = false;
    let xrShrink = false;

    if (session) {
      // Left controller thumbstick for movement and buttons for scaling
      if (leftController?.gamepad) {
        const thumbstick = leftController.gamepad["xr-standard-thumbstick"];
        if (thumbstick) {
          const xAxis = thumbstick.xAxis ?? 0;
          const yAxis = thumbstick.yAxis ?? 0;
          // Keep the analog values for velocity-sensitive movement
          xrMovementX = Math.abs(xAxis) > 0.1 ? xAxis : 0;
          xrMovementZ = Math.abs(yAxis) > 0.1 ? yAxis : 0;
        }

        // X button for grow, Y button for shrink
        const xButton = leftController.gamepad["x-button"];
        const yButton = leftController.gamepad["y-button"];
        xrGrow = xButton?.state === "pressed";
        xrShrink = yButton?.state === "pressed";
      }

      // Right controller thumbstick for rotation
      if (rightController?.gamepad) {
        const thumbstick = rightController.gamepad["xr-standard-thumbstick"];
        if (thumbstick) {
          const xAxis = thumbstick.xAxis ?? 0;
          xrRotationInput = Math.abs(xAxis) > 0.1 ? xAxis : 0;
        }
      }
    }

    // SIMPLIFIED ROTATION LOGIC
    let currentRotation = rotation;

    // ROTATION: Use keyboard and controller input for both desktop and VR
    const rotationSpeed = 0.05;
    let rotationDelta = 0;

    if (rotateLeft) rotationDelta += rotationSpeed;
    if (rotateRight) rotationDelta -= rotationSpeed;
    // VR rotation input
    if (Math.abs(xrRotationInput) > 0.1) {
      rotationDelta -= xrRotationInput * rotationSpeed * 2;
    }

    if (rotationDelta !== 0) {
      currentRotation += rotationDelta;
      setRotation(currentRotation);
    }

    // Apply current rotation to the player group
    playerGroupRef.current.rotation.y = currentRotation;

    // For movement, use head direction in VR or manual rotation in desktop
    let movementRotation = currentRotation;

    if (session && gl.xr.isPresenting) {
      try {
        // Get XR camera (head) direction for movement only
        const xrCamera = gl.xr.getCamera();
        const headDirection = new THREE.Vector3();
        const e = xrCamera.matrixWorld.elements;
        headDirection.set(-e[8], -e[9], -e[10]).normalize();

        // Use head direction for movement calculation
        movementRotation = Math.atan2(headDirection.x, headDirection.z);
      } catch {
        // Fall back to manual rotation if head tracking fails
      }
    }

    // MOVEMENT LOGIC
    let movementX = 0;
    let movementZ = 0;

    // Calculate current speed based on stamina
    let currentSpeed = maxWalkingSpeed;
    if (staminaEnabled) {
      if (staminaRef.current < 5) {
        // No movement when stamina is below 5 (prevents race condition)
        currentSpeed = 0;
      } else if (staminaRef.current < maxStamina * 0.3) {
        // Reduce speed to 30% when stamina is below 30%
        currentSpeed = maxWalkingSpeed * 0.3;
      } else if (staminaRef.current < maxStamina * 0.6) {
        // Reduce speed to 70% when stamina is below 60%
        currentSpeed = maxWalkingSpeed * 0.7;
      }
    }

    const staminaText = staminaEnabled
      ? ` | Stamina: ${Math.round(
          staminaRef.current
        )}/${maxStamina} (${Math.round(
          (staminaRef.current / maxStamina) * 100
        )}%) Speed: ${currentSpeed.toFixed(1)}`
      : "";

    setDebugText(staminaText);

    // Track if player is moving for stamina calculation
    let isMoving = false;

    // Keyboard movement
    if (forward) {
      movementX -= Math.sin(currentRotation) * currentSpeed;
      movementZ -= Math.cos(currentRotation) * currentSpeed;
      isMoving = true;
    }
    if (back) {
      movementX += Math.sin(currentRotation) * currentSpeed;
      movementZ += Math.cos(currentRotation) * currentSpeed;
      isMoving = true;
    }
    if (left) {
      movementX -= Math.cos(currentRotation) * currentSpeed;
      movementZ += Math.sin(currentRotation) * currentSpeed;
      isMoving = true;
    }
    if (right) {
      movementX += Math.cos(currentRotation) * currentSpeed;
      movementZ -= Math.sin(currentRotation) * currentSpeed;
      isMoving = true;
    }

    // Manual VR Controller input (fallback/debugging alongside smooth locomotion)
    if (Math.abs(xrMovementX) > 0.1 || Math.abs(xrMovementZ) > 0.1) {
      const vrMoveSpeed = currentSpeed * 1.5;
      const correctedX = xrMovementX;
      const correctedZ = xrMovementZ;
      isMoving = true;

      if (correctedZ > 0) {
        movementX -= Math.sin(movementRotation) * correctedZ * vrMoveSpeed;
        movementZ -= Math.cos(movementRotation) * correctedZ * vrMoveSpeed;
      } else if (correctedZ < 0) {
        movementX +=
          Math.sin(movementRotation) * Math.abs(correctedZ) * vrMoveSpeed;
        movementZ +=
          Math.cos(movementRotation) * Math.abs(correctedZ) * vrMoveSpeed;
      }
      if (correctedX > 0) {
        movementX -= Math.cos(movementRotation) * correctedX * vrMoveSpeed;
        movementZ += Math.sin(movementRotation) * correctedX * vrMoveSpeed;
      } else if (correctedX < 0) {
        movementX +=
          Math.cos(movementRotation) * Math.abs(correctedX) * vrMoveSpeed;
        movementZ -=
          Math.sin(movementRotation) * Math.abs(correctedX) * vrMoveSpeed;
      }
    }

    // JUMPING
    if (jump && !isJumpingRef.current) {
      const collider = world.getCollider(playerRef.current.handle);
      if (collider) {
        characterControllerRef.current.computeColliderMovement(collider, {
          x: 0,
          y: 0,
          z: 0,
        });
        const isGrounded = characterControllerRef.current.computedGrounded();
        if (isGrounded) {
          velocityRef.current.y = jumpVelocity;
          isJumpingRef.current = true;
        }
      }
    }

    // SCALING
    const scaleSpeed = 0.01;
    const minScale = 0.3;
    const maxScale = 3.0;

    if ((grow || xrGrow) && scale < maxScale) {
      setScale(Math.min(scale + scaleSpeed, maxScale));
    }
    if ((shrink || xrShrink) && scale > minScale) {
      setScale(Math.max(scale - scaleSpeed, minScale));
    }

    // STAMINA SYSTEM
    if (staminaEnabled) {
      if (isMoving) {
        // Deplete stamina when moving
        const staminaDrain = 15 * delta; // Drain per second
        const newStamina = Math.max(0, staminaRef.current - staminaDrain);
        staminaRef.current = newStamina;
        setStamina(newStamina);
      } else {
        // Regenerate stamina when not moving
        const newStamina = Math.min(
          maxStamina,
          staminaRef.current + staminaRegenRate * delta
        );
        staminaRef.current = newStamina;
        setStamina(newStamina);
      }
    }

    // PHYSICS
    const gravity = -9.81;
    velocityRef.current.y += gravity * delta;
    velocityRef.current.x = movementX;
    velocityRef.current.z = movementZ;

    const desiredMovement = {
      x: velocityRef.current.x * delta,
      y: velocityRef.current.y * delta,
      z: velocityRef.current.z * delta,
    };

    const collider = world.getCollider(playerRef.current.handle);
    if (collider) {
      characterControllerRef.current.computeColliderMovement(
        collider,
        desiredMovement
      );
      const computedMovement =
        characterControllerRef.current.computedMovement();
      const isGrounded = characterControllerRef.current.computedGrounded();

      if (isGrounded && velocityRef.current.y <= 0) {
        velocityRef.current.y = 0;
        isJumpingRef.current = false;
      }

      const velocity = {
        x: computedMovement.x / delta,
        y: computedMovement.y / delta,
        z: computedMovement.z / delta,
      };

      playerRef.current.setLinvel(velocity, true);
    }
  });

  // Calculate camera offset based on scale
  const cameraOffsetY = 0.8 * scale;

  return (
    <RigidBody
      ref={playerRef}
      type="kinematicVelocity"
      // position={[0, 1.399, 0]}
      position={[-20, 2, 0]}
      lockRotations={true}
    >
      <CapsuleCollider args={[0.9, 0.5]} />

      {/* Player group - everything rotates together */}
      <group ref={playerGroupRef}>
        {/* Debug collision visualization */}
        {showDebug && (
          <group>
            <Text
              fontSize={0.1}
              color="white"
              position={[0, scale - 1 + cameraOffsetY, -2.5]}
              ref={textRef}
            >
              {debugText}
            </Text>
          </group>
        )}

        {showPlayer && (
          <group name="player">
            <mesh position={[0, 0, 0]}>
              <capsuleGeometry args={[0.5, 0.9]} />
              <meshBasicMaterial
                color="red"
                wireframe
                transparent
                opacity={0.5}
              />
            </mesh>
            <mesh scale={[1, scale, 1]} position={[0, scale - 1, 0]}>
              <boxGeometry args={[1, 2, 1]} />
              <meshBasicMaterial color="green" transparent opacity={0.8} />
            </mesh>
            <mesh
              position={[0, scale - 1 + (cameraOffsetY - 0.2), -1.5]}
              scale={0.5}
            >
              <boxGeometry args={[0.1, 0.1, 5]} />
              <meshBasicMaterial color="blue" />
            </mesh>

            <mesh position={[0, scale - 1 + cameraOffsetY, -0.51]} scale={0.1}>
              <sphereGeometry args={[1]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
          </group>
        )}
        {/* XR Origin for VR locomotion - positioned at camera height */}
        {session && <XROrigin position={[0, scale - 1 + cameraOffsetY, 0]} />}
      </group>
    </RigidBody>
  );
}
