import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// XR Visual Filter component - for blur/glass effects since postprocessing doesn't work in XR
export function XRVisualFilter() {
  const { gl } = useThree();
  const boxRef = useRef<THREE.Mesh>(null);
  const retinopathyMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // Load the cataract texture
  const cataractTexture = useLoader(THREE.TextureLoader, "/mat/cataract.jpg");

  // Memoize uniforms to prevent recreation on every render
  const retinopathyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
    }),
    []
  );

  const {
    glasses,
    vignetteIntensity,
    blurIntensity,
    blurEnabled,
    // Age-related macular degeneration
    amdVision,
    amdIntensity,
    cataract,
    cataractIntensity,
    retinopathy,
    retinopathyIntensity,
  } = useControls({
    glasses: { value: false },
    vignetteIntensity: { value: 50, min: 0, max: 100, step: 1 },
    blurEnabled: { value: false },
    blurIntensity: { value: 5, min: 1.0, max: 10.0, step: 0.1 },
    amdVision: { value: false },
    amdIntensity: { value: 50, min: 10, max: 90, step: 5 },
    cataract: { value: false },
    cataractIntensity: { value: 50, min: 10, max: 100, step: 5 },
    retinopathy: { value: false },
    retinopathyIntensity: { value: 50, min: 10, max: 100, step: 5 },
  });

  useFrame((state) => {
    if (boxRef.current && gl.xr.isPresenting) {
      // Just add the box as child to the XR camera directly
      const xrCamera = gl.xr.getCamera();
      if (xrCamera && boxRef.current.parent !== xrCamera) {
        xrCamera.add(boxRef.current);
        boxRef.current.position.set(0, 0, -1); // 1 unit in front in camera space
        boxRef.current.rotation.set(0, 0, 0);
      }
    }

    // Update retinopathy animation
    if (retinopathyMaterialRef.current) {
      retinopathyMaterialRef.current.uniforms.uTime.value =
        state.clock.elapsedTime / 10;
      retinopathyMaterialRef.current.uniforms.uIntensity.value =
        retinopathyIntensity / 100.0;
    }
  });

  // Only render in XR mode
  if (!gl.xr.isPresenting) return null;

  return (
    <group ref={boxRef}>
      {/* Test Box */}
      {/* <mesh scale={[0.3, 0.2, 0.05]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh> */}

      {glasses && (
        <mesh position={[0, 0.5, -1]} scale={[15, 15, 1]}>
          <sphereGeometry args={[0.2]} />
          {/* <meshPhysicalMaterial
            transmission={0.1}
            thickness={1.5}
            roughness={100.5}
            ior={1.5}
            anisotropy={0.15}
            transparent={true}
            opacity={0.8}
            color="#88ccff"
          /> */}

          <meshPhysicalMaterial
            transmission={1.0}
            thickness={0.1}
            roughness={10000}
            ior={1.5}
            anisotropy={0.15}
            reflectivity={0}
          />
        </mesh>
      )}

      {vignetteIntensity > 0 && (
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[4, 4]} />
          <shaderMaterial
            transparent={true}
            opacity={vignetteIntensity / 100.0}
            depthTest={false}
            depthWrite={false}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distance = length(vUv - center);
                float vignette = smoothstep(0.15, 0.7, distance);
                gl_FragColor = vec4(0.0, 0.0, 0.0, vignette);
              }
            `}
          />
        </mesh>
      )}

      {blurEnabled && (
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[4, 4]} />
          <meshPhysicalMaterial
            transmission={1.0}
            thickness={0.01}
            roughness={blurIntensity / 10.0}
            ior={1.5}
            transparent={true}
            opacity={1}
            color="#ffffff"
            metalness={0}
            clearcoat={0}
            envMapIntensity={0}
          />
        </mesh>
      )}

      {amdVision && (
        <mesh
          position={[0, 0, -0.15]}
          scale={[amdIntensity / 25.0, amdIntensity / 25.0, 1]}
        >
          <planeGeometry args={[4, 4]} />
          <shaderMaterial
            transparent={true}
            opacity={1.0}
            depthTest={false}
            depthWrite={false}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distance = length(vUv - center);
                
                // Create smooth amd effect - clear in center, dark at edges
                float amd = 1.0 - smoothstep(0.1, 0.5, distance);
                
                gl_FragColor = vec4(0.0, 0.0, 0.0, amd);
              }
            `}
          />
        </mesh>
      )}

      {cataract && (
        <>
          {/* Base orange tint */}
          <mesh position={[0, 0, -0.05]} scale={[1, 1, 1]}>
            <planeGeometry args={[4, 4]} />
            <shaderMaterial
              transparent={true}
              opacity={0.1}
              depthTest={false}
              depthWrite={false}
              vertexShader={`
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                varying vec2 vUv;
                
                void main() {
                  vec2 uv = vUv;
                  vec2 center = vec2(0.5, 0.5);
                  float distance = length(uv - center);
                  
                  // Very subtle overall cloudiness - like the reference
                  float clouds = sin(uv.x * 3.0) * sin(uv.y * 2.5) * 0.1;
                  clouds = smoothstep(-0.8, 0.2, clouds);
                  
                  // Gentle radial variation
                  float radial = 1.0 - smoothstep(0.3, 1.0, distance);
                  
                  // Mostly uniform tinting with very subtle variation
                  float opacity = 0.6 + clouds * 0.2 + radial * 0.1;
                  opacity = clamp(opacity, 0.4, 0.8);
                  
                  // Warm orange-yellow tint matching the reference
                  vec3 cataractColor = vec3(1.0, 0.75, 0.45);
                  
                  gl_FragColor = vec4(cataractColor, opacity);
                }
              `}
            />
          </mesh>

          {/* Cataract texture overlay */}
          <mesh position={[0, 0, -0.06]}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial
              map={cataractTexture}
              opacity={cataractIntensity / 200.0}
              blending={THREE.MultiplyBlending}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        </>
      )}

      {retinopathy && (
        <mesh position={[0, 0, -0.08]}>
          <planeGeometry args={[4, 4, 128, 128]} />
          <shaderMaterial
            ref={retinopathyMaterialRef}
            transparent={true}
            opacity={1.0}
            depthTest={false}
            depthWrite={false}
            uniforms={retinopathyUniforms}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              uniform float uTime;
              uniform float uIntensity;
              
              // Improved noise function
              float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
              }
              
              float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                
                return mix(
                  mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                  mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                  u.y
                );
              }
              
              // Fractal noise for more organic patterns
              float fbm(vec2 p) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                
                for(int i = 0; i < 4; i++) {
                  value += amplitude * noise(frequency * p);
                  amplitude *= 0.5;
                  frequency *= 2.0;
                }
                return value;
              }
              
              // Create flowing, organic distortion field
              vec2 flowField(vec2 uv, float time) {
                // Multiple layers of flow at different scales and speeds
                vec2 flow = vec2(0.0);
                
                // Large scale flow
                flow += vec2(
                  sin(uv.x * 2.0 + time * 0.5) * cos(uv.y * 1.5 + time * 0.3),
                  cos(uv.x * 1.8 + time * 0.4) * sin(uv.y * 2.2 + time * 0.6)
                ) * 0.8;
                
                // Medium scale turbulence
                flow += vec2(
                  fbm(uv * 3.0 + time * 0.2) - 0.5,
                  fbm(uv * 3.0 + vec2(5.2, 1.3) + time * 0.15) - 0.5
                ) * 0.6;
                
                // Small scale details
                flow += vec2(
                  noise(uv * 8.0 + time * 0.8) - 0.5,
                  noise(uv * 8.0 + vec2(3.7, 9.1) + time * 0.7) - 0.5
                ) * 0.3;
                
                return flow * 0.1;
              }
              
              void main() {
                vec2 uv = vUv;
                
                // Create flowing distortion
                vec2 flow = flowField(uv, uTime);
                vec2 distortedUV = uv + flow;
                
                // Create organic worm-like patterns using the flow field
                float pattern1 = fbm(distortedUV * 4.0 + uTime * 0.1);
                float pattern2 = fbm(distortedUV * 6.0 - uTime * 0.08);
                float pattern3 = fbm(distortedUV * 8.0 + uTime * 0.12);
                
                // Combine patterns to create worm-like structures
                float worms = pattern1 * 0.5 + pattern2 * 0.3 + pattern3 * 0.2;
                
                // Create more defined worm shapes by using ridged noise with better anti-aliasing
                float ridged = abs(worms * 2.0 - 1.0);
                ridged = 1.0 - ridged;
                
                // Use fwidth for automatic anti-aliasing based on screen resolution
                float edge = fwidth(ridged) * 2.0;
                ridged = smoothstep(0.4 - edge, 0.8 + edge, ridged);
                
                // Add flowing animation to the worms
                float flowMag = length(flow);
                float animated = ridged + sin(uTime * 2.0 + flowMag * 10.0) * 0.1;
                
                // Create final worm pattern with better anti-aliased edges
                float patternEdge = fwidth(animated) * 1.5;
                float finalPattern = smoothstep(0.3 - patternEdge, 0.7 + patternEdge, animated);
                
                // Add some variation in thickness with smoother transitions
                float thickness = noise(distortedUV * 12.0 + uTime * 0.3) * 0.3 + 0.7;
                float thicknessEdge = fwidth(thickness) * 2.0;
                thickness = smoothstep(0.2 - thicknessEdge, 0.8 + thicknessEdge, thickness);
                finalPattern *= thickness;
                
                // Pulsing effect
                float pulse = sin(uTime * 1.5) * 0.2 + 0.8;
                finalPattern *= pulse;
                
                // INVERT THE PATTERN: What was light should be dark, what was dark should be transparent
                float invertedPattern = 1.0 - finalPattern;
                
                // Pure black floaters
                vec3 darkColor = vec3(0.0, 0.0, 0.0);
                vec3 finalColor = darkColor;
                
                // Use inverted pattern so cloudy light areas become dark blocking floaters
                float alpha = invertedPattern * uIntensity;
                
                gl_FragColor = vec4(finalColor, alpha);
              }
            `}
          />
        </mesh>
      )}
    </group>
  );
}
