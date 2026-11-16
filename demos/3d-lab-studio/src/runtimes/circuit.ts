import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

export function mountCircuit(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>Switch open · no current</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <button type="button" class="btn btn-primary" data-toggle>Close switch</button>
    <span class="hud-pill" data-state>OPEN</span>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const stateEl = controls.querySelector('[data-state]') as HTMLElement;
  const toggleBtn = controls.querySelector('[data-toggle]') as HTMLButtonElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1014);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 7.5, 9.5);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene.add(new THREE.AmbientLight(0x99aabb, 0.7));
  const lamp = new THREE.DirectionalLight(0xffffff, 0.9);
  lamp.position.set(3, 8, 4);
  scene.add(lamp);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.85 })
  );
  board.position.y = -0.2;
  scene.add(board);

  const matWire = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.6, roughness: 0.35 });
  const addWire = (x1: number, z1: number, x2: number, z2: number) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 10), matWire);
    mesh.position.set((x1 + x2) / 2, 0.15, (z1 + z2) / 2);
    mesh.rotation.z = Math.PI / 2;
    mesh.rotation.y = -Math.atan2(dz, dx);
    scene.add(mesh);
    return mesh;
  };

  // Loop layout: battery(-3,1) → bulb(0,1.6) → switch(2.5,0) → back
  addWire(-3.2, 1.2, 0, 1.6);
  addWire(0, 1.6, 2.6, 0.9);
  const gapA = addWire(2.6, 0.9, 2.6, -0.2);
  const gapB = addWire(2.6, -0.9, -3.2, -1.0);
  addWire(-3.2, -1.0, -3.2, 1.2);
  gapA.visible = false;

  const battery = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.4, 20),
    new THREE.MeshStandardMaterial({ color: 0x2f6fed })
  );
  battery.rotation.z = Math.PI / 2;
  battery.position.set(-3.2, 0.35, 0.1);
  battery.userData.id = 'battery';
  scene.add(battery);

  const bulbGlass = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0xfff2c4,
      emissive: 0x000000,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
    })
  );
  bulbGlass.position.set(0, 0.7, 1.6);
  bulbGlass.userData.id = 'bulb';
  scene.add(bulbGlass);
  const bulbLight = new THREE.PointLight(0xffe08a, 0, 6);
  bulbLight.position.copy(bulbGlass.position);
  scene.add(bulbLight);

  const switchBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.15, 0.7),
    new THREE.MeshStandardMaterial({ color: 0x445566 })
  );
  switchBase.position.set(2.6, 0.2, 0);
  scene.add(switchBase);

  const lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.12, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xe8a54b, metalness: 0.4, roughness: 0.4 })
  );
  lever.position.set(2.6, 0.35, 0);
  lever.userData.id = 'switch';
  scene.add(lever);

  let closed = false;
  let alive = true;
  let spark = 0;

  const applySwitch = () => {
    closed = !closed;
    lever.rotation.y = closed ? 0 : 0.55;
    gapA.visible = closed;
    if (bulbGlass.material instanceof THREE.MeshPhysicalMaterial) {
      bulbGlass.material.emissive = new THREE.Color(closed ? 0xffcc66 : 0x000000);
      bulbGlass.material.emissiveIntensity = closed ? 1.2 : 0;
    }
    bulbLight.intensity = closed ? 2.2 : 0;
    toggleBtn.textContent = closed ? 'Open switch' : 'Close switch';
    stateEl.textContent = closed ? 'CLOSED' : 'OPEN';
    readout.textContent = closed
      ? 'Closed loop · current flows · bulb on'
      : 'Switch open · path broken · no current';
    spark = closed ? 1 : 0;
  };
  lever.rotation.y = 0.55;
  toggleBtn.addEventListener('click', applySwitch);

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
    if (spark > 0) spark *= 0.96;
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
    focus: (id: string) => {
      readout.textContent = `Focus: ${id}`;
      if (id === 'switch') toggleBtn.focus();
    },
  };
}
