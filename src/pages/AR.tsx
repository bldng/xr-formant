import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, XROrigin } from "@react-three/xr";
import { XRVisualFilter } from "../components/Stage/XRVisualFilter";

const store = createXRStore({});

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
            <XRVisualFilter />
          </XROrigin>
        </XR>
      </Canvas>
    </div>
  );
};

export default ARPage;
