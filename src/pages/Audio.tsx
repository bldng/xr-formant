import { Box, OrbitControls, Sphere, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Mesh, Vector3 } from "three";

function AudioSource({
  position,
  color,
  label,
  frequency,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  frequency: number;
}) {
  const meshRef = useRef<Mesh>(null!);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [panner, setPanner] = useState<PannerNode | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    // Initialize audio context and nodes
    const ctx = new AudioContext();
    const pannerNode = ctx.createPanner();
    const gainNode = ctx.createGain();

    // Configure spatial audio for better HRTF processing
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = "linear";
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = 20;
    pannerNode.rolloffFactor = 2;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 360;
    pannerNode.coneOuterGain = 0;

    // Set initial position (Web Audio uses right-handed coordinate system)
    pannerNode.positionX.setValueAtTime(position[0], ctx.currentTime);
    pannerNode.positionY.setValueAtTime(position[1], ctx.currentTime);
    pannerNode.positionZ.setValueAtTime(position[2], ctx.currentTime);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.connect(pannerNode);
    pannerNode.connect(ctx.destination);

    setAudioContext(ctx);
    setPanner(pannerNode);

    return () => {
      if (ctx.state !== "closed") {
        ctx.close();
      }
    };
  }, [position]);

  // Update listener position based on camera
  useFrame(() => {
    if (audioContext && panner && isPlaying) {
      const listener = audioContext.listener;
      const cameraPos = camera.position;

      // Get camera's world matrix to properly calculate orientation
      camera.updateMatrixWorld();
      const forward = new Vector3(0, 0, -1);
      const up = new Vector3(0, 1, 0);

      // Transform by camera's world matrix
      forward.transformDirection(camera.matrixWorld);
      up.transformDirection(camera.matrixWorld);

      // Update listener position and orientation
      if (listener.positionX) {
        const currentTime = audioContext.currentTime;
        const rampTime = currentTime + 0.01; // Small ramp to avoid clicks

        // Position with smooth transitions
        listener.positionX.linearRampToValueAtTime(cameraPos.x, rampTime);
        listener.positionY.linearRampToValueAtTime(cameraPos.y, rampTime);
        listener.positionZ.linearRampToValueAtTime(cameraPos.z, rampTime);

        // Forward direction (where the listener is facing)
        listener.forwardX.linearRampToValueAtTime(forward.x, rampTime);
        listener.forwardY.linearRampToValueAtTime(forward.y, rampTime);
        listener.forwardZ.linearRampToValueAtTime(forward.z, rampTime);

        // Up direction (orientation of the listener's head)
        listener.upX.linearRampToValueAtTime(up.x, rampTime);
        listener.upY.linearRampToValueAtTime(up.y, rampTime);
        listener.upZ.linearRampToValueAtTime(up.z, rampTime);
      }
    }
  });

  const handleClick = async () => {
    if (!audioContext || !panner) return;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (isPlaying && oscillator) {
      // Smooth fade out to prevent clicks
      const gain = oscillator.context.createGain();
      oscillator.disconnect();
      oscillator.connect(gain);
      gain.connect(panner!);
      gain.gain.setValueAtTime(0.15, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.05
      );

      setTimeout(() => {
        oscillator.stop();
      }, 60);

      setOscillator(null);
      setIsPlaying(false);
    } else {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, audioContext.currentTime);

      // Smooth fade in to prevent clicks
      gain.gain.setValueAtTime(0.001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.15,
        audioContext.currentTime + 0.05
      );

      osc.connect(gain);
      gain.connect(panner);

      osc.start();
      setOscillator(osc);
      setIsPlaying(true);

      osc.onended = () => {
        setIsPlaying(false);
        setOscillator(null);
      };
    }
  };

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[0.5]}
        onClick={handleClick}
        scale={isPlaying ? 1.2 : 1}
      >
        <meshStandardMaterial color={isPlaying ? "#ff6b6b" : color} />
      </Sphere>
      <Text
        position={[0, 1, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      <Text
        position={[0, 0.7, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {frequency}Hz
      </Text>
      {isPlaying && (
        <>
          <Box args={[0.1, 0.1, 0.1]} position={[0, 0.8, 0]}>
            <meshBasicMaterial color="#4ecdc4" />
          </Box>
          {/* Audio waves visualization */}
          {[...Array(3)].map((_, i) => (
            <mesh key={i} position={[0, 0, 0]} scale={1 + i * 0.5}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial
                color="#4ecdc4"
                opacity={0.1 - i * 0.03}
                transparent
                wireframe
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function MovingAudioSource({
  radius = 4,
  speed = 1,
  mosquitoMode = false,
}: {
  radius?: number;
  speed?: number;
  mosquitoMode?: boolean;
}) {
  const meshRef = useRef<Mesh>(null!);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [panner, setPanner] = useState<PannerNode | null>(null);
  const [position, setPosition] = useState<[number, number, number]>([
    radius,
    0,
    0,
  ]);
  const { camera } = useThree();
  const timeRef = useRef(0);

  useEffect(() => {
    // Initialize audio context and nodes
    const ctx = new AudioContext();
    const pannerNode = ctx.createPanner();
    const gainNode = ctx.createGain();

    // Configure spatial audio
    pannerNode.panningModel = "HRTF";
    pannerNode.distanceModel = "linear";
    pannerNode.refDistance = 1;
    pannerNode.maxDistance = 20;
    pannerNode.rolloffFactor = 2;

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.connect(pannerNode);
    pannerNode.connect(ctx.destination);

    setAudioContext(ctx);
    setPanner(pannerNode);

    const startRhythmicSound = (ctx: AudioContext, gainNode: GainNode) => {
      if (mosquitoMode) {
        // Mosquito mode: continuous buzzing with frequency modulation
        const createMosquitoBuzz = () => {
          if (ctx.state === "closed") return;

          const osc = ctx.createOscillator();
          const buzzGain = ctx.createGain();
          const lfo = ctx.createOscillator(); // Low frequency oscillator for wing beat
          const lfoGain = ctx.createGain();

          // Main mosquito frequency (around 400-600 Hz)
          const baseFreq = 1200; // Much higher pitch for realistic mosquito buzz
          osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
          osc.type = "sawtooth"; // Harsh sawtooth for that annoying buzz

          // LFO for wing beat modulation (mosquito wings beat ~600 times per second)
          lfo.frequency.setValueAtTime(35, ctx.currentTime); // Faster modulation
          lfoGain.gain.setValueAtTime(200, ctx.currentTime); // More frequency modulation depth

          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);

          // Volume envelope - continuous buzz with slight variations
          buzzGain.gain.setValueAtTime(0.001, ctx.currentTime);
          buzzGain.gain.exponentialRampToValueAtTime(
            0.15,
            ctx.currentTime + 0.1
          );

          // Add random volume variations for realism
          setInterval(() => {
            if (ctx.state !== "closed") {
              const variation = 0.1 + Math.random() * 0.1;
              buzzGain.gain.exponentialRampToValueAtTime(
                variation,
                ctx.currentTime + 0.05
              );
            }
          }, 200 + Math.random() * 300);

          osc.connect(buzzGain);
          buzzGain.connect(gainNode);

          lfo.start();
          osc.start();

          // Mosquito buzzes continuously
          return { osc, lfo, buzzGain };
        };

        createMosquitoBuzz();
      } else {
        // Original rhythmic beat mode
        const playBeat = () => {
          if (ctx.state === "closed") return;

          const osc = ctx.createOscillator();
          const beatGain = ctx.createGain();

          // Create a rhythmic pattern with varying frequencies
          const beatFreq = 150 + Math.sin(timeRef.current * 2) * 50;
          osc.frequency.setValueAtTime(beatFreq, ctx.currentTime);
          osc.type = "square";

          // Short rhythmic pulses
          beatGain.gain.setValueAtTime(0.001, ctx.currentTime);
          beatGain.gain.exponentialRampToValueAtTime(
            0.3,
            ctx.currentTime + 0.01
          );
          beatGain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + 0.1
          );

          osc.connect(beatGain);
          beatGain.connect(gainNode);

          osc.start();
          osc.stop(ctx.currentTime + 0.15);

          // Schedule next beat
          setTimeout(playBeat, 200);
        };

        playBeat();
      }
    };

    // Start the rhythmic sound immediately
    if (ctx.state === "suspended") {
      ctx.resume().then(() => startRhythmicSound(ctx, gainNode));
    } else {
      startRhythmicSound(ctx, gainNode);
    }

    return () => {
      if (ctx.state !== "closed") {
        ctx.close();
      }
    };
  }, [mosquitoMode]); // Add mosquitoMode as dependency

  // Update position and audio
  useFrame((_state, delta) => {
    timeRef.current += delta * speed;

    // Calculate orbital position
    const x = Math.cos(timeRef.current) * radius;
    const z = Math.sin(timeRef.current) * radius;
    const y = Math.sin(timeRef.current * 2) * 0.5; // Slight vertical movement

    const newPosition: [number, number, number] = [x, y, z];
    setPosition(newPosition);

    // Update mesh position
    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
    }

    // Update audio position
    if (audioContext && panner) {
      const listener = audioContext.listener;
      const cameraPos = camera.position;

      // Update panner position
      const currentTime = audioContext.currentTime;
      const rampTime = currentTime + 0.01;

      panner.positionX.linearRampToValueAtTime(x, rampTime);
      panner.positionY.linearRampToValueAtTime(y, rampTime);
      panner.positionZ.linearRampToValueAtTime(z, rampTime);

      // Update listener
      if (listener.positionX) {
        camera.updateMatrixWorld();
        const forward = new Vector3(0, 0, -1);
        const up = new Vector3(0, 1, 0);

        forward.transformDirection(camera.matrixWorld);
        up.transformDirection(camera.matrixWorld);

        listener.positionX.linearRampToValueAtTime(cameraPos.x, rampTime);
        listener.positionY.linearRampToValueAtTime(cameraPos.y, rampTime);
        listener.positionZ.linearRampToValueAtTime(cameraPos.z, rampTime);

        listener.forwardX.linearRampToValueAtTime(forward.x, rampTime);
        listener.forwardY.linearRampToValueAtTime(forward.y, rampTime);
        listener.forwardZ.linearRampToValueAtTime(forward.z, rampTime);

        listener.upX.linearRampToValueAtTime(up.x, rampTime);
        listener.upY.linearRampToValueAtTime(up.y, rampTime);
        listener.upZ.linearRampToValueAtTime(up.z, rampTime);
      }
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[0.3]} position={position}>
        <meshStandardMaterial
          color={mosquitoMode ? "#8B4513" : "#ff6b6b"}
          emissive={mosquitoMode ? "#654321" : "#ff3333"}
          emissiveIntensity={mosquitoMode ? 0.2 : 0.3}
        />
      </Sphere>
      <Text
        position={[position[0], position[1] + 0.7, position[2]]}
        fontSize={0.2}
        color={mosquitoMode ? "#8B4513" : "#ff6b6b"}
        anchorX="center"
        anchorY="middle"
      >
        {mosquitoMode ? "🦟 Mosquito" : "Moving Beat"}
      </Text>
      {/* Trail effect */}
      {[...Array(5)].map((_, i) => {
        const trailX = Math.cos(timeRef.current - i * 0.2) * radius;
        const trailZ = Math.sin(timeRef.current - i * 0.2) * radius;
        const trailY = Math.sin((timeRef.current - i * 0.2) * 2) * 0.5;
        return (
          <Sphere key={i} args={[0.1]} position={[trailX, trailY, trailZ]}>
            <meshBasicMaterial
              color={mosquitoMode ? "#8B4513" : "#ff6b6b"}
              opacity={0.3 - i * 0.05}
              transparent
            />
          </Sphere>
        );
      })}
    </group>
  );
}

function AudioScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      {/* Audio sources positioned around the scene with different frequencies */}
      <AudioSource
        position={[-3, 0, 0]}
        color="#6c5ce7"
        label="Left"
        frequency={220}
      />
      <AudioSource
        position={[3, 0, 0]}
        color="#fd79a8"
        label="Right"
        frequency={330}
      />
      <AudioSource
        position={[0, 0, -3]}
        color="#00b894"
        label="Front"
        frequency={440}
      />
      <AudioSource
        position={[0, 0, 3]}
        color="#e17055"
        label="Rear"
        frequency={550}
      />
      <AudioSource
        position={[0, 2, 0]}
        color="#fdcb6e"
        label="Above"
        frequency={660}
      />
      <AudioSource
        position={[0, -1, 0]}
        color="#74b9ff"
        label="Below"
        frequency={110}
      />

      {/* Moving audio source with rhythmic beat */}
      <MovingAudioSource radius={4} speed={1.8} mosquitoMode={false} />

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2d3436" opacity={0.8} transparent />
      </mesh>

      {/* Center reference point (listener position) */}
      <Box args={[0.2, 0.2, 0.2]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#ddd" />
      </Box>
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Listener
      </Text>

      <OrbitControls />
    </>
  );
}

export function AudioPage() {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-black/80 backdrop-blur-md border-b border-white/10">
        <h1 className="text-2xl font-bold text-white mb-2">
          Spatial Audio Playground
        </h1>
        <p className="text-white/70 text-sm mb-2">
          Click on the colored spheres to toggle spatial audio sources. Each
          sphere plays a different frequency. The brown moving sphere is a
          mosquito buzzing around! Use headphones for best spatial audio
          experience.
        </p>
        <p className="text-white/60 text-xs">
          Move around and rotate the camera to experience 3D positioned audio.
          The white cube represents your listening position. Try swatting at the
          mosquito! 🦟
        </p>
      </div>

      <div className="flex-1">
        <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
          <AudioScene />
        </Canvas>
      </div>
    </div>
  );
}
