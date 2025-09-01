import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";

const store = createXRStore({});

const ARPage = () => {
  return (
    <div>
      <button onClick={() => store.enterXR("immersive-ar")}>Enter AR</button>
      <Canvas>
        <XR store={store}></XR>
      </Canvas>
    </div>
  );
};

export default ARPage;
