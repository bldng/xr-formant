import { ModelDropZone, ModelProvider } from "../components/ModelLoader";
import { Canvas } from "../components/Stage/Canvas";

export const ModelPage = () => {
  return (
    <ModelProvider>
      <div className="w-full h-full relative">
        <ModelDropZone />
        <Canvas />
      </div>
    </ModelProvider>
  );
};
