import { KeyboardControls, OrbitControls, Stage } from "@react-three/drei";
import { Canvas as R3FCanvas } from "@react-three/fiber";
import { CameraHUD } from "../CameraHUD";
import { ModelRenderer } from "../ModelLoader";

type Controls = {
  forward: "forward";
  back: "back";
  left: "left";
  right: "right";
  grow: "grow";
  shrink: "shrink";
  rotateLeft: "rotateLeft";
  rotateRight: "rotateRight";
  jump: "jump";
};

const Controls = {
  forward: "forward",
  back: "back",
  left: "left",
  right: "right",
  grow: "grow",
  shrink: "shrink",
  rotateLeft: "rotateLeft",
  rotateRight: "rotateRight",
  jump: "jump",
} as const;

const keyboardMap = [
  { name: Controls.forward, keys: ["KeyW"] },
  { name: Controls.back, keys: ["KeyS"] },
  { name: Controls.left, keys: ["KeyA"] },
  { name: Controls.right, keys: ["KeyD"] },
  { name: Controls.grow, keys: ["ArrowUp"] },
  { name: Controls.shrink, keys: ["ArrowDown"] },
  { name: Controls.rotateLeft, keys: ["KeyQ", "ArrowLeft"] },
  { name: Controls.rotateRight, keys: ["KeyE", "ArrowRight"] },
  { name: Controls.jump, keys: ["Space"] },
];

export const Canvas = () => (
  <KeyboardControls map={keyboardMap}>
    <R3FCanvas className="w-full h-full" frameloop="demand">
      {/* <ambientLight intensity={Math.PI / 2} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        decay={0}
        intensity={Math.PI}
      />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} /> */}
      <Stage
        environment={{
          preset: "sunset",
          blur: 10,
          background: true,
        }}
        preset="rembrandt"
        shadows={true}
        intensity={0.5}
        adjustCamera={true}
      >
        <ModelRenderer>
          <></>
        </ModelRenderer>
      </Stage>
      <CameraHUD />
      <OrbitControls />
    </R3FCanvas>
  </KeyboardControls>
);
