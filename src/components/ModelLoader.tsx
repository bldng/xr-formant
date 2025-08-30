import { useGLTF } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { CharacterPlayer } from "./Stage/CharacterPlayer";

// GLTF type definitions
interface GLTFBuffer {
  uri?: string;
  byteLength: number;
}

interface GLTFImage {
  uri?: string;
  mimeType?: string;
  bufferView?: number;
}

interface GLTFData {
  buffers?: GLTFBuffer[];
  images?: GLTFImage[];
  [key: string]: unknown;
}

interface GLTFModelProps {
  url: string;
  position?: [number, number, number];
}

function GLTFModel({ url, position = [0, 0, 0] }: GLTFModelProps) {
  console.log("GLTFModel component rendering with URL:", url);
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null!);
  const { setModelLoading } = useModels();

  console.log("GLTF scene loaded:", scene);

  // Mark model as loaded when scene is available
  useEffect(() => {
    if (scene) {
      setModelLoading(url, false);
    }
    return () => {
      setModelLoading(url, false);
    };
  }, [scene, url, setModelLoading]);

  // Clone and center the model
  const clonedScene = scene.clone();

  // Calculate bounding box and position model on ground
  const box = new THREE.Box3().setFromObject(clonedScene);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Position model so its bottom sits on the ground
  clonedScene.position.copy(center).multiplyScalar(-1);
  clonedScene.position.y = size.y / 2 - center.y; // Move bottom to y=0

  console.log(
    "Model positioned on ground, size:",
    size,
    "center offset:",
    center
  );

  // Enable shadows on all meshes in the model
  clonedScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    <RigidBody type="fixed" position={position} colliders="trimesh">
      <group ref={modelRef} castShadow receiveShadow scale={[2, 2, 2]}>
        <primitive object={clonedScene} />
      </group>
    </RigidBody>
  );
} // Context for sharing model state between components

interface ModelContextType {
  model: { url: string; position: [number, number, number] } | null;
  setModel: (url: string) => void;
  isModelLoading: boolean;
  setModelLoading: (url: string, isLoading: boolean) => void;
}

const ModelContext = createContext<ModelContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useModels() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModels must be used within ModelProvider");
  }
  return context;
}

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [model, setModelState] = useState<{
    url: string;
    position: [number, number, number];
  } | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const setModel = useCallback((url: string) => {
    console.log("Setting model with URL:", url);
    setIsModelLoading(true);
    const newModel = {
      url,
      position: [0, 0, 0] as [number, number, number], // Spawn at origin on the floor
    };
    console.log("New model:", newModel);
    setModelState(newModel);
  }, []);

  const setModelLoading = useCallback((url: string, isLoading: boolean) => {
    setIsModelLoading(isLoading);
  }, []);

  return (
    <ModelContext.Provider
      value={{ model, setModel, isModelLoading, setModelLoading }}
    >
      {children}
    </ModelContext.Provider>
  );
}

// Drag and drop overlay (outside Canvas)
export function ModelDropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const { setModel } = useModels();

  // Prevent default browser drag/drop behavior globally
  const preventDefaults = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleGlobalDragEnter = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleGlobalDragOver = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleGlobalDragLeave = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if we're leaving the document
    if (e.target === document.body || e.target === document.documentElement) {
      setIsDragging(false);
    }
  }, []);

  const handleLocalDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleLocalDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  // Set up global event listeners to prevent browser default behavior
  useEffect(() => {
    const events = ["dragenter", "dragover", "dragleave", "drop"];

    events.forEach((eventName) => {
      document.addEventListener(eventName, preventDefaults, false);
    });

    document.addEventListener("dragenter", handleGlobalDragEnter, false);
    document.addEventListener("dragover", handleGlobalDragOver, false);
    document.addEventListener("dragleave", handleGlobalDragLeave, false);

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, preventDefaults, false);
      });
      document.removeEventListener("dragenter", handleGlobalDragEnter, false);
      document.removeEventListener("dragover", handleGlobalDragOver, false);
      document.removeEventListener("dragleave", handleGlobalDragLeave, false);
    };
  }, [
    preventDefaults,
    handleGlobalDragEnter,
    handleGlobalDragOver,
    handleGlobalDragLeave,
  ]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
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

        // For GLB files (self-contained), we can use them directly
        if (gltfFile.name.toLowerCase().endsWith(".glb")) {
          const url = URL.createObjectURL(gltfFile);
          console.log("Created GLB URL:", url);
          setModel(url);
          return;
        }

        // For GLTF files with external dependencies, we need to handle all files
        try {
          // Create a file map for all related files
          const fileMap = new Map<string, File>();
          files.forEach((file) => {
            fileMap.set(file.name, file);
          });

          // Read the GLTF file content
          const gltfContent = await gltfFile.text();
          const gltfData: GLTFData = JSON.parse(gltfContent);

          // Create blob URLs for all referenced files
          const modifiedGltfData = { ...gltfData };

          // Handle buffers (bin files)
          if (modifiedGltfData.buffers) {
            modifiedGltfData.buffers = await Promise.all(
              modifiedGltfData.buffers.map(async (buffer: GLTFBuffer) => {
                if (buffer.uri && !buffer.uri.startsWith("data:")) {
                  const binFile = fileMap.get(buffer.uri);
                  if (binFile) {
                    const blobUrl = URL.createObjectURL(binFile);
                    return { ...buffer, uri: blobUrl };
                  }
                }
                return buffer;
              })
            );
          }

          // Handle images/textures
          if (modifiedGltfData.images) {
            modifiedGltfData.images = await Promise.all(
              modifiedGltfData.images.map(async (image: GLTFImage) => {
                if (image.uri && !image.uri.startsWith("data:")) {
                  const imageFile = fileMap.get(image.uri);
                  if (imageFile) {
                    const blobUrl = URL.createObjectURL(imageFile);
                    return { ...image, uri: blobUrl };
                  }
                }
                return image;
              })
            );
          }

          // Create a new blob with the modified GLTF content
          const modifiedGltfBlob = new Blob(
            [JSON.stringify(modifiedGltfData)],
            {
              type: "application/json",
            }
          );
          const gltfUrl = URL.createObjectURL(modifiedGltfBlob);

          console.log("Created modified GLTF URL:", gltfUrl);
          setModel(gltfUrl);
        } catch (error) {
          console.error("Error processing GLTF files:", error);
          // Fallback to simple URL creation
          const url = URL.createObjectURL(gltfFile);
          setModel(url);
        }
      } else {
        console.log(
          "No GLTF file found in dropped files:",
          files.map((f) => f.name)
        );
      }
    },
    [setModel]
  );

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-10 transition-all duration-300 ${
        isDragging ? "bg-blue-500/20 backdrop-blur-sm" : "bg-transparent"
      }`}
      onDragOver={handleLocalDragOver}
      onDragLeave={handleLocalDragLeave}
      onDrop={handleDrop}
      style={{ pointerEvents: isDragging ? "auto" : "none" }}
    >
      {isDragging && (
        <div className="flex items-center justify-center h-full">
          <div className="bg-white/90 backdrop-blur-md rounded-lg p-8 border-2 border-dashed border-blue-500">
            <div className="text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Drop GLTF/GLB Model + Assets
              </h3>
              <p className="text-gray-600">
                Drop files to replace current model
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3D models renderer (inside Canvas)
export function ModelRenderer({ children }: { children?: React.ReactNode }) {
  const { model, isModelLoading } = useModels();

  console.log("ModelRenderer - Current model:", model);

  return (
    <>
      <Physics paused={isModelLoading}>
        {model && (
          <GLTFModel
            key={model.url}
            url={model.url}
            position={model.position}
          />
        )}

        {/* <Player /> */}
        <CharacterPlayer />
        {children}
        {/* Global floor with slight offset to prevent collision instability */}
        <RigidBody type="fixed" position={[0, -0.51, 0]}>
          <CuboidCollider args={[1000, 0.5, 1000]} />
          <mesh>
            <boxGeometry args={[50, 1, 50]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </RigidBody>
      </Physics>
    </>
  );
}

// File input component with controls
interface ModelControlsProps {
  onEnterVR: () => void;
}

export function ModelControls({ onEnterVR }: ModelControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setModel, model } = useModels();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (
      file &&
      (file.name.toLowerCase().endsWith(".gltf") ||
        file.name.toLowerCase().endsWith(".glb"))
    ) {
      // For GLB files (self-contained), we can use them directly
      if (file.name.toLowerCase().endsWith(".glb")) {
        const url = URL.createObjectURL(file);
        setModel(url);
        return;
      }

      // For GLTF files, we need to handle potential external dependencies
      // Note: File input only gives us one file, so this is a fallback
      console.warn(
        "GLTF file selected via file input. For best results with external dependencies, use drag & drop with all related files."
      );
      const url = URL.createObjectURL(file);
      setModel(url);
    }
  };

  const handleLoadHafen = () => {
    // Load the hafen.gltf model from the public folder
    setModel("/hafen.gltf");
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          Load Model
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
      <div className="text-sm text-white bg-black/50 px-2 py-1 rounded">
        Model: {model ? "loaded" : "none"}
      </div>
      <div className="mt-1 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
        Tip: Drag & drop for GLTF + assets
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
