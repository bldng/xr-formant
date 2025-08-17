import { useModels } from "./ModelLoader";
import { useRef } from "react";

interface ControlsProps {
  onEnterVR: () => void;
}

export function Controls({ onEnterVR }: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addModel, models } = useModels();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    console.log("File selected:", file.name, file.type);

    // For GLB files (self-contained), we can use them directly
    if (file.name.toLowerCase().endsWith(".glb")) {
      const url = URL.createObjectURL(file);
      addModel(url);
      return;
    }

    // For GLTF files, create a simple URL (may not work with external dependencies)
    if (file.name.toLowerCase().endsWith(".gltf")) {
      console.log(
        "GLTF file selected via file input. For best results with external dependencies, use drag & drop with all related files."
      );
      const url = URL.createObjectURL(file);
      addModel(url);
    }
  };

  const handleLoadHafen = () => {
    // Load the hafen.gltf model from the public folder
    addModel("/hafen.gltf");
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Load GLB Model
        </button>
        <button
          onClick={handleLoadHafen}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Load Hafen
        </button>
        <button
          onClick={onEnterVR}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Enter VR
        </button>
      </div>
      <div className="mt-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
        Models loaded: {models.length}
      </div>
      <div className="mt-1 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
        Tip: Drag & drop for GLTF + assets
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}