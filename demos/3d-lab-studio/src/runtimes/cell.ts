import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

/**
 * Showcase template #1 — Class 9 cell tour.
 * Techartist-adjacent polish: glass membrane, bloom, orbit, soft particles.
 */
export function mountCellTour(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';

  const stage = document.createElement('div');
  stage.className = 'stage stage-showcase';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <span class="hud-pill hud-accent">Showcase · Cell</span>
    <span class="hud-pill" data-readout>Drag to orbit · click an organelle</span>
  `;
  stage.appendChild(hud);

  const controlsEl = document.createElement('div');
  controlsEl.className = 'controls';
  controlsEl.innerHTML = `
    <button type="button" class="btn btn-ghost" data-id="nucleus">Nucleus</button>
    <button type="button" class="btn btn-ghost" data-id="mito">Mitochondria</button>
    <button type="button" class="btn btn-ghost" data-id="membrane">Membrane</button>
    <button type="button" class="btn btn-primary" data-auto>Auto orbit</button>
  `;
  host.appendChild(stage);
  host.appendChild(controlsEl);
  applySceneChrome(controlsEl, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;

  // —— Renderer ——
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a12);
  scene.fog = new THREE.FogExp2(0x050a12, 0.045);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(5.2, 2.4, 6.8);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.06;
  orbit.minDistance = 4.2;
  orbit.maxDistance = 14;
  orbit.target.set(0, 0.15, 0);
  orbit.autoRotate = true;
  orbit.autoRotateSpeed = 0.55;

  // —— Lights ——
  scene.add(new THREE.AmbientLight(0x1a3048, 0.35));
  const hemi = new THREE.HemisphereLight(0x9ec8ff, 0x1a1520, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff0dd, 1.35);
  key.position.set(5, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.0002;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x66ccff, 0.55);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  const fill = new THREE.PointLight(0xff66aa, 0.45, 16);
  fill.position.set(-2, -1, 3);
  scene.add(fill);

  // Soft ground disc for contact shadow feel
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x0a121c,
      roughness: 0.95,
      metalness: 0.05,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.55;
  ground.receiveShadow = true;
  scene.add(ground);

  // —— Cell ——
  const cell = new THREE.Group();
  scene.add(cell);

  // Outer membrane — glass
  const membraneMat = new THREE.MeshPhysicalMaterial({
    color: 0x3ecf9a,
    metalness: 0.05,
    roughness: 0.12,
    transmission: 0.72,
    thickness: 1.1,
    ior: 1.35,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
  });
  const membrane = new THREE.Mesh(new THREE.SphereGeometry(2.45, 96, 64), membraneMat);
  membrane.castShadow = true;
  membrane.receiveShadow = true;
  membrane.userData.id = 'membrane';
  cell.add(membrane);

  // Subtle membrane lattice (wire)
  const lattice = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(2.46, 24, 16)),
    new THREE.LineBasicMaterial({ color: 0x5dffc2, transparent: true, opacity: 0.12 })
  );
  cell.add(lattice);

  // Cytoplasm glow volume
  const cyto = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 64, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x14352e,
      transparent: true,
      opacity: 0.28,
      roughness: 0.8,
      transmission: 0.15,
    })
  );
  cell.add(cyto);

  // Nucleus — layered
  const nucleusGroup = new THREE.Group();
  nucleusGroup.position.set(-0.35, 0.15, 0.25);
  const nucleusMat = new THREE.MeshPhysicalMaterial({
    color: 0x7b5cff,
    emissive: 0x2a1560,
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.15,
    clearcoat: 0.4,
  });
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 32), nucleusMat);
  nucleus.castShadow = true;
  nucleus.userData.id = 'nucleus';
  nucleusGroup.add(nucleus);
  const nucleolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff8ad4,
      emissive: 0x661144,
      emissiveIntensity: 0.6,
    })
  );
  nucleolus.position.set(0.15, 0.1, 0.2);
  nucleolus.userData.id = 'nucleus';
  nucleusGroup.add(nucleolus);
  // Chromatin flecks
  for (let i = 0; i < 14; i++) {
    const fleck = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0xc4b5fd,
        emissive: 0x4c1d95,
        emissiveIntensity: 0.5,
      })
    );
    const v = new THREE.Vector3().randomDirection().multiplyScalar(0.35 + Math.random() * 0.25);
    fleck.position.copy(v);
    fleck.userData.id = 'nucleus';
    nucleusGroup.add(fleck);
  }
  cell.add(nucleusGroup);

  // Mitochondria — capsule + ridges
  const mitos: THREE.Group[] = [];
  const mitoMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.25,
  });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 8, 16), mitoMat.clone());
    body.castShadow = true;
    body.userData.id = 'mito';
    g.add(body);
    for (let r = 0; r < 3; r++) {
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.018, 6, 20),
        new THREE.MeshStandardMaterial({ color: 0xfdba74, emissive: 0x9a3412, emissiveIntensity: 0.3 })
      );
      ridge.rotation.y = Math.PI / 2;
      ridge.position.y = -0.15 + r * 0.15;
      ridge.userData.id = 'mito';
      g.add(ridge);
    }
    const a = (i / 6) * Math.PI * 2;
    g.position.set(Math.cos(a) * 1.35, Math.sin(a * 1.7) * 0.55, Math.sin(a) * 1.15);
    g.rotation.set(Math.random(), a, Math.random() * 0.5);
    g.userData.id = 'mito';
    cell.add(g);
    mitos.push(g);
  }

  // Floating cytoplasmic particles
  const dustGeo = new THREE.BufferGeometry();
  const dustCount = 180;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(0.4 + Math.random() * 1.85);
    dustPos[i * 3] = v.x;
    dustPos[i * 3 + 1] = v.y;
    dustPos[i * 3 + 2] = v.z;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  cell.add(dust);

  // Pickables
  const pickables: THREE.Object3D[] = [membrane, nucleus, nucleolus, ...mitos];

  // —— Post ——
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.4, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let alive = true;
  let focusTarget: THREE.Object3D | null = null;
  let focusPulse = 0;

  const resize = () => {
    const w = stage.clientWidth || 720;
    const h = Math.max(stage.clientHeight, 480);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const clearEmissiveBoost = () => {
    nucleusMat.emissiveIntensity = 0.45;
    mitos.forEach((m) => {
      m.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material && 'emissiveIntensity' in o.material) {
          (o.material as THREE.MeshStandardMaterial).emissiveIntensity =
            o.userData.id === 'mito' ? 0.35 : 0.3;
        }
      });
    });
    membraneMat.emissive = new THREE.Color(0x000000);
    membraneMat.emissiveIntensity = 0;
  };

  const focusId = (id: string) => {
    clearEmissiveBoost();
    focusPulse = 1;
    if (id === 'nucleus') {
      focusTarget = nucleusGroup;
      nucleusMat.emissiveIntensity = 1.1;
      readout.textContent = 'Nucleus — control centre · genetic material';
    } else if (id === 'mito') {
      focusTarget = mitos[0];
      mitos.forEach((m) => {
        m.traverse((o) => {
          if (o instanceof THREE.Mesh && o.material && 'emissiveIntensity' in o.material) {
            (o.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.95;
          }
        });
      });
      readout.textContent = 'Mitochondria — release energy for the cell';
    } else if (id === 'membrane') {
      focusTarget = membrane;
      membraneMat.emissive = new THREE.Color(0x22c55e);
      membraneMat.emissiveIntensity = 0.35;
      readout.textContent = 'Plasma membrane — controls entry & exit';
    }
    opts.onFocus?.(id);
  };

  controlsEl.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => focusId((btn as HTMLElement).dataset.id || ''));
  });
  controlsEl.querySelector('[data-auto]')?.addEventListener('click', () => {
    orbit.autoRotate = !orbit.autoRotate;
    (controlsEl.querySelector('[data-auto]') as HTMLButtonElement).textContent = orbit.autoRotate
      ? 'Pause orbit'
      : 'Auto orbit';
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downX = 0;
  let downY = 0;

  const onPointerDown = (e: PointerEvent) => {
    downX = e.clientX;
    downY = e.clientY;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    if (hits[0]) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData.id) obj = obj.parent;
      if (obj?.userData.id) focusId(String(obj.userData.id));
    }
  };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  const clock = new THREE.Clock();
  const tick = () => {
    if (!alive) return;
    const t = clock.getElapsedTime();
    cell.rotation.y = t * 0.05;
    nucleusGroup.rotation.y = t * 0.25;
    dust.rotation.y = -t * 0.08;
    mitos.forEach((m, i) => {
      m.position.y += Math.sin(t * 1.2 + i) * 0.0015;
    });
    if (focusPulse > 0) {
      focusPulse *= 0.985;
      if (focusTarget) {
        const s = 1 + Math.sin(t * 6) * 0.02 * focusPulse;
        focusTarget.scale.setScalar(s);
      }
    }
    orbit.update();
    composer.render();
    requestAnimationFrame(tick);
  };
  tick();

  return {
    dispose: () => {
      alive = false;
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      orbit.dispose();
      composer.dispose();
      renderer.dispose();
      host.innerHTML = '';
    },
    focus: focusId,
  };
}
