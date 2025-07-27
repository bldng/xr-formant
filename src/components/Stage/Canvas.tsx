import { KeyboardControls, OrbitControls, Stage } from "@react-three/drei";
import { Canvas as R3FCanvas } from "@react-three/fiber";
import { ModelRenderer } from "../ModelLoader";

type Controls = {
  forward: "forward";
  back: "back";
  left: "left";
  right: "right";
};

const Controls = {
  forward: "forward",
  back: "back",
  left: "left",
  right: "right",
} as const;

const keyboardMap = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
];

export const Canvas = () => (
  <KeyboardControls map={keyboardMap}>
    <R3FCanvas className="w-full h-full">
      <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Stage>
        <ModelRenderer>
          <></>
        </ModelRenderer>
      </Stage>
      <OrbitControls />
    </R3FCanvas>
  </KeyboardControls>
);
