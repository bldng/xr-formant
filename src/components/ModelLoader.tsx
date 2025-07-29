import { useGLTF } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Player } from "./Stage/Player";

interface GLTFModelProps {
  url: string;
  position?: [number, number, number];
}

function GLTFModel({ url, position = [0, 0, 0] }: GLTFModelProps) {
  console.log("GLTFModel component rendering with URL:", url);
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null!);

  console.log("GLTF scene loaded:", scene);

  // Clone and center the model
  const clonedScene = scene.clone();

  // Calculate bounding box and center the model
  const box = new THREE.Box3().setFromObject(clonedScene);
  const center = box.getCenter(new THREE.Vector3());

  // Center the model at origin
  clonedScene.position.copy(center).multiplyScalar(-1);

  console.log("Model centered, center offset:", center);

  return (
    <RigidBody type="fixed" position={position} colliders="trimesh">
      <group ref={modelRef} receiveShadow>
        <primitive object={clonedScene} />
      </group>
    </RigidBody>
  );
} // Context for sharing model state between components

interface ModelContextType {
  models: Array<{ url: string; position: [number, number, number] }>;
  addModel: (url: string) => void;
}

const ModelContext = createContext<ModelContextType | null>(null);

export function useModels() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModels must be used within ModelProvider");
  }
  return context;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [models, setModels] = useState<
    Array<{ url: string; position: [number, number, number] }>
  >([]);

  const addModel = useCallback((url: string) => {
    console.log("Adding model with URL:", url);
    const newModel = {
      url,
      position: [0, 3, 0] as [number, number, number], // Spawn at origin, 2 units above ground
    };
    console.log("New model:", newModel);
    setModels((prev) => {
      console.log("Previous models:", prev);
      const updated = [...prev, newModel];
      console.log("Updated models:", updated);
      return updated;
    });
  }, []);

  return (
    <ModelContext.Provider value={{ models, addModel }}>
      {children}
    </ModelContext.Provider>
  );
}

// Drag and drop overlay (outside Canvas)
export function ModelDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { addModel } = useModels();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const gltfFile = files.find(
        (file) =>
          file.name.toLowerCase().endsWith(".gltf") ||
          file.name.toLowerCase().endsWith(".glb")
      );

      if (gltfFile) {
        console.log("GLTF file found:", gltfFile.name);
        const url = URL.createObjectURL(gltfFile);
        console.log("Created URL:", url);
        addModel(url);
      } else {
        console.log(
          "No GLTF file found in dropped files:",
          files.map((f) => f.name)
        );
      }
    },
    [addModel]
  );

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-10 transition-all duration-300 ${
        isDragging ? "bg-blue-500/20 backdrop-blur-sm" : "bg-transparent"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ pointerEvents: isDragging ? "auto" : "none" }}
    >
      {isDragging && (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-8 border-2 border-dashed border-blue-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Drop GLTF/GLB Model
              </h3>
              <p className="text-gray-600">Release to load your 3D model</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3D models renderer (inside Canvas)
export function ModelRenderer({ children }: { children?: React.ReactNode }) {
  const { models } = useModels();

  console.log("ModelRenderer - Current models:", models);

  return (
    <>
      <Physics>
        {models.map((model, index) => {
          console.log(`Rendering model ${index}:`, model);
          return (
            <GLTFModel
              key={`${model.url}-${index}`}
              url={model.url}
              position={model.position}
            />
          );
        })}

        <Player />
        {children}
        <RigidBody type="fixed" position={[0, -1.5, 0]}>
          <CuboidCollider args={[25, 0.5, 25]} />
          <mesh>
            <boxGeometry args={[50, 1, 50]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </RigidBody>
      </Physics>
    </>
  );
}

// File input component
export function ModelFileInput() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addModel, models } = useModels();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (
      file &&
      (file.name.toLowerCase().endsWith(".gltf") ||
        file.name.toLowerCase().endsWith(".glb"))
    ) {
      const url = URL.createObjectURL(file);
      addModel(url);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-20">
      <button
        onClick={() => fileInputRef.current?.click()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        Load Model
      </button>
      <div className="mt-2 text-sm text-white bg-black/50 px-2 py-1 rounded">
        Models loaded: {models.length}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gltf,.glb"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
