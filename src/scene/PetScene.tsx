import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ParticleRing } from "./ParticleRing";

type Props = {
  species: string;
  ageYears: number;
  health: string;
};

export function PetScene({ species, ageYears, health }: Props) {
  const mood = useMemo(() => classifyMood(species, ageYears, health), [species, ageYears, health]);
  const palette = useMemo(() => paletteForMood(mood), [mood]);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.4, 3.2], fov: 45, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
    >
      <SceneLights tint={palette.tint} />
      <BackgroundNebula colors={palette.nebula} />
      <EnergyOrb mood={mood} colors={palette.orb} />
      <ParticleRing mood={mood} colors={palette.particles} />
      <Environment preset="sunset" />
      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={4.6} rotateSpeed={0.9} />
    </Canvas>
  );
}

function SceneLights({ tint }: { tint: THREE.ColorRepresentation }) {
  return (
    <>
      <ambientLight intensity={0.55} color={tint} />
      <directionalLight position={[3, 4, 2]} intensity={1.25} color={tint} />
      <pointLight position={[-3, -2, 3]} intensity={0.8} color={tint} />
    </>
  );
}

function BackgroundNebula({ colors }: { colors: [string, string, string] }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const mat = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uC1: { value: new THREE.Color(colors[0]) },
      uC2: { value: new THREE.Color(colors[1]) },
      uC3: { value: new THREE.Color(colors[2]) }
    };
    return new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vPos;
        void main(){
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform vec3 uC3;
        varying vec3 vPos;

        float hash(vec3 p){
          p = fract(p * 0.3183099 + vec3(0.1,0.2,0.3));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 p){
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f*f*(3.0-2.0*f);
          float n000 = hash(i + vec3(0,0,0));
          float n100 = hash(i + vec3(1,0,0));
          float n010 = hash(i + vec3(0,1,0));
          float n110 = hash(i + vec3(1,1,0));
          float n001 = hash(i + vec3(0,0,1));
          float n101 = hash(i + vec3(1,0,1));
          float n011 = hash(i + vec3(0,1,1));
          float n111 = hash(i + vec3(1,1,1));
          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          float nxy0 = mix(nx00, nx10, f.y);
          float nxy1 = mix(nx01, nx11, f.y);
          return mix(nxy0, nxy1, f.z);
        }

        void main(){
          vec3 p = normalize(vPos) * 2.2;
          float t = uTime * 0.06;
          float n = 0.0;
          n += 0.55 * noise(p * 1.3 + vec3(t, -t, t));
          n += 0.25 * noise(p * 2.6 + vec3(-t, t*1.2, -t));
          n += 0.20 * noise(p * 4.8 + vec3(t*1.6, t*0.8, -t));
          n = smoothstep(0.22, 0.88, n);

          float v = pow(1.0 - abs(p.y) * 0.26, 1.4);
          vec3 col = mix(uC1, uC2, n);
          col = mix(col, uC3, smoothstep(0.15, 0.95, v));
          float alpha = 0.45 * n + 0.14 * v;
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
  }, [colors]);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mesh.current.rotation.y += 0.0009;
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.08) * 0.06;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[18, 42, 42]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function EnergyOrb({ mood, colors }: { mood: Mood; colors: [string, string] }) {
  const mesh = useRef<THREE.Mesh>(null!);
  const { viewport } = useThree();

  const mat = useMemo(() => {
    const uniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colors[0]) },
      uColorB: { value: new THREE.Color(colors[1]) },
      uMood: { value: moodToFloat(mood) }
    };
    return new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vN;
        varying vec3 vP;
        void main(){
          vN = normalize(normalMatrix * normal);
          vP = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uMood;
        varying vec3 vN;
        varying vec3 vP;

        float fresnel(vec3 n, vec3 v){
          return pow(1.0 - max(dot(n, v), 0.0), 2.6);
        }

        float stripes(float x){
          return 0.5 + 0.5 * sin(x);
        }

        void main(){
          vec3 V = normalize(cameraPosition - vP);
          float f = fresnel(normalize(vN), V);

          float t = uTime;
          float swirl = sin((vN.x + vN.y*1.1 + vN.z*0.9) * 6.0 + t * (1.2 + uMood*0.4));
          float band = stripes((vN.y * 10.5) + t * (0.9 + uMood*0.3));
          float pulse = 0.55 + 0.45 * sin(t * (1.6 + uMood*0.2));

          float core = smoothstep(0.05, 0.95, band) * (0.55 + 0.45 * swirl);
          core = clamp(core, 0.0, 1.0);

          vec3 col = mix(uColorA, uColorB, core);
          float alpha = (0.22 + 0.55 * f) * pulse;
          alpha *= 0.92;

          gl_FragColor = vec4(col, alpha);
        }
      `
    });
  }, [colors, mood]);

  useFrame(({ clock, pointer }) => {
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uMood.value = moodToFloat(mood);
    const t = clock.getElapsedTime();
    const wobble = 0.04 + moodToFloat(mood) * 0.02;
    mesh.current.position.x = pointer.x * viewport.width * 0.02;
    mesh.current.position.y = 0.08 + Math.sin(t * 0.9) * wobble + pointer.y * viewport.height * 0.01;
    mesh.current.rotation.y += 0.004 + moodToFloat(mood) * 0.0015;
    mesh.current.rotation.x = Math.sin(t * 0.4) * 0.14;
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[0.72, 96, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

type Mood = "calm" | "active" | "careful" | "recovery";

function classifyMood(species: string, ageYears: number, health: string): Mood {
  const s = (species || "").toLowerCase();
  const senior = ageYears >= 8;
  if (health.includes("老年") || health.includes("慢病")) return "recovery";
  if (health.includes("关节")) return "careful";
  if (health.includes("肠胃") || health.includes("皮肤")) return "careful";
  if (health.includes("偏瘦")) return "active";
  if (health.includes("偏胖")) return "careful";
  if (senior) return "careful";
  if (s.includes("边牧") || s.includes("牧羊") || s.includes("husky") || s.includes("哈士奇")) return "active";
  if (s.includes("金毛") || s.includes("拉布拉多") || s.includes("dog") || s.includes("犬")) return "active";
  return "calm";
}

function paletteForMood(mood: Mood) {
  if (mood === "active") {
    return {
      tint: "#baf7ff",
      orb: ["#6ee7ff", "#a78bfa"] as [string, string],
      particles: ["#6ee7ff", "#22c55e"] as [string, string],
      nebula: ["#0ea5e9", "#a78bfa", "#22c55e"] as [string, string, string]
    };
  }
  if (mood === "careful") {
    return {
      tint: "#e9f2ff",
      orb: ["#a78bfa", "#6ee7ff"] as [string, string],
      particles: ["#a78bfa", "#fbbf24"] as [string, string],
      nebula: ["#6366f1", "#0ea5e9", "#fbbf24"] as [string, string, string]
    };
  }
  if (mood === "recovery") {
    return {
      tint: "#e7fff4",
      orb: ["#34d399", "#6ee7ff"] as [string, string],
      particles: ["#34d399", "#6ee7ff"] as [string, string],
      nebula: ["#22c55e", "#0ea5e9", "#a78bfa"] as [string, string, string]
    };
  }
  return {
    tint: "#eaf2ff",
    orb: ["#6ee7ff", "#60a5fa"] as [string, string],
    particles: ["#6ee7ff", "#a78bfa"] as [string, string],
    nebula: ["#0ea5e9", "#60a5fa", "#a78bfa"] as [string, string, string]
  };
}

function moodToFloat(mood: Mood) {
  if (mood === "active") return 1.0;
  if (mood === "careful") return 0.65;
  if (mood === "recovery") return 0.4;
  return 0.55;
}

