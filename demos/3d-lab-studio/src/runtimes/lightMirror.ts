import * as THREE from 'three';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

/** 2.5D optics bench: plane mirror with i = r (Class 8/10). */
export function mountLightMirror(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `<span class="hud-pill" data-readout>i = r</span>`;
  stage.appendChild(hud);
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <label>Angle of incidence i (°) <input type="range" min="5" max="80" value="40" data-i /></label>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const iInput = controls.querySelector('[data-i]') as HTMLInputElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
  camera.position.set(0, 0, 11);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));

  // Mirror along Y axis (silver strip)
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 5.5, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd8e0ea, metalness: 0.9, roughness: 0.12 })
  );
  scene.add(mirror);

  const mkRay = (color: number) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    const line = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ color, linewidth: 2 })
    );
    scene.add(line);
    return line;
  };

  const incident = mkRay(0xe8a54b);
  const reflected = mkRay(0x3dba8b);
  const normal = mkRay(0x94a3b8);

  const setLine = (line: THREE.Line, x0: number, y0: number, x1: number, y1: number) => {
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, x0, y0, 0.05);
    pos.setXYZ(1, x1, y1, 0.05);
    pos.needsUpdate = true;
  };

  const update = () => {
    const iDeg = Number(iInput.value);
    const i = (iDeg * Math.PI) / 180;
    const len = 4.2;
    // Normal: left along -X from origin
    setLine(normal, 0, 0, -2.8, 0);
    // Incident: from upper-left toward origin
    setLine(incident, -len * Math.cos(i), len * Math.sin(i), 0, 0);
    // Reflected: from origin to lower-left (i = r)
    setLine(reflected, 0, 0, -len * Math.cos(i), -len * Math.sin(i));
    readout.textContent = `i = ${iDeg}° · r = ${iDeg}° · plane mirror (NCERT)`;
  };
  iInput.addEventListener('input', update);
  update();

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
    focus: () => iInput.focus(),
  };
}
