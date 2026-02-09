import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { XRVisualFilter } from "../components/Stage/XRVisualFilter";

const store = createXRStore({
  bounded: false,
});

const ARPage = () => {
  return (
    <div className="w-screen h-screen">
      <button onClick={() => store.enterXR("immersive-ar")}>Enter AR</button>
      <Canvas
        onCreated={({ camera }) => {
          camera.layers.enableAll();
        }}
      >
        <XR store={store}>
          <XROrigin position={[0, 1.6, 0]}>
            <group scale={[3, 3, 1]} position={[0, 0, -0.5]}>
              <XRVisualFilter />
            </group>
          </XROrigin>
        </XR>
      </Canvas>
    </div>
  );
};

export default ARPage;
