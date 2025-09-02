import { useGLTF } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import { TeleportTarget } from "@react-three/xr";
import { useControls } from "leva";
import {
  createContext,
  Suspense,
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
  filename?: string;
}

function GLTFModel({ url, position = [0, 0, 0], filename }: GLTFModelProps) {
  console.log("GLTFModel component rendering with URL:", url);
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null!);
  const { setModelLoading, teleportPlayer, setModelBounds } = useModels();

  // Extract scale from filename using @Nx pattern (e.g., @2x, @0.5x, @10x)
  const getScaleFromFilename = (filename?: string): number => {
    if (!filename) return 2; // Default scale
    const scaleMatch = filename.match(/@(\d*\.?\d+)x/i);
    return scaleMatch ? parseFloat(scaleMatch[1]) : 2; // Default scale if no match
  };

  const modelScale = getScaleFromFilename(filename);

  // Teleportation controls
  const { showTeleportTargets } = useControls("Teleportation", {
    showTeleportTargets: false,
  });

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

  // Calculate model bounds considering the applied scale and position
  const scaledHeight = size.y * modelScale;
  const modelTopY = position[1] + scaledHeight;
  
  // Update model bounds in context
  useEffect(() => {
    setModelBounds({
      height: scaledHeight,
      topY: modelTopY,
    });
  }, [scaledHeight, modelTopY, setModelBounds]);

  console.log(
    "Model positioned on ground, size:",
    size,
    "scaled height:",
    scaledHeight,
    "top Y:",
    modelTopY,
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

  // Create teleport planes for each story/floor spanning full model dimensions
  const teleportPlanes = [];
  const storyHeight = 3; // 3 meters per story
  const storiesCount = Math.ceil(size.y / storyHeight);

  for (let story = 0; story < storiesCount; story++) {
    const yPosition = position[1] + (story + 1) * storyHeight;
    teleportPlanes.push(
      <TeleportTarget
        key={`story-${story}`}
        onTeleport={(teleportPosition) => {
          console.log(`Story ${story} teleport to:`, teleportPosition);
          if (teleportPlayer) {
            teleportPlayer(teleportPosition);
          }
        }}
      >
        <mesh
          position={[position[0], yPosition, position[2]]}
          visible={true}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[size.x * 2, size.z * 2]} />
          <meshBasicMaterial
            color="blue"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </TeleportTarget>
    );
  }

  return (
    <>
      <RigidBody type="fixed" position={position} colliders="trimesh">
        <group ref={modelRef} castShadow receiveShadow scale={[modelScale, modelScale, modelScale]}>
          <primitive object={clonedScene} />
        </group>
      </RigidBody>

      {/* Teleport grid - only show if enabled */}
      {showTeleportTargets && teleportPlanes}
    </>
  );
} // Context for sharing model state between components

interface ModelContextType {
  model: { url: string; position: [number, number, number]; filename?: string } | null;
  setModel: (url: string, filename?: string) => void;
  isModelLoading: boolean;
  setModelLoading: (url: string, isLoading: boolean) => void;
  teleportPlayer?: (position: THREE.Vector3) => void;
  registerTeleportHandler?: (
    handler: (position: THREE.Vector3) => void
  ) => void;
  modelBounds?: { height: number; topY: number };
  setModelBounds: (bounds: { height: number; topY: number }) => void;
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
    filename?: string;
  } | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelBounds, setModelBoundsState] = useState<{ height: number; topY: number }>();
  const teleportHandlerRef = useRef<((position: THREE.Vector3) => void) | null>(
    null
  );

  const setModel = useCallback((url: string, filename?: string) => {
    console.log("Setting model with URL:", url, "filename:", filename);
    setIsModelLoading(true);
    const newModel = {
      url,
      position: [0, 0, 0] as [number, number, number], // Spawn at origin on the floor
      filename,
    };
    console.log("New model:", newModel);
    setModelState(newModel);
  }, []);

  const setModelLoading = useCallback((_url: string, isLoading: boolean) => {
    setIsModelLoading(isLoading);
  }, []);

  const teleportPlayer = useCallback((position: THREE.Vector3) => {
    if (teleportHandlerRef.current) {
      teleportHandlerRef.current(position);
    }
  }, []);

  const registerTeleportHandler = useCallback(
    (handler: (position: THREE.Vector3) => void) => {
      teleportHandlerRef.current = handler;
    },
    []
  );

  const setModelBounds = useCallback((bounds: { height: number; topY: number }) => {
    setModelBoundsState(bounds);
  }, []);

  return (
    <ModelContext.Provider
      value={{
        model,
        setModel,
        isModelLoading,
        setModelLoading,
        teleportPlayer,
        registerTeleportHandler,
        modelBounds,
        setModelBounds,
      }}
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
          setModel(url, gltfFile.name);
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
          setModel(gltfUrl, gltfFile.name);
        } catch (error) {
          console.error("Error processing GLTF files:", error);
          // Fallback to simple URL creation
          const url = URL.createObjectURL(gltfFile);
          setModel(url, gltfFile.name);
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
          <div className="p-8 border-2 border-blue-500 border-dashed rounded-lg bg-white/90 backdrop-blur-md">
            <div className="text-center">
              <div className="mb-4 text-4xl">📦</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-800">
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

export function ModelRenderer({ children }: { children?: React.ReactNode }) {
  const { model, isModelLoading, teleportPlayer } = useModels();

  return (
    <>
      <Physics paused={isModelLoading}>
        <Suspense fallback={null}>
          {model && (
            <GLTFModel
              key={model.url}
              url={model.url}
              position={model.position}
              filename={model.filename}
            />
          )}
        </Suspense>

        {/* <Player /> */}
        <CharacterPlayer />

        {children}
        {/* Global floor with slight offset to prevent collision instability */}
        <TeleportTarget
          onTeleport={(position) => {
            console.log("Floor teleport to:", position);
            if (teleportPlayer) {
              teleportPlayer(position);
            }
          }}
        >
          <RigidBody type="fixed" position={[0, -0.51, 0]}>
            <CuboidCollider args={[1000, 0.5, 1000]} />
            <mesh>
              <boxGeometry args={[50, 1, 50]} />
              <meshStandardMaterial color="white" />
            </mesh>
          </RigidBody>
        </TeleportTarget>
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
        setModel(url, file.name);
        return;
      }

      // For GLTF files, we need to handle potential external dependencies
      // Note: File input only gives us one file, so this is a fallback
      console.warn(
        "GLTF file selected via file input. For best results with external dependencies, use drag & drop with all related files."
      );
      const url = URL.createObjectURL(file);
      setModel(url, file.name);
    }
  };

  const handleLoadHafen = () => {
    // Load the hafen.gltf model from the public folder
    setModel("/hafen.gltf", "hafen.gltf");
  };

  return (
    <div className="absolute z-20 top-4 left-4">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-1.5 text-white transition-colors rounded-lg shadow-lg bg-slate-500 hover:bg-slate-600"
        >
          Load Model
        </button>
        <button
          onClick={handleLoadHafen}
          className="px-4 py-1.5 text-white transition-colors rounded-lg shadow-lg bg-slate-500 hover:bg-slate-600"
        >
          Load Example
        </button>
        <button
          onClick={onEnterVR}
          className="px-4 py-1.5 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Enter VR
        </button>
      </div>
      <div className="px-2 py-1 text-sm text-white rounded bg-black/50">
        Model: {model ? <span className="font-bold">{model.url}</span> : "none"}
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
