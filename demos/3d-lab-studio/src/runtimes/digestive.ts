import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

export function mountDigestive(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>Follow the food bolus</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <button type="button" class="btn btn-primary" data-play>Play path</button>
    <button type="button" class="btn btn-ghost" data-id="mouth">Mouth</button>
    <button type="button" class="btn btn-ghost" data-id="stomach">Stomach</button>
    <button type="button" class="btn btn-ghost" data-id="intestine">Intestine</button>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141018);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
  camera.position.set(0, 1, 9);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene.add(new THREE.AmbientLight(0xffe8e0, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(3, 5, 6);
  scene.add(key);

  const mkOrgan = (w: number, h: number, d: number, color: number, x: number, y: number, id: string) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, emissive: 0x000000, emissiveIntensity: 0 })
    );
    mesh.position.set(x, y, 0);
    mesh.userData.id = id;
    scene.add(mesh);
    return mesh;
  };

  const mouth = mkOrgan(1.2, 0.7, 0.7, 0xe07a6a, -3.2, 2.2, 'mouth');
  const pipe = mkOrgan(0.35, 2.2, 0.35, 0xd4a090, -3.2, 0.6, 'mouth');
  const stomach = mkOrgan(1.6, 1.3, 1.1, 0xc45c4a, -1.2, -0.3, 'stomach');
  stomach.rotation.z = -0.25;
  const small = mkOrgan(3.2, 0.7, 0.9, 0xd8896a, 1.5, -0.5, 'intestine');
  const large = mkOrgan(2.4, 0.55, 0.7, 0xb86b4c, 1.8, -1.5, 'intestine');

  const labels: { id: string; mesh: THREE.Mesh; title: string }[] = [
    { id: 'mouth', mesh: mouth, title: 'Mouth' },
    { id: 'stomach', mesh: stomach, title: 'Stomach' },
    { id: 'intestine', mesh: small, title: 'Small intestine' },
  ];

  const path = [
    new THREE.Vector3(-3.2, 2.2, 0.5),
    new THREE.Vector3(-3.2, 0.8, 0.5),
    new THREE.Vector3(-1.4, -0.1, 0.6),
    new THREE.Vector3(0.2, -0.4, 0.5),
    new THREE.Vector3(2.2, -0.5, 0.5),
    new THREE.Vector3(2.4, -1.4, 0.4),
  ];

  const bolus = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8a54b, emissive: 0x5a3a10, emissiveIntensity: 0.35 })
  );
  bolus.position.copy(path[0]);
  scene.add(bolus);

  let alive = true;
  let playing = false;
  let u = 0;

  const setFocus = (id: string) => {
    labels.forEach(({ mesh, id: oid }) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = oid === id ? 0.55 : 0;
      mat.emissive = new THREE.Color(oid === id ? 0xe8a54b : 0x000000);
    });
    const hit = labels.find((l) => l.id === id);
    readout.textContent = hit ? `At: ${hit.title}` : readout.textContent;
    opts.onFocus?.(id);
  };

  controls.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => setFocus((btn as HTMLElement).dataset.id || ''));
  });
  controls.querySelector('[data-play]')?.addEventListener('click', () => {
    playing = true;
    u = 0;
    readout.textContent = 'Bolus moving…';
  });

  // silence unused
  void pipe;
  void large;

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
    if (playing) {
      u += 0.004;
      if (u >= 1) {
        playing = false;
        u = 1;
        setFocus('intestine');
        readout.textContent = 'Path complete · absorption in intestine';
      }
      const seg = u * (path.length - 1);
      const i = Math.min(path.length - 2, Math.floor(seg));
      const f = seg - i;
      bolus.position.lerpVectors(path[i], path[i + 1], f);
      if (u < 0.25) setFocus('mouth');
      else if (u < 0.55) setFocus('stomach');
      else setFocus('intestine');
    }
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
    focus: setFocus,
  };
}
