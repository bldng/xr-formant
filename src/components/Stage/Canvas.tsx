import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas as R3FCanvas } from "@react-three/fiber";
import { ModelRenderer } from "../ModelLoader";

export const Canvas = () => (
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
      <ModelRenderer></ModelRenderer>
    </Stage>
    <OrbitControls />
  </R3FCanvas>
);
