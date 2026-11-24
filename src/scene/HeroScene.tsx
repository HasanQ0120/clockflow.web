import { Component, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Grid, Lightformer, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

export type SceneDrive = MutableRefObject<{ scroll: number; reveal: number }>;

const GREEN = new THREE.Color('#00ff88');
const RAW = new THREE.Color('#dffff0');

function shieldGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.3);
  s.bezierCurveTo(0.35, 1.05, 0.7, 0.95, 1.0, 0.95);
  s.lineTo(1.0, 0.1);
  s.bezierCurveTo(1.0, -0.65, 0.5, -1.1, 0, -1.4);
  s.bezierCurveTo(-0.5, -1.1, -1.0, -0.65, -1.0, 0.1);
  s.lineTo(-1.0, 0.95);
  s.bezierCurveTo(-0.7, 0.95, -0.35, 1.05, 0, 1.3);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 8, curveSegments: 40 });
  g.center();
  return g;
}

function checkGeometry() {
  const path = new THREE.CurvePath<THREE.Vector3>();
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.44, 0.02, 0), new THREE.Vector3(-0.13, -0.3, 0)));
  path.add(new THREE.LineCurve3(new THREE.Vector3(-0.13, -0.3, 0), new THREE.Vector3(0.46, 0.36, 0)));
  return new THREE.TubeGeometry(path, 32, 0.075, 14, false);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,255,136,0.8)');
  grad.addColorStop(0.45, 'rgba(0,200,110,0.3)');
  grad.addColorStop(1, 'rgba(0,255,136,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const rimMaterial = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0-abs(dot(normalize(vN),normalize(vV))), 2.2); gl_FragColor = vec4(vec3(0.0,1.0,0.53)*f*1.5, f); }',
});

const GATE_ANGLE = -1.2;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * The firewall: an angled glass shield that raw data passes through.
 * Chips arrive as pale, irregular "values"; as they cross the glass they become
 * uniform green placeholders and carry on to the other side.
 */
function Firewall({ drive, lite }: { drive: SceneDrive; lite: boolean }) {
  const world = useRef<THREE.Group>(null);
  const gate = useRef<THREE.Group>(null);
  const check = useRef<THREE.Mesh>(null);
  const chips = useRef<(THREE.Mesh | null)[]>([]);
  const { viewport } = useThree();
  const geo = useMemo(shieldGeometry, []);
  const checkGeo = useMemo(checkGeometry, []);
  const chipGeo = useMemo(() => new THREE.BoxGeometry(1, 0.07, 0.03), []);
  const rim = useMemo(rimMaterial, []);
  const glow = useMemo(glowTexture, []);
  const N = lite ? 9 : 15;
  const lanes = useMemo(() => Array.from({ length: N }, (_, i) => {
    const r = (k: number) => { const x = Math.sin((i + 1) * 12.9898 * k) * 43758.5453; return x - Math.floor(x); };
    return { y: (r(1) - 0.5) * 2.6, z: (r(2) - 0.5) * 1.1, w: 0.3 + r(3) * 0.6, speed: 0.55 + r(4) * 0.35, off: i / N };
  }), [N]);
  const mats = useMemo(() => lanes.map(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true })), [lanes]);
  useEffect(() => () => { geo.dispose(); checkGeo.dispose(); chipGeo.dispose(); rim.dispose(); glow.dispose(); mats.forEach((m) => m.dispose()); }, [geo, checkGeo, chipGeo, rim, glow, mats]);

  useFrame(({ clock, pointer, camera }, dt) => {
    const w = world.current, g = gate.current;
    if (!w || !g) return;
    const { scroll, reveal } = drive.current;
    const t = clock.elapsedTime;
    const wide = viewport.width / viewport.height > 1.15;
    const ease = 1 - Math.pow(1 - reveal, 3);
    const k = 1 - Math.exp(-dt * 4);
    const tx = wide ? viewport.width * 0.2 : 0;
    const ty = (wide ? 0 : -viewport.height * 0.04) + scroll * 1.1;
    w.position.x += (tx - w.position.x) * k;
    w.position.y += (ty - w.position.y) * k;
    w.rotation.y += (pointer.x * 0.18 - w.rotation.y) * k;
    w.rotation.x += (-pointer.y * 0.08 - w.rotation.x) * k;
    w.scale.setScalar((wide ? 1 : 0.62) * (0.6 + 0.4 * ease) * (1 - scroll * 0.25));
    // scrolling turns the gate toward the viewer: the glass opens up as you move on
    g.rotation.y += ((GATE_ANGLE + scroll * 0.95 + Math.sin(t * 0.3) * 0.05) - g.rotation.y) * k;
    g.position.y = Math.sin(t * 0.6) * 0.06;
    camera.position.z = 9 - 1.6 * ease + scroll * 1.4;
    camera.lookAt(0, 0, 0);
    if (check.current) check.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.03);

    const L = 7, a = g.rotation.y;
    const cos = Math.cos(a), sin = Math.sin(a) || 1e-3;
    lanes.forEach((ln, i) => {
      const m = chips.current[i];
      if (!m) return;
      const p = (t * 0.12 * ln.speed * 1.6 + ln.off) % 1;
      const x = (p - 0.5) * L;
      const cross = -ln.z * cos / sin;
      const f = smooth(cross - 0.28, cross + 0.28, x);
      m.position.set(x, ln.y + Math.sin(t * 9 + i) * 0.018 * (1 - f), ln.z);
      m.scale.set((ln.w + (0.42 - ln.w) * f) * (1 + 0.45 * Math.sin(Math.PI * f)), 1 + 0.4 * Math.sin(Math.PI * f), 1);
      const c = mats[i];
      c.color.copy(RAW).lerp(GREEN, f);
      c.opacity = (0.5 + 0.5 * f) * (1 - smooth(2.6, 3.5, Math.abs(x))) * smooth(-3.5, -2.6, x);
    });
  });

  return (
    <group ref={world}>
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={gate} rotation={[0, GATE_ANGLE, 0]} scale={1.1}>
        <mesh geometry={geo}>
          <MeshTransmissionMaterial
            samples={lite ? 3 : 6} resolution={lite ? 256 : 512} transmission={1} thickness={0.9} roughness={0.12}
            chromaticAberration={lite ? 0.02 : 0.06} anisotropicBlur={0.15} distortion={0.2} distortionScale={0.4}
            temporalDistortion={0.08} ior={1.25} color="#7dffc2" attenuationColor="#00a862" attenuationDistance={0.55}
          />
        </mesh>
        <mesh geometry={geo} scale={1.012} material={rim} />
        <mesh ref={check} geometry={checkGeo} position={[0, 0, 0.36]}>
          <meshBasicMaterial color="#00ff88" toneMapped={false} />
        </mesh>
        <pointLight color="#00ff88" intensity={6} distance={4} position={[0, 0, 0.5]} />
      </group>
      {lanes.map((_, i) => (
        <mesh key={i} ref={(m) => { chips.current[i] = m; }} geometry={chipGeo} material={mats[i]} />
      ))}
    </group>
  );
}

/** Perspective floor that scrolls toward the camera; one section-size loop is seamless. */
function Floor({ paused }: { paused: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !paused) ref.current.position.z = (clock.elapsedTime * 0.45) % 3;
  });
  return (
    <group ref={ref} position={[0, -2.6, 0]}>
      <Grid args={[60, 60]} cellSize={0.6} cellThickness={0.6} cellColor="#0b3a24" sectionSize={3} sectionThickness={1.1} sectionColor="#00ff88" fadeDistance={32} fadeStrength={1.6} infiniteGrid />
    </group>
  );
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[CloakFlow] 3D scene disabled:', err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export default function HeroScene({ drive }: { drive: SceneDrive }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ok] = useState(webglAvailable);
  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const lite = useMemo(() => window.innerWidth < 800 || (navigator.hardwareConcurrency ?? 8) <= 4, []);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const fallback = <div className="scene-fallback" aria-hidden="true" />;
  if (!ok) return fallback;
  return (
    <div ref={wrap} className="scene" aria-hidden="true">
      <SceneBoundary fallback={fallback}>
        <Canvas
          frameloop={visible && !reduce ? 'always' : 'demand'}
          dpr={[1, lite ? 1.25 : 1.75]}
          camera={{ position: [0, 0.2, 9], fov: 38 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())}
        >
          <ambientLight intensity={0.25} />
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={5} color="#d9ffe9" position={[0, 5, -4]} scale={[12, 3, 1]} />
            <Lightformer form="rect" intensity={3} color="#00ff88" position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
            <Lightformer form="ring" intensity={4} color="#00ff88" position={[5, 1, -2]} scale={5} />
          </Environment>
          <Firewall drive={drive} lite={lite} />
          <Floor paused={reduce} />
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
