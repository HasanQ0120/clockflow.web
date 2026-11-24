import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type SceneMode = 'idle' | 'scanning' | 'airgap' | 'verified';

interface CyberGridCanvasProps {
  mode: SceneMode;
  zenInspect?: boolean;
}

const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _targetColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createProceduralGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, size, size);

    // Sub-grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    // Major cyber-grid border
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.24)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);

    // Intersection crosshair accent
    ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.fillRect(0, 0, 5, 5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 28);
  texture.anisotropy = Math.min(8, maxAnisotropy || 1);
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      10,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(3, 7, 18, 0.36)');
    grad.addColorStop(1, 'rgba(3, 7, 18, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function CyberGridCanvas({ mode, zenInspect = false }: CyberGridCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef<SceneMode>(mode);
  const zenRef = useRef<boolean>(zenInspect);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    zenRef.current = zenInspect;
  }, [zenInspect]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const disposables: Array<{ dispose: () => void }> = [];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.FogExp2(0x09090b, 0.048);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 140);
    camera.position.set(0, 3.6, 11.2);
    camera.lookAt(0, 1.4, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    // Studio environment reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    disposables.push(envRT);
    pmremGenerator.dispose();

    // Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x064e3b, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 1.85);
    keyLight.position.set(6, 11, 7);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -8;
      keyLight.shadow.camera.right = 8;
      keyLight.shadow.camera.top = 8;
      keyLight.shadow.camera.bottom = -8;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 1.25);
    rimLight.position.set(-6, 5, -7);
    scene.add(rimLight);

    // 1. Cyber-Grid Floor Plane
    const gridTexture = createProceduralGridTexture(
      renderer.capabilities.getMaxAnisotropy()
    );
    disposables.push(gridTexture);

    const floorGeo = new THREE.PlaneGeometry(90, 90, 1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gridTexture,
      roughness: 0.78,
      metalness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);
    disposables.push(floorGeo, floorMat);

    // 2. InstancedMesh Cyber-Grid Telemetry Nodes (144 nodes)
    const gridCountSide = 12;
    const nodeCount = gridCountSide * gridCountSide;
    const nodeGeo = new THREE.OctahedronGeometry(0.055, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8,
    });
    const nodesMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    const nodeColor = new THREE.Color();
    let idx = 0;
    for (let x = 0; x < gridCountSide; x++) {
      for (let z = 0; z < gridCountSide; z++) {
        const px = (x - (gridCountSide - 1) / 2) * 3.2;
        const pz = (z - (gridCountSide - 1) / 2) * 3.2 - 3.5;
        const sc = 0.85 + ((x + z) % 3) * 0.15;
        _vec3.set(px, 0.04, pz);
        _scale.set(sc, sc, sc);
        _mat4.compose(_vec3, _quat, _scale);
        nodesMesh.setMatrixAt(idx, _mat4);
        nodeColor.setHex((x + z) % 2 === 0 ? 0x10b981 : 0x06b6d4);
        nodesMesh.setColorAt(idx, nodeColor);
        idx++;
      }
    }
    nodesMesh.instanceMatrix.needsUpdate = true;
    if (nodesMesh.instanceColor) nodesMesh.instanceColor.needsUpdate = true;
    nodesMesh.computeBoundingSphere();
    scene.add(nodesMesh);
    disposables.push(nodeGeo, nodeMat);

    // 3. Composite 8-Part 3D Privacy Shield Core (THREE.Group pivoted at bottom-center y=0)
    const shieldAssembly = new THREE.Group();
    shieldAssembly.position.set(0, 0, -2.2);
    scene.add(shieldAssembly);

    // Contact shadow grounding disc
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.CircleGeometry(2.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.015;
    shieldAssembly.add(contactShadow);
    disposables.push(shadowTex, shadowGeo, shadowMat);

    // Part 1: Lathe Obsidian Pedestal Base
    const lathePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.55, 0.0),
      new THREE.Vector2(1.42, 0.14),
      new THREE.Vector2(1.05, 0.22),
      new THREE.Vector2(0.88, 0.42),
      new THREE.Vector2(0.0, 0.42),
    ];
    const baseGeo = new THREE.LatheGeometry(lathePoints, 32);
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.82,
      metalness: 0.18,
    });
    const baseMesh = new THREE.Mesh(baseGeo, obsidianMat);
    baseMesh.castShadow = !isSoftwareGl;
    baseMesh.receiveShadow = !isSoftwareGl;
    shieldAssembly.add(baseMesh);
    disposables.push(baseGeo, obsidianMat);

    // Part 2: Brushed Titanium Chassis Collar
    const collarGeo = new THREE.CylinderGeometry(0.95, 1.08, 0.16, 24);
    const titaniumMat = new THREE.MeshPhysicalMaterial({
      color: 0x64748b,
      roughness: 0.26,
      metalness: 0.92,
      anisotropy: 0.7,
    });
    const collarMesh = new THREE.Mesh(collarGeo, titaniumMat);
    collarMesh.position.y = 0.48;
    collarMesh.castShadow = !isSoftwareGl;
    shieldAssembly.add(collarMesh);
    disposables.push(collarGeo, titaniumMat);

    // Part 3: Beveled Shield Outer Frame (ExtrudeGeometry)
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(0, 2.05, 0);
    shieldAssembly.add(shieldGroup);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.28);
    shieldShape.lineTo(0.95, 0.86);
    shieldShape.lineTo(0.82, -0.32);
    shieldShape.lineTo(0, -1.18);
    shieldShape.lineTo(-0.82, -0.32);
    shieldShape.lineTo(-0.95, 0.86);
    shieldShape.closePath();

    const frameHole = new THREE.Path();
    frameHole.moveTo(0, 1.02);
    frameHole.lineTo(0.72, 0.68);
    frameHole.lineTo(0.62, -0.24);
    frameHole.lineTo(0, -0.9);
    frameHole.lineTo(-0.62, -0.24);
    frameHole.lineTo(-0.72, 0.68);
    frameHole.closePath();
    shieldShape.holes.push(frameHole);

    const frameGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    frameGeo.center();
    const frameMesh = new THREE.Mesh(frameGeo, titaniumMat);
    frameMesh.castShadow = !isSoftwareGl;
    shieldGroup.add(frameMesh);
    disposables.push(frameGeo);

    // Part 4: Optical Glass Inner Shield Visor
    const visorShape = new THREE.Shape();
    visorShape.moveTo(0, 0.98);
    visorShape.lineTo(0.68, 0.65);
    visorShape.lineTo(0.58, -0.22);
    visorShape.lineTo(0, -0.84);
    visorShape.lineTo(-0.58, -0.22);
    visorShape.lineTo(-0.68, 0.65);
    visorShape.closePath();

    const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    visorGeo.center();
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x064e3b,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      ior: 1.55,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 0.92,
      depthWrite: false,
    });
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.renderOrder = 2;
    shieldGroup.add(visorMesh);
    disposables.push(visorGeo, visorMat);

    // Part 5: Reactive Core Encryption Crystal
    const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.4,
      roughness: 0.18,
      metalness: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.z = 0.12;
    shieldGroup.add(coreMesh);
    disposables.push(coreGeo, coreMat);

    // Part 6 & 7: Inner Gyroscopic Ring + Outer Security Halo
    const innerRingGeo = new THREE.TorusGeometry(1.38, 0.026, 12, 48);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.85,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    shieldGroup.add(innerRing);

    const outerRingGeo = new THREE.TorusGeometry(1.75, 0.022, 12, 56);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.88,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    shieldGroup.add(outerRing);
    disposables.push(innerRingGeo, innerRingMat, outerRingGeo, outerRingMat);

    // Part 8: 4 Fiber-Optic Conduit Tubes connecting pedestal to floor
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x10b981,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.75,
    });
    disposables.push(conduitMat);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cos * 0.9, 0.44, sin * 0.9),
        new THREE.Vector3(cos * 1.65, 0.24, sin * 1.65),
        new THREE.Vector3(cos * 2.55, 0.03, sin * 2.55),
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.032, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, conduitMat);
      shieldAssembly.add(tubeMesh);
      disposables.push(tubeGeo);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onPointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      pointerRef.current.y = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (event: Event) => {
      event.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let frameId = 0;
    let disposed = false;
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const nowMs = performance.now();
      const delta = Math.min((nowMs - lastTimeMs) / 1000, 0.1);
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;
      const currentMode = modeRef.current;
      const isZen = zenRef.current;

      // Damped camera parallax + zoom for Zen Inspect
      const targetCamX = pointerRef.current.x * (isZen ? 1.4 : 0.55);
      const targetCamY = (isZen ? 2.5 : 3.6) - pointerRef.current.y * 0.35;
      const targetCamZ = isZen ? 5.2 : 11.2;

      const dampFactor = 1 - Math.exp(-3.5 * delta);
      camera.position.x += (targetCamX - camera.position.x) * dampFactor;
      camera.position.y += (targetCamY - camera.position.y) * dampFactor;
      camera.position.z += (targetCamZ - camera.position.z) * dampFactor;
      camera.lookAt(0, isZen ? 1.8 : 1.45, -2.2);

      // Reactive core colors
      if (currentMode === 'airgap') {
        _targetColor.setHex(0xf43f5e); // Rose Crimson
      } else if (currentMode === 'scanning') {
        _targetColor.setHex(0xf59e0b); // Amber Firewall
      } else {
        _targetColor.setHex(0x10b981); // Emerald Verified
      }

      coreMat.color.lerp(_targetColor, dampFactor);
      coreMat.emissive.lerp(_targetColor, dampFactor);
      outerRingMat.emissive.lerp(_targetColor, dampFactor);
      conduitMat.emissive.lerp(_targetColor, dampFactor);

      const spinBoost = currentMode === 'scanning' ? 2.6 : 1.0;
      shieldGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.25;
      coreMesh.rotation.y += delta * 0.9 * spinBoost;
      coreMesh.rotation.x = Math.sin(elapsed * 1.1) * 0.2;
      innerRing.rotation.x = elapsed * 0.4 * spinBoost;
      innerRing.rotation.y = elapsed * 0.55 * spinBoost;
      outerRing.rotation.x = -elapsed * 0.3 * spinBoost;
      outerRing.rotation.z = elapsed * 0.25 * spinBoost;

      // Subtle scroll of floor cyber-grid
      gridTexture.offset.y = (elapsed * (currentMode === 'scanning' ? 0.35 : 0.08)) % 1;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      for (const item of disposables) {
        item.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="cyber-grid-canvas"
      data-scene-state={mode}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
