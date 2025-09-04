import { Box, OrbitControls, Sphere, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, XROrigin, createXRStore } from "@react-three/xr";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { ResonanceAudio, type ResonanceAudioSource } from "resonance-audio";
import * as THREE from "three";
import { Vector3 } from "three";

type RoomType =
  | "hallway"
  | "office"
  | "train-station"
  | "closet"
  | "cathedral"
  | "phone-booth";

interface RoomConfig {
  size: { width: number; height: number; depth: number };
  color: string;
  materials: {
    left: string;
    right: string;
    front: string;
    back: string;
    down: string;
    up: string;
  };
}

function RoomVisualization({ config }: { config: RoomConfig }) {
  const { width, height, depth } = config.size;

  // Scale down large rooms for better VR navigation
  // 1 Three.js unit = 1 meter, but we scale for usability
  // Scale based on floor area, but preserve height proportions better
  const floorScale = Math.min(1, 15 / Math.max(width, depth));
  const heightScale = Math.min(1, 8 / height); // Separate height scaling
  const scale = Math.max(floorScale, heightScale); // Use the less aggressive scaling

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale;

  // Material colors based on acoustic properties
  const getMaterialColor = (material: string) => {
    switch (material) {
      case "marble":
        return "#f8f9fa";
      case "concrete-block-coarse":
        return "#6c757d";
      case "concrete-block-painted":
        return "#adb5bd";
      case "glass-thin":
        return "#17a2b8";
      case "curtain-heavy":
        return "#dc3545";
      case "acoustic-ceiling-tiles":
        return "#ffc107";
      case "plaster-smooth":
        return "#e9ecef";
      case "linoleum-on-concrete":
        return "#28a745";
      case "metal":
        return "#6f42c1";
      default:
        return "#868e96";
    }
  };

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledWidth, scaledDepth]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.down)}
          opacity={0.3}
          transparent
        />
      </mesh>

      {/* Walls */}
      {/* Left wall */}
      <mesh
        position={[-scaledWidth / 2, scaledHeight / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledDepth, scaledHeight]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.left)}
          opacity={0.2}
          transparent
        />
      </mesh>

      {/* Right wall */}
      <mesh
        position={[scaledWidth / 2, scaledHeight / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledDepth, scaledHeight]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.right)}
          opacity={0.2}
          transparent
        />
      </mesh>

      {/* Front wall */}
      <mesh
        position={[0, scaledHeight / 2, -scaledDepth / 2]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledWidth, scaledHeight]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.front)}
          opacity={0.2}
          transparent
        />
      </mesh>

      {/* Back wall */}
      <mesh
        position={[0, scaledHeight / 2, scaledDepth / 2]}
        rotation={[0, Math.PI, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledWidth, scaledHeight]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.back)}
          opacity={0.2}
          transparent
        />
      </mesh>

      {/* Ceiling */}
      <mesh
        position={[0, scaledHeight, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[scaledWidth, scaledDepth]} />
        <meshStandardMaterial
          color={getMaterialColor(config.materials.up)}
          opacity={0.1}
          transparent
        />
      </mesh>

      {/* Size label */}
      <Text
        position={[0, scaledHeight + 0.5, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
      >
        {width}×{height}×{depth}m{" "}
        {scale < 1 ? `(scaled ${(scale * 100).toFixed(0)}%)` : ""}
      </Text>
    </group>
  );
}

function VRRoomAcoustics() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const resonanceAudioRef = useRef<ResonanceAudio | null>(null);
  const sourceRef = useRef<ResonanceAudioSource | null>(null);
  const audioSourceGroupRef = useRef<THREE.Group | null>(null);
  const voiceSourcesRef = useRef<ResonanceAudioSource[]>([]);
  const activeVoiceSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const voiceGainNodesRef = useRef<GainNode[]>([]);
  const voiceTimeoutsRef = useRef<number[]>([]);
  const clickGainNodeRef = useRef<GainNode | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomType>("office");
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const clickingIntervalRef = useRef<number | null>(null);
  const [voicesActive, setVoicesActive] = useState(false);
  const { camera } = useThree();
  const timeRef = useRef(0);

  // Leva controls for audio parameters
  const { voiceVolume, clickVolume, moveSpeed } = useControls(
    "Audio Controls",
    {
      voiceVolume: { value: 0.1, min: 0, max: 0.5, step: 0.01 },
      clickVolume: { value: 0.1, min: 0, max: 0.5, step: 0.01 },
      moveSpeed: { value: 0.2, min: 0.1, max: 2, step: 0.1 },
    },
    { collapsed: true }
  );

  // Update gain nodes when volume controls change
  useEffect(() => {
    voiceGainNodesRef.current.forEach((gainNode) => {
      if (gainNode && audioContextRef.current) {
        gainNode.gain.setValueAtTime(
          voiceVolume,
          audioContextRef.current.currentTime
        );
      }
    });
  }, [voiceVolume]);

  useEffect(() => {
    if (clickGainNodeRef.current && audioContextRef.current) {
      clickGainNodeRef.current.gain.setValueAtTime(
        clickVolume,
        audioContextRef.current.currentTime
      );
    }
  }, [clickVolume]);

  // Audio sample configurations - loading actual audio files
  const voiceConfigs = [
    { label: "Voice 1", audioFile: "/audio/1.mp3", position: [-2, 1, 1] },
    { label: "Voice 2", audioFile: "/audio/2.mp3", position: [3, 1, -2] },
    { label: "Voice 3", audioFile: "/audio/3.mp3", position: [1, 1, 3] },
    { label: "Voice 4", audioFile: "/audio/4.mp3", position: [-3, 1, -1] },
  ];

  const audioBuffersRef = useRef<AudioBuffer[]>([]);

  const roomConfigs = {
    hallway: {
      size: { width: 3, height: 3, depth: 20 },
      materials: {
        left: "concrete-block-painted",
        right: "concrete-block-painted",
        front: "concrete-block-painted",
        back: "concrete-block-painted",
        down: "linoleum-on-concrete",
        up: "acoustic-ceiling-tiles",
      },
      color: "#95a5a6",
      label: "School Hallway - Hard Surfaces",
    },
    office: {
      size: { width: 8, height: 3, depth: 12 },
      materials: {
        left: "plaster-smooth",
        right: "plaster-smooth",
        front: "glass-thin",
        back: "plaster-smooth",
        down: "linoleum-on-concrete",
        up: "acoustic-ceiling-tiles",
      },
      color: "#3498db",
      label: "Office Space - Mixed Surfaces",
    },
    "train-station": {
      size: { width: 40, height: 12, depth: 60 },
      materials: {
        left: "concrete-block-coarse",
        right: "concrete-block-coarse",
        front: "concrete-block-coarse",
        back: "concrete-block-coarse",
        down: "concrete-block-coarse",
        up: "metal",
      },
      color: "#e74c3c",
      label: "Train Station - Huge Echo",
    },
    closet: {
      size: { width: 2, height: 2.5, depth: 1.5 },
      materials: {
        left: "curtain-heavy",
        right: "curtain-heavy",
        front: "curtain-heavy",
        back: "curtain-heavy",
        down: "curtain-heavy",
        up: "curtain-heavy",
      },
      color: "#2ecc71",
      label: "Closet - Dead Sound",
    },
    cathedral: {
      size: { width: 80, height: 30, depth: 120 },
      materials: {
        left: "marble",
        right: "marble",
        front: "marble",
        back: "marble",
        down: "marble",
        up: "marble",
      },
      color: "#9b59b6",
      label: "Cathedral - Massive Space",
    },
    "phone-booth": {
      size: { width: 1, height: 2, depth: 1 },
      materials: {
        left: "glass-thin",
        right: "glass-thin",
        front: "glass-thin",
        back: "glass-thin",
        down: "metal",
        up: "metal",
      },
      color: "#f39c12",
      label: "Phone Booth - Tiny & Reflective",
    },
  };

  // Load audio files
  const loadAudioFile = async (
    url: string,
    ctx: AudioContext
  ): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn(`Failed to load audio file ${url}:`, error);
      return null;
    }
  };

  // Initialize audio context once
  useEffect(() => {
    const initAudio = async () => {
      const ctx = new AudioContext();
      const resonance = new ResonanceAudio(ctx, { ambisonicOrder: 3 });

      // Set initial room
      const config = roomConfigs.office;
      resonance.setRoomProperties(config.size, config.materials);

      resonance.output.connect(ctx.destination);
      const audioSource = resonance.createSource();
      // Position the audio source clearly to the right and in front
      audioSource.setPosition(3, 1, -3);

      // Create a persistent gain node for click sounds
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(clickVolume, ctx.currentTime);
      clickGain.connect(audioSource.input);
      clickGainNodeRef.current = clickGain;

      // Create voice sources for spatial audio
      const voiceSources = voiceConfigs.map(() => resonance.createSource());

      // Load audio files
      const buffers = await Promise.all(
        voiceConfigs.map((config) => loadAudioFile(config.audioFile, ctx))
      );

      audioContextRef.current = ctx;
      resonanceAudioRef.current = resonance;
      sourceRef.current = audioSource;
      voiceSourcesRef.current = voiceSources;
      audioBuffersRef.current = buffers.filter(
        (buffer) => buffer !== null
      ) as AudioBuffer[];
    };

    initAudio();

    return () => {
      stopClickingSound();
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update room properties when room changes
  useEffect(() => {
    if (resonanceAudioRef.current) {
      const config = roomConfigs[currentRoom];
      resonanceAudioRef.current.setRoomProperties(
        config.size,
        config.materials
      );
    }
  }, [currentRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update listener position and move audio source
  useFrame((_state, delta) => {
    timeRef.current += delta;

    if (resonanceAudioRef.current) {
      // Move audio source from left to right
      const x = Math.sin(timeRef.current * moveSpeed) * 4; // Oscillate between -4 and +4
      const y = 1;
      const z = -3;

      // Update visual position directly
      if (audioSourceGroupRef.current) {
        audioSourceGroupRef.current.position.set(x, y, z);
      }

      if (sourceRef.current) {
        // Try matching Three.js coordinate system exactly
        sourceRef.current.setPosition(x, y, z);
      }

      if (isPlaying) {
        // Use camera position as listener position - match Three.js coords
        const pos = camera.position;
        resonanceAudioRef.current.setListenerPosition(pos.x, pos.y, pos.z);

        camera.updateMatrixWorld();
        const forward = new Vector3(0, 0, -1);
        const up = new Vector3(0, 1, 0);

        forward.transformDirection(camera.matrixWorld);
        up.transformDirection(camera.matrixWorld);

        // Use Three.js coordinate system directly
        resonanceAudioRef.current.setListenerOrientation(
          forward.x,
          forward.y,
          forward.z,
          up.x,
          up.y,
          up.z
        );
      }
    }
  });

  const switchRoom = (roomType: RoomType) => {
    setCurrentRoom(roomType);
  };

  const playAudioSample = (sourceIndex: number) => {
    if (
      !audioContextRef.current ||
      !voiceSourcesRef.current[sourceIndex] ||
      !audioBuffersRef.current[sourceIndex]
    )
      return;

    const ctx = audioContextRef.current;
    const bufferSource = ctx.createBufferSource();
    const gain = ctx.createGain();

    bufferSource.buffer = audioBuffersRef.current[sourceIndex];
    bufferSource.loop = true; // Enable looping
    bufferSource.connect(gain);
    gain.connect(voiceSourcesRef.current[sourceIndex].input);

    // Set volume - controlled by Leva
    gain.gain.setValueAtTime(voiceVolume, ctx.currentTime);

    // Store gain node reference for volume control
    voiceGainNodesRef.current[sourceIndex] = gain;

    bufferSource.start();

    // Store reference to stop later
    return bufferSource;
  };

  const toggleVoices = () => {
    if (!voicesActive) {
      // Start looping audio samples
      activeVoiceSourcesRef.current = [];
      voiceTimeoutsRef.current = [];
      voiceConfigs.forEach((config, index) => {
        if (voiceSourcesRef.current[index] && audioBuffersRef.current[index]) {
          voiceSourcesRef.current[index].setPosition(
            config.position[0],
            config.position[1],
            config.position[2]
          );

          // Stagger the sample start times slightly
          const timeoutId = setTimeout(() => {
            const bufferSource = playAudioSample(index);
            if (bufferSource) {
              activeVoiceSourcesRef.current.push(bufferSource);
            }
          }, index * 500);
          voiceTimeoutsRef.current.push(timeoutId);
        }
      });
      setVoicesActive(true);
    } else {
      // Clear pending timeouts
      voiceTimeoutsRef.current.forEach(clearTimeout);
      voiceTimeoutsRef.current = [];
      
      // Stop all active voice sources
      activeVoiceSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Source might already be stopped
        }
      });
      activeVoiceSourcesRef.current = [];
      setVoicesActive(false);
    }
  };

  const playClick = () => {
    if (!audioContextRef.current || !clickGainNodeRef.current) return;

    const ctx = audioContextRef.current;
    const click = ctx.createBufferSource();

    // Create a short click sound
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp((-i / buffer.length) * 8);
    }

    click.buffer = buffer;
    // Connect directly to the persistent gain node
    click.connect(clickGainNodeRef.current);

    click.start();
  };

  const startClickingSound = () => {
    console.log("Starting clicking sound");
    if (clickingIntervalRef.current) {
      clearTimeout(clickingIntervalRef.current);
    }

    const scheduleNextClick = () => {
      if (!isPlayingRef.current) return;

      console.log("Playing click");
      playClick();
      clickingIntervalRef.current = setTimeout(
        scheduleNextClick,
        1000 + Math.random() * 500
      );
    };

    // Start immediately
    playClick();
    clickingIntervalRef.current = setTimeout(
      scheduleNextClick,
      1000 + Math.random() * 500
    );
  };

  const stopClickingSound = () => {
    console.log("Stopping clicking sound");
    if (clickingIntervalRef.current) {
      clearTimeout(clickingIntervalRef.current);
      clickingIntervalRef.current = null;
    }
  };

  const handleAudioToggle = async () => {
    if (!audioContextRef.current || !sourceRef.current) return;

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      isPlayingRef.current = false;
      stopClickingSound();
      setIsPlaying(false);
    } else {
      isPlayingRef.current = true;
      setIsPlaying(true);
      startClickingSound();
    }
  };

  return (
    <group>
      {/* Moving audio source group */}
      <group ref={audioSourceGroupRef}>
        <Box
          args={[0.3, 0.3, 0.3]}
          onClick={handleAudioToggle}
          scale={isPlaying ? 1.2 : 1}
        >
          <meshBasicMaterial color={isPlaying ? "#ff6b6b" : "#ffff00"} />
        </Box>
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
        >
          {isPlaying ? "🔊 Playing" : "🔇 Click to Play"}
        </Text>
        <Text
          position={[0, -0.4, 0]}
          fontSize={0.1}
          color="#aaa"
          anchorX="center"
        >
          Moving L↔R
        </Text>
      </group>

      {/* Room type buttons */}
      {Object.entries(roomConfigs).map(([type, config], i) => (
        <group
          key={type}
          position={[
            i * 0.5 - (Object.keys(roomConfigs).length - 1) * 0.25,
            0.5,
            -1,
          ]}
        >
          <Box
            args={[0.4, 0.3, 0.1]}
            onClick={() => switchRoom(type as RoomType)}
          >
            <meshStandardMaterial
              color={currentRoom === type ? config.color : "#666"}
              emissive={currentRoom === type ? config.color : "#000"}
              emissiveIntensity={currentRoom === type ? 0.3 : 0}
            />
          </Box>
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.03}
            color="white"
            anchorX="center"
            maxWidth={0.8}
          >
            {config.label}
          </Text>
        </group>
      ))}

      {/* Voice toggle button */}
      <Box args={[1, 0.4, 0.1]} position={[0, 0.5, 1]} onClick={toggleVoices}>
        <meshStandardMaterial
          color={voicesActive ? "#e74c3c" : "#27ae60"}
          emissive={voicesActive ? "#c0392b" : "#229954"}
          emissiveIntensity={0.3}
        />
      </Box>
      <Text
        position={[0, 0.8, 1]}
        fontSize={0.15}
        color="white"
        anchorX="center"
      >
        {voicesActive ? "🔇 Stop Voices" : "🗣️ Start Voices"}
      </Text>

      {/* Speaking people indicators */}
      {voiceConfigs.map((config, index) => (
        <group
          key={index}
          position={config.position as [number, number, number]}
        >
          <Sphere args={[0.15]} scale={voicesActive ? 1.3 : 1}>
            <meshStandardMaterial
              color={voicesActive ? "#f39c12" : "#95a5a6"}
              emissive={voicesActive ? "#e67e22" : "#000"}
              emissiveIntensity={voicesActive ? 0.4 : 0}
            />
          </Sphere>
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.08}
            color="white"
            anchorX="center"
          >
            {config.label}
          </Text>
        </group>
      ))}

      {/* Current room indicator */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
      >
        Current Room: {roomConfigs[currentRoom].label}
      </Text>
      <Text position={[0, 2.2, 0]} fontSize={0.1} color="#aaa" anchorX="center">
        Walk around to hear voices in different spaces
      </Text>

      {/* Visual Room Representation */}
      <RoomVisualization config={roomConfigs[currentRoom]} />

      {/* OrbitControls for navigation */}
      <OrbitControls />

      {/* Reference grid - smaller now */}
      {[-1, 0, 1].map((x) =>
        [-1, 0, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            args={[0.03, 0.03, 0.03]}
            position={[x, 0.02, z]}
          >
            <meshBasicMaterial color="#888" />
          </Box>
        ))
      )}
    </group>
  );
}

const store = createXRStore();

export function AudioSpatialPage() {
  return (
    <div className="flex flex-col w-full h-full">
      <div className="p-4 border-b bg-black/80 backdrop-blur-md border-white/10">
        <h1 className="mb-2 text-2xl font-bold text-white">
          VR Room Acoustics with Resonance Audio
        </h1>
        <p className="mb-2 text-sm text-white/70">
          Click buttons to switch between room types and walk around in VR to
          experience how different room acoustics affect the same audio source.
          Use headphones for best experience.
        </p>
        <p className="text-xs text-white/60">
          Cathedral = massive echo, Small Room = dampened, Closet = dead sound
        </p>
        {/* VR Button */}

        <button
          onClick={() => store.enterVR()}
          className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700"
        >
          Enter VR
        </button>
      </div>

      <div className="flex-1">
        <Canvas>
          <XR store={store}>
            <XROrigin position={[0, 1.7, 0]}>
              <ambientLight intensity={0.3} />
              <pointLight position={[5, 5, 5]} />
              <VRRoomAcoustics />
            </XROrigin>
          </XR>
        </Canvas>
      </div>
    </div>
  );
}
