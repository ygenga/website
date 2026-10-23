import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import DOTS from "./dots.json";

const R = 1;
const DEG = Math.PI / 180;
// The order of the story: Vienna → Seoul → Lisbon → Kingston
const CITIES = [
  { name: "Vienna", lat: 48.2, lon: 16.4 },
  { name: "Seoul", lat: 37.6, lon: 127.0 },
  { name: "Lisbon", lat: 38.7, lon: -9.1 },
  { name: "Kingston", lat: 44.2, lon: -76.5 },
];

function toVec(lat, lon, r = R, target = new THREE.Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return target.set(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

// Round, depth-faded dots; same pattern as the Pointcloud demo's DotMaterial in the R3F repo
class GlobeDotMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color("#8fb0ff") }, uSize: { value: 2.6 }, uOpacity: { value: 0.6 } },
      vertexShader: /* glsl */ `
        uniform float uSize;
        varying float vFade;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * position);
          vFade = smoothstep(-0.15, 0.55, n.z);
          gl_PointSize = uSize * (3.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uColor, uOpacity * (0.1 + 0.9 * vFade));
          #include <colorspace_fragment>
        }`,
    });
  }
}
extend({ GlobeDotMaterial });

function Dots({ dpr }) {
  const positions = useMemo(() => {
    const arr = new Float32Array((DOTS.length / 2) * 3);
    const v = new THREE.Vector3();
    for (let i = 0, j = 0; i < DOTS.length; i += 2, j += 3) {
      toVec(DOTS[i], DOTS[i + 1], R, v);
      arr[j] = v.x; arr[j + 1] = v.y; arr[j + 2] = v.z;
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <globeDotMaterial uniforms-uSize-value={2.6 * dpr} />
    </points>
  );
}

function Arc({ from, to, index, progress }) {
  const ref = useRef();
  const geometry = useMemo(() => {
    const a = toVec(from.lat, from.lon, R * 1.005);
    const b = toVec(to.lat, to.lon, R * 1.005);
    const lift = 1 + 0.35 * (a.angleTo(b) / Math.PI);
    const mid = a.clone().add(b).normalize().multiplyScalar(R * lift);
    const pts = new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(96);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [from, to]);
  useFrame(() => {
    // Mutate the draw range directly; no React state in the frame loop
    const f = THREE.MathUtils.clamp(progress.current * 3 - index, 0, 1);
    geometry.setDrawRange(0, Math.floor(f * 97));
  });
  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
    </line>
  );
}

function City({ city, index, progress }) {
  const ring = useRef();
  const core = useRef();
  const pos = useMemo(() => toVec(city.lat, city.lon, R * 1.01), [city]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  useFrame(({ clock }) => {
    const reached = progress.current * 3 >= index - 0.02;
    const active = Math.abs(progress.current * 3 - index) < 0.5;
    const t = (clock.elapsedTime * 0.8) % 1;
    ring.current.scale.setScalar(active ? 1 + t * 2.2 : 0.001);
    ring.current.material.opacity = active ? 0.7 * (1 - t) : 0;
    core.current.material.color.set(reached ? "#ffffff" : "#8fb0ff");
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh ref={core}>
        <circleGeometry args={[0.018, 24]} />
        <meshBasicMaterial color="#8fb0ff" toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.02, 0.026, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Earth({ progress, reduced }) {
  const tilt = useRef();
  const spin = useRef();
  useFrame((_, delta) => {
    const s = THREE.MathUtils.clamp(progress.current, 0, 1) * 3;
    const i = Math.min(Math.floor(s), 2);
    const f = THREE.MathUtils.smootherstep(s - i, 0, 1);
    const a = CITIES[i], b = CITIES[i + 1];
    const lat = THREE.MathUtils.lerp(a.lat, b.lat, f) * 0.6;
    const lon = THREE.MathUtils.lerp(a.lon, b.lon, f);
    const ty = -Math.PI / 2 - lon * DEG;
    const tx = lat * DEG;
    const k = reduced ? 1000 : 4;
    spin.current.rotation.y = THREE.MathUtils.damp(spin.current.rotation.y, ty, k, delta);
    tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, tx, k, delta);
  });
  return (
    <group ref={tilt}>
      <group ref={spin} rotation={[0, -Math.PI / 2 - CITIES[0].lon * DEG, 0]}>
        <mesh>
          <sphereGeometry args={[R * 0.985, 64, 64]} />
          <meshBasicMaterial color="#0d1726" toneMapped={false} />
        </mesh>
        <Dots dpr={Math.min(window.devicePixelRatio || 1, 2)} />
        {CITIES.slice(0, -1).map((c, i) => <Arc key={c.name} from={c} to={CITIES[i + 1]} index={i} progress={progress} />)}
        {CITIES.map((c, i) => <City key={c.name} city={c} index={i} progress={progress} />)}
      </group>
    </group>
  );
}

export default function Globe({ getProgress, reduced }) {
  const wrap = useRef();
  const progress = useRef(0);
  const [visible, setVisible] = useState(false);
  // Only render while on screen ("don't mount indiscriminately" / on-demand rendering)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} style={{ width: "100%", height: "100%" }}>
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 3.7], fov: 35 }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ProgressSync progress={progress} getProgress={getProgress} />
        <Earth progress={progress} reduced={reduced} />
      </Canvas>
    </div>
  );
}

function ProgressSync({ progress, getProgress }) {
  useFrame(() => { progress.current = getProgress(); });
  return null;
}
