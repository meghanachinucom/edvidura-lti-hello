/**
 * Techartist-style interactive 3D lesson lab for students (Three.js).
 * Predict → try → explain loop on a Cartesian plane.
 */
import * as THREE from 'three';

export type SpatialLabHandle = {
  dispose: () => void;
  /** Pulse a named object in the playground (textbook callout → 3D). */
  focusConcept: (id: 'rise' | 'run' | 'b' | 'line') => void;
  setSlope: (m: number) => void;
  setIntercept: (b: number) => void;
};

type LabOpts = {
  host: HTMLElement;
  onExplain?: (msg: string) => void;
  /** Fired when the student changes m/b in the playground. */
  onParams?: (m: number, b: number) => void;
};

let active: SpatialLabHandle | null = null;

export function disposeSpatialLab(): void {
  active?.dispose();
  active = null;
}

export function mountSpatialLab(opts: LabOpts): SpatialLabHandle {
  disposeSpatialLab();

  const host = opts.host;
  host.innerHTML = '';
  host.classList.add('spatial-lab-host');

  const shell = document.createElement('div');
  shell.className = 'spatial-lab-shell';
  shell.innerHTML = `
    <div class="spatial-lab-toolbar">
      <p class="spatial-lab-kicker">Interactive 3D lab</p>
      <div class="spatial-lab-steps" role="tablist">
        <button type="button" data-step="predict" class="spatial-step on">1 · Predict</button>
        <button type="button" data-step="try" class="spatial-step">2 · Try</button>
        <button type="button" data-step="explain" class="spatial-step">3 · Explain</button>
      </div>
    </div>
    <div class="spatial-lab-stage">
      <canvas class="spatial-lab-canvas"></canvas>
      <div class="spatial-lab-hud">
        <p class="spatial-eq">y = <span data-m>1.00</span>x + <span data-b>0.00</span></p>
        <p class="spatial-hint" data-hint>Predict: steeper slope → line tilts more. Then press Try.</p>
      </div>
    </div>
    <div class="spatial-lab-controls">
      <label>Slope m <input type="range" min="-3" max="3" step="0.05" value="1" data-slope /></label>
      <label>Intercept b <input type="range" min="-3" max="3" step="0.05" value="0" data-intercept /></label>
      <button type="button" class="spatial-lab-drop" data-drop>Drop a point</button>
    </div>
  `;
  host.appendChild(shell);

  const canvas = shell.querySelector('.spatial-lab-canvas') as HTMLCanvasElement;
  const mEl = shell.querySelector('[data-m]') as HTMLElement;
  const bEl = shell.querySelector('[data-b]') as HTMLElement;
  const hintEl = shell.querySelector('[data-hint]') as HTMLElement;
  const slopeInput = shell.querySelector('[data-slope]') as HTMLInputElement;
  const interceptInput = shell.querySelector('[data-intercept]') as HTMLInputElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1210);
  scene.fog = new THREE.Fog(0x0a1210, 12, 28);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(7.5, 5.2, 9.5);
  camera.lookAt(0, 0.4, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;

  const hemi = new THREE.HemisphereLight(0xd8e6df, 0x1a2a22, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xc8f542, 1.15);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xff6b2c, 0.35);
  fill.position.set(-5, 4, -3);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ color: 0x12201a, roughness: 0.85, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(10, 10, 0x3d5a50, 0x1e332c);
  grid.position.y = 0.01;
  scene.add(grid);

  // Axes
  const axisMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25 });
  const xAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8, 8), axisMat(0x10b981));
  xAxis.rotation.z = Math.PI / 2;
  xAxis.position.y = 0.08;
  scene.add(xAxis);
  const yAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 5, 8), axisMat(0xf59e0b));
  yAxis.position.set(0, 2.5, 0);
  scene.add(yAxis);

  // Floating “papercraft” blocks (Techartist vibe)
  const blockGeo = new THREE.BoxGeometry(1.1, 0.35, 1.1);
  const blocks: THREE.Mesh[] = [];
  const blockSpecs = [
    { color: 0xc8f542, x: -3.2, z: -2.4, label: 'rise' },
    { color: 0xff6b2c, x: 3.0, z: -1.8, label: 'run' },
    { color: 0x7dd3c0, x: -2.4, z: 2.8, label: 'b' },
  ];
  for (const spec of blockSpecs) {
    const mesh = new THREE.Mesh(
      blockGeo,
      new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.4, metalness: 0.1 })
    );
    mesh.position.set(spec.x, 0.25, spec.z);
    mesh.castShadow = true;
    mesh.userData.label = spec.label;
    scene.add(mesh);
    blocks.push(mesh);
  }

  // Dynamic line y = mx + b on the xz plane mapped: x→x, y→height, z→0 plane line along x
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);
  let lineMesh: THREE.Mesh | null = null;
  const points: THREE.Mesh[] = [];

  let m = 1;
  let b = 0;
  let step: 'predict' | 'try' | 'explain' = 'try';
  let raf = 0;
  let disposed = false;
  let t0 = performance.now();
  let pulseId: string | null = null;
  let pulseUntil = 0;

  function rebuildLine() {
    if (lineMesh) {
      lineGroup.remove(lineMesh);
      lineMesh.geometry.dispose();
      (lineMesh.material as THREE.Material).dispose();
      lineMesh = null;
    }
    const curvePts: THREE.Vector3[] = [];
    for (let x = -4; x <= 4; x += 0.15) {
      const y = m * x + b;
      curvePts.push(new THREE.Vector3(x, Math.max(-0.2, Math.min(4.5, y + 0.08)), 0));
    }
    const curve = new THREE.CatmullRomCurve3(curvePts);
    const geo = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
    lineMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0xfe580d,
        emissive: 0xfe580d,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      })
    );
    lineMesh.castShadow = true;
    lineGroup.add(lineMesh);
    mEl.textContent = m.toFixed(2);
    bEl.textContent = b.toFixed(2);
    slopeInput.value = String(m);
    interceptInput.value = String(b);
    opts.onParams?.(m, b);
  }

  function setHint() {
    if (step === 'predict') {
      hintEl.textContent = 'Predict: if m increases, does the line get steeper? Nudge m, then open Try.';
    } else if (step === 'try') {
      hintEl.textContent = 'Try: drag the sliders. Drop a point onto the line. Orbit with pointer.';
    } else {
      hintEl.textContent = `Explain: slope m is rise/run. Here m=${m.toFixed(2)} means Δy ≈ ${m.toFixed(2)} when Δx = 1. Intercept b=${b.toFixed(2)} is where x=0.`;
      opts.onExplain?.(hintEl.textContent);
    }
  }

  function dropPoint() {
    const x = (Math.random() * 6) - 3;
    const y = m * x + b;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.4 })
    );
    sphere.position.set(x, Math.max(0.15, y + 0.08), 0);
    sphere.castShadow = true;
    scene.add(sphere);
    points.push(sphere);
    if (points.length > 8) {
      const old = points.shift();
      if (old) {
        scene.remove(old);
        old.geometry.dispose();
        (old.material as THREE.Material).dispose();
      }
    }
  }

  rebuildLine();
  syncSteps();
  setHint();

  // Pointer orbit (light)
  let dragging = false;
  let lx = 0;
  let ly = 0;
  let theta = 0.55;
  let phi = 0.85;
  const radius = 12.5;

  function placeCamera() {
    camera.position.set(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) + 1.2,
      radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(0, 0.6, 0);
  }
  placeCamera();

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging || step === 'predict') return;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    lx = e.clientX;
    ly = e.clientY;
    theta -= dx * 0.005;
    phi = Math.min(1.35, Math.max(0.35, phi + dy * 0.005));
    placeCamera();
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* */ }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);

  slopeInput.addEventListener('input', () => {
    if (step === 'predict') return;
    m = parseFloat(slopeInput.value);
    rebuildLine();
    if (step === 'explain') setHint();
  });
  interceptInput.addEventListener('input', () => {
    if (step === 'predict') return;
    b = parseFloat(interceptInput.value);
    rebuildLine();
    if (step === 'explain') setHint();
  });
  // Allow slight predict nudges
  slopeInput.addEventListener('change', () => {
    m = parseFloat(slopeInput.value);
    rebuildLine();
  });

  shell.querySelector('[data-drop]')?.addEventListener('click', () => {
    if (step === 'predict') {
      step = 'try';
      syncSteps();
    }
    dropPoint();
  });

  function syncSteps() {
    shell.querySelectorAll('.spatial-step').forEach((btn) => {
      const s = (btn as HTMLElement).dataset.step;
      btn.classList.toggle('on', s === step);
    });
    const locked = step === 'predict';
    slopeInput.disabled = false;
    interceptInput.disabled = locked;
    setHint();
  }

  shell.querySelectorAll('.spatial-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      step = ((btn as HTMLElement).dataset.step || 'try') as typeof step;
      syncSteps();
    });
  });

  function resize() {
    const w = host.clientWidth || 640;
    const h = Math.max(280, Math.min(440, Math.round(w * 0.55)));
    renderer.setSize(w, h, false);
    canvas.style.width = '100%';
    canvas.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  function frame(now: number) {
    if (disposed) return;
    const t = (now - t0) / 1000;
    blocks.forEach((mesh, i) => {
      const base = 0.25 + Math.sin(t * 1.2 + i) * 0.08;
      const hot = pulseId && mesh.userData.label === pulseId && now < pulseUntil;
      mesh.position.y = hot ? base + 0.35 : base;
      mesh.rotation.y = t * 0.25 + i;
      mesh.scale.setScalar(hot ? 1.18 : 1);
    });
    if (lineMesh) {
      const hotLine = pulseId === 'line' && now < pulseUntil;
      (lineMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = hotLine ? 0.95 : 0.45;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  const handle: SpatialLabHandle = {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      renderer.dispose();
      host.innerHTML = '';
      if (active === handle) active = null;
    },
    focusConcept(id) {
      pulseId = id;
      pulseUntil = performance.now() + 1800;
      if (id === 'rise' || id === 'run') {
        step = 'try';
        syncSteps();
      }
      if (id === 'b') {
        hintEl.textContent = 'Textbook → playground: b is where the line crosses the y-axis (x = 0).';
      } else if (id === 'rise') {
        hintEl.textContent = 'Rise is Δy — how much the line goes up when x increases.';
      } else if (id === 'run') {
        hintEl.textContent = 'Run is Δx — the horizontal step. Slope m = rise / run.';
      } else {
        hintEl.textContent = 'The glowing tube is y = mx + b in 3D space.';
      }
    },
    setSlope(next) {
      m = next;
      step = 'try';
      syncSteps();
      rebuildLine();
    },
    setIntercept(next) {
      b = next;
      step = 'try';
      syncSteps();
      rebuildLine();
    },
  };
  active = handle;
  return handle;
}
