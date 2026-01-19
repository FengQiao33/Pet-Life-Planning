import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type Mood = "calm" | "active" | "careful" | "recovery";

export function ParticleRing({ mood, colors }: { mood: Mood; colors: [string, string] }) {
  const points = useRef<THREE.Points>(null!);

  const { geometry, material } = useMemo(() => {
    const count = 5200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 1.18 + Math.sin(i * 12.97) * 0.08 + (i % 13) * 0.0025;
      const y = (Math.sin(i * 0.12) * 0.22 + Math.cos(i * 0.07) * 0.18) * 0.35;
      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
      seeds[i] = (i % 1000) / 1000;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(colors[0]) },
        uColorB: { value: new THREE.Color(colors[1]) },
        uMood: { value: moodToFloat(mood) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uMood;
        attribute float aSeed;
        varying float vSeed;
        varying float vGlow;

        void main(){
          vSeed = aSeed;
          vec3 p = position;

          float t = uTime * (0.55 + uMood * 0.35);
          float wob = sin((aSeed * 6.2831) + t*1.7) * (0.02 + uMood*0.02);
          p.xz *= 1.0 + wob;
          p.y += sin((aSeed*20.0) + t*2.0) * (0.02 + (1.0-uMood)*0.02);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float dist = length(mv.xyz);
          gl_PointSize = (2.0 + 10.0 * (0.6 + 0.4*sin(t + aSeed*6.0))) * (1.0 / dist);
          vGlow = smoothstep(3.2, 1.2, dist);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uMood;
        varying float vSeed;
        varying float vGlow;

        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = dot(uv, uv);
          float core = smoothstep(0.22, 0.0, d);
          float halo = smoothstep(0.36, 0.0, d) * 0.65;

          float tw = 0.6 + 0.4*sin(uTime*1.3 + vSeed*18.0);
          vec3 col = mix(uColorA, uColorB, vSeed);
          col *= (0.75 + 0.45 * tw);

          float alpha = (core + halo) * (0.18 + 0.26*uMood) * (0.55 + 0.45*vGlow);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    return { geometry: geo, material: mat };
  }, [colors, mood]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uMood.value = moodToFloat(mood);
    points.current.rotation.y += 0.0016 + moodToFloat(mood) * 0.0012;
    points.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.25) * 0.08;
  });

  return (
    <points ref={points} geometry={geometry} material={material} frustumCulled={false}>
      {/* shader-driven */}
    </points>
  );
}

function moodToFloat(mood: Mood) {
  if (mood === "active") return 1.0;
  if (mood === "careful") return 0.72;
  if (mood === "recovery") return 0.5;
  return 0.62;
}

