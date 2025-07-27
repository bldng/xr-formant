import {
  ModelDropZone,
  ModelFileInput,
  ModelProvider,
} from "./components/ModelLoader";
import { Canvas } from "./components/Stage/Canvas";

function App() {
  return (
    <ModelProvider>
      <div className="w-screen h-screen">
        <ModelFileInput />
        <ModelDropZone />
        <Canvas />
      </div>
    </ModelProvider>
  );
}

export default App;
