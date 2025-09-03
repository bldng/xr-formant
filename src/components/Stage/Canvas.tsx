import { KeyboardControls, OrbitControls, Stage } from "@react-three/drei";
import { Canvas as R3FCanvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { useControls } from "leva";
import { CameraHUD } from "../CameraHUD";
import { ModelControls, ModelRenderer } from "../ModelLoader";
import { XRVisualFilter } from "./XRVisualFilter";

const store = createXRStore({
  hand: { teleportPointer: true },
  controller: { teleportPointer: true },
});

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
  squeeze: "squeeze";
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
  squeeze: "squeeze",
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
  { name: Controls.squeeze, keys: ["ShiftLeft", "ShiftRight"] },
];
type EnvironmentPreset =
  | "sunset"
  | "forest"
  | "city"
  | "dawn"
  | "night"
  | "park";

export const Canvas = () => {
  const { environment } = useControls("Environment", {
    environment: {
      value: "sunset" as EnvironmentPreset,
      options: [
        "sunset",
        "forest",
        "city",
        "dawn",
        "night",
        "park",
      ] as EnvironmentPreset[],
    },
  });
  return (
    <>
      <ModelControls onEnterVR={() => store.enterVR()} />
      <KeyboardControls map={keyboardMap}>
        <R3FCanvas
          className="w-full h-full"
          shadows
          //frameloop="demand"
          camera={{
            fov: 1,
          }}
          onCreated={({ camera }) => {
            // Main camera should not see layer 1 (filters)
            camera.layers.disableAll();
            camera.layers.enable(0); // Default layer for scene objects
          }}
        >
          <XR store={store}>
            <directionalLight
              position={[10, 15, 8]}
              intensity={2}
              castShadow
              shadow-mapSize-width={4096}
              shadow-mapSize-height={4096}
              shadow-camera-far={100}
              shadow-camera-left={-20}
              shadow-camera-right={20}
              shadow-camera-top={20}
              shadow-camera-bottom={-20}
              shadow-bias={-0.0001}
            />

            <Stage
              environment={{
                preset: environment,
                blur: 10,
                background: true,
              }}
              preset="rembrandt"
              shadows={false}
              intensity={0.5}
              adjustCamera={true}
            >
              <ModelRenderer>
                <></>
              </ModelRenderer>
            </Stage>
            <CameraHUD />
            <OrbitControls />
            <XRVisualFilter />
          </XR>
        </R3FCanvas>
      </KeyboardControls>
    </>
  );
};
