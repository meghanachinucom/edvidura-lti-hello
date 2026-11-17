import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

export function mountPhotosynthesis(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>Food-making: low</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <label>Sunlight <input type="range" min="0" max="100" value="55" data-sun /></label>
    <label>CO₂ available <input type="range" min="20" max="100" value="70" data-co2 /></label>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const sunIn = controls.querySelector('[data-sun]') as HTMLInputElement;
  const co2In = controls.querySelector('[data-co2]') as HTMLInputElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b8e0);
  scene.fog = new THREE.Fog(0x87b8e0, 12, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(3, 3.5, 8);
  camera.lookAt(0, 1.2, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const hemi = new THREE.HemisphereLight(0xfff5d6, 0x3a5a30, 0.85);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xfff0c0, 1);
  sunLight.position.set(6, 10, 2);
  scene.add(sunLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.55, 0.8, 20),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  pot.position.y = 0.4;
  scene.add(pot);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 1.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6b34 })
  );
  stem.position.y = 1.4;
  scene.add(stem);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3dba5a,
    emissive: 0x145022,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), leafMat);
  leaf.scale.set(1.4, 0.35, 1);
  leaf.position.set(0.5, 2.1, 0);
  leaf.rotation.z = -0.4;
  leaf.userData.id = 'leaf';
  scene.add(leaf);

  const sunOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe066 })
  );
  sunOrb.position.set(-4, 4.5, -2);
  sunOrb.userData.id = 'sun';
  scene.add(sunOrb);

  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xa8e6ff, transparent: true, opacity: 0.7 })
    );
    b.position.set(0.2 + Math.random() * 0.4, 1.5 + Math.random(), 0.2);
    b.userData.id = 'oxygen';
    scene.add(b);
    bubbles.push(b);
  }

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
    const sun = Number(sunIn.value) / 100;
    const co2 = Number(co2In.value) / 100;
    const rate = sun * co2;
    sunLight.intensity = 0.3 + sun * 1.4;
    leafMat.emissiveIntensity = 0.1 + rate * 0.7;
    (sunOrb.material as THREE.MeshBasicMaterial).color.setRGB(1, 0.85 + sun * 0.1, 0.3 + sun * 0.2);
    const t = performance.now() * 0.001;
    bubbles.forEach((b, i) => {
      b.visible = rate > 0.15;
      b.position.y = 1.6 + ((t * (0.4 + rate) + i * 0.3) % 2.2);
      b.position.x = 0.3 + Math.sin(t + i) * 0.25;
    });
    const label = rate > 0.65 ? 'high' : rate > 0.35 ? 'medium' : 'low';
    readout.textContent = `Food-making: ${label} · O₂ bubbles ${rate > 0.15 ? 'on' : 'off'}`;
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
      if (id === 'sun') sunIn.focus();
      if (id === 'leaf') readout.textContent = 'Focus: leaf / chlorophyll';
      if (id === 'oxygen') readout.textContent = 'Focus: oxygen release';
    },
  };
}
