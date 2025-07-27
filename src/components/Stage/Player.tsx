import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { useRef } from "react";

type Controls = "forward" | "back" | "left" | "right";

export function Player() {
  const playerRef = useRef<RapierRigidBody>(null);
  const [, get] = useKeyboardControls<Controls>();

  useFrame(() => {
    if (!playerRef.current) return;

    const { forward, back, left, right } = get();
    const velocity: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

    if (forward) velocity.z -= 5;
    if (back) velocity.z += 5;
    if (left) velocity.x -= 5;
    if (right) velocity.x += 5;

    playerRef.current.setLinvel(velocity, true);
  });

  return (
    <RigidBody ref={playerRef} type="dynamic" position={[0, 1, 0]}>
      <CuboidCollider args={[0.5, 1, 0.5]} />
      <mesh>
        <capsuleGeometry args={[0.5, 1]} />
        <meshBasicMaterial color="blue" />
      </mesh>
    </RigidBody>
  );
}
