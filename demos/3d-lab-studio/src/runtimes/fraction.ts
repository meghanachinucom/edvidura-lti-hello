import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

export function mountFractionBar(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>¾</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <label>Parts (denominator) <input type="range" min="2" max="12" step="1" value="4" data-den /></label>
    <label>Shaded (numerator) <input type="range" min="0" max="4" step="1" value="3" data-num /></label>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const denInput = controls.querySelector('[data-den]') as HTMLInputElement;
  const numInput = controls.querySelector('[data-num]') as HTMLInputElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1412);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
  camera.position.set(0, 5.5, 9);
  camera.lookAt(0, 0.4, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sun = new THREE.DirectionalLight(0xffe6c0, 0.9);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);
  const pieces: THREE.Mesh[] = [];

  const rebuild = () => {
    while (group.children.length) group.remove(group.children[0]);
    pieces.length = 0;
    const den = Math.max(2, Number(denInput.value));
    numInput.max = String(den);
    if (Number(numInput.value) > den) numInput.value = String(den);
    const num = Number(numInput.value);
    const width = 6;
    const pieceW = width / den;
    for (let i = 0; i < den; i++) {
      const shaded = i < num;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(pieceW * 0.92, 0.7, 1.6),
        new THREE.MeshStandardMaterial({
          color: shaded ? 0xe8a54b : 0x2a3d36,
          emissive: shaded ? 0x4a3010 : 0x000000,
          emissiveIntensity: shaded ? 0.15 : 0,
        })
      );
      mesh.position.set(-width / 2 + pieceW * (i + 0.5), 0.4, 0);
      group.add(mesh);
      pieces.push(mesh);
    }
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.3, 0.15, 2),
      new THREE.MeshStandardMaterial({ color: 0x1a2822 })
    );
    plate.position.y = 0;
    group.add(plate);
    readout.textContent = `${num} / ${den}  ·  ${(num / den).toFixed(2)}`;
  };

  denInput.addEventListener('input', rebuild);
  numInput.addEventListener('input', rebuild);
  rebuild();

  let alive = true;
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
    group.rotation.y = Math.sin(performance.now() * 0.0004) * 0.08;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return {
    dispose: () => {
      alive = false;
      ro.disconnect();
      renderer.dispose();
      host.innerHTML = '';
    },
    focus: (id) => {
      if (id === 'numerator') numInput.focus();
      if (id === 'denominator') denInput.focus();
    },
  };
}
