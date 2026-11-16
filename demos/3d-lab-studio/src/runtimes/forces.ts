import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

export function mountForces(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>a = 0.00 m/s²</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <label>Force F <input type="range" min="0" max="20" step="0.5" value="8" data-f /></label>
    <label>Mass m <input type="range" min="1" max="12" step="0.5" value="4" data-m /></label>
    <label>Friction <input type="range" min="0" max="0.4" step="0.02" value="0.08" data-mu /></label>
    <button type="button" class="btn btn-ghost" data-reset>Reset</button>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const fInput = controls.querySelector('[data-f]') as HTMLInputElement;
  const mInput = controls.querySelector('[data-m]') as HTMLInputElement;
  const muInput = controls.querySelector('[data-mu]') as HTMLInputElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1210);
  scene.fog = new THREE.Fog(0x0a1210, 10, 28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(6.5, 4.2, 8.5);
  camera.lookAt(0, 0.4, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const hemi = new THREE.HemisphereLight(0xb8d4c8, 0x1a2a22, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.1);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  scene.add(sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 12),
    new THREE.MeshStandardMaterial({ color: 0x1c2e28, roughness: 0.92 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(24, 24, 0x3a554c, 0x243830);
  grid.position.y = 0.01;
  scene.add(grid);

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xd4a056, roughness: 0.45 })
  );
  crate.position.set(-4, 0.55, 0);
  crate.castShadow = true;
  scene.add(crate);

  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-4, 1.2, 0),
    1.5,
    0xe8a54b,
    0.35,
    0.25
  );
  scene.add(arrow);

  let x = -4;
  let v = 0;
  let alive = true;
  let focusPulse = 0;

  const resize = () => {
    const w = stage.clientWidth || 640;
    const h = stage.clientHeight || 380;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const tick = () => {
    if (!alive) return;
    const F = Number(fInput.value);
    const m = Math.max(0.5, Number(mInput.value));
    const mu = Number(muInput.value);
    const g = 9.8;
    const friction = mu * m * g * Math.sign(v || F);
    const net = F - (Math.abs(v) > 0.01 || F > 0.2 ? friction : 0);
    const a = net / m;
    v += a * 0.016;
    x += v * 0.016;
    if (x > 8) {
      x = 8;
      v = 0;
    }
    if (x < -5) {
      x = -5;
      v = 0;
    }
    crate.position.x = x;
    arrow.position.set(x, 1.2, 0);
    const len = 0.4 + Math.min(3, Math.abs(F) * 0.12);
    arrow.setLength(len, 0.28, 0.2);
    readout.textContent = `a ≈ ${a.toFixed(2)} m/s² · v ≈ ${v.toFixed(2)}`;
    if (focusPulse > 0) {
      focusPulse -= 0.02;
      const mat = crate.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(0xe8a54b);
      mat.emissiveIntensity = focusPulse;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  controls.querySelector('[data-reset]')?.addEventListener('click', () => {
    x = -4;
    v = 0;
  });

  return {
    dispose: () => {
      alive = false;
      ro.disconnect();
      renderer.dispose();
      host.innerHTML = '';
    },
    focus: (id: string) => {
      focusPulse = 1;
      if (id === 'force') fInput.focus();
      if (id === 'mass') mInput.focus();
    },
  };
}
