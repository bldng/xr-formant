import { useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef } from "react";
import * as THREE from "three";

export function XRPostprocessing() {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const blurMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const { enabled, effectType, blurIntensity, clearRadius } = useControls(
    "XR Visual Effects",
    {
      enabled: true,
      effectType: {
        value: "vignette",
        options: ["none", "blur", "vignette"],
      },
      blurIntensity: { value: 50, min: 0, max: 100, step: 1 },
      clearRadius: { value: 30, min: 5, max: 80, step: 1 },
    }
  );

  useFrame((state) => {
    if (groupRef.current && gl.xr.isPresenting && enabled) {
      const xrCamera = gl.xr.getCamera();
      if (xrCamera && groupRef.current.parent !== xrCamera) {
        xrCamera.add(groupRef.current);
        groupRef.current.position.set(0, 0, -1);
        groupRef.current.rotation.set(0, 0, 0);
      }
    }

    // Update shader uniforms
    if (blurMaterialRef.current) {
      blurMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
      blurMaterialRef.current.uniforms.blurIntensity.value = blurIntensity;
      blurMaterialRef.current.uniforms.clearRadius.value = clearRadius;
    }
  });

  if (!gl.xr.isPresenting || !enabled || effectType === "none") return null;

  return (
    <group ref={groupRef}>
      {/* Radial blur - sharp center, blurry edges */}
      {effectType === "blur" && (
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[4, 4]} />
          <shaderMaterial
            ref={blurMaterialRef}
            transparent={true}
            depthTest={false}
            depthWrite={false}
            vertexShader={
              /*glsl*/ `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `
            }
            fragmentShader={
              /*glsl*/ `
              varying vec2 vUv;
              uniform float blurIntensity;
              uniform float clearRadius;
              uniform float time;
              
              float random(vec2 co) {
                return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
              }
              
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distance = length(vUv - center);
                float intensity = blurIntensity / 100.0;
                float radius = clearRadius / 100.0;
                
                // Sharp transition from clear to heavily blurred
                float blurAmount = smoothstep(radius * 0.8, radius, distance) * intensity;
                
                if (blurAmount > 0.01) {
                  // Multiple noise layers with animation for dynamic feel
                  vec2 animatedUv = vUv + vec2(sin(time * 0.3) * 0.01, cos(time * 0.4) * 0.01);
                  
                  vec2 noiseUv1 = animatedUv * 80.0 + time * 0.2;
                  vec2 noiseUv2 = animatedUv * 40.0 - time * 0.15;
                  vec2 noiseUv3 = animatedUv * 20.0 + time * 0.1;
                  vec2 noiseUv4 = animatedUv * 10.0 - time * 0.05;
                  
                  float noise1 = random(noiseUv1);
                  float noise2 = random(noiseUv2);
                  float noise3 = random(noiseUv3);
                  float noise4 = random(noiseUv4);
                  
                  // Heavy layered noise for extreme blur
                  float combinedNoise = (noise1 * 0.4 + noise2 * 0.3 + noise3 * 0.2 + noise4 * 0.1);
                  
                  // Pulsing effect for more dynamics
                  float pulse = sin(time * 2.0) * 0.1 + 1.0;
                  
                  vec3 blurColor = mix(
                    vec3(1.0), 
                    vec3(0.6 + sin(time * 0.5) * 0.2, 0.8, 0.9 + cos(time * 0.3) * 0.1), 
                    combinedNoise * 0.8
                  );
                  
                  // Much higher opacity for extreme blur
                  float alpha = blurAmount * pulse * (0.9 + combinedNoise * 1.2);
                  alpha = min(alpha, 0.99); // Cap at 99% to avoid complete blackout

                  gl_FragColor = vec4(blurColor, alpha);
                } else {
                  // Center stays clear
                  gl_FragColor = vec4(1.0, 1.0, 1.0, 0.0);
                }
              }
            `
            }
            uniforms={{
              blurIntensity: { value: blurIntensity },
              clearRadius: { value: clearRadius },
              time: { value: 0 },
            }}
          />
        </mesh>
      )}

      {/* Your working vignette */}
      {effectType === "vignette" && (
        <mesh position={[0, 0, -0.2]}>
          <planeGeometry args={[4, 4]} />
          <shaderMaterial
            transparent={true}
            depthTest={false}
            depthWrite={false}
            vertexShader={
              /*glsl*/ `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `
            }
            fragmentShader={
              /*glsl*/ `
              varying vec2 vUv;
              uniform float blurIntensity;
              
              void main() {
                vec2 center = vec2(0.5, 0.5);
                float distance = length(vUv - center);
                float vignette = smoothstep(0.15, 0.7, distance);
                float intensity = blurIntensity / 100.0;
                gl_FragColor = vec4(0.0, 0.0, 0.0, vignette * intensity);
              }
            `
            }
            uniforms={{
              blurIntensity: { value: blurIntensity },
            }}
          />
        </mesh>
      )}
    </group>
  );
}

export default XRPostprocessing;
