import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applySceneChrome, type SliderConfig } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

type MeshMeta = {
  glb_url?: string;
  prompt?: string;
  provider?: string;
  approved?: boolean;
  note?: string;
  status?: string;
};

type TopicKind = 'volcano' | 'cyclone' | 'chem' | 'solar' | 'heart' | 'generic';

function detectTopic(hint: string, kindHint?: string): TopicKind {
  const forced = String(kindHint || '')
    .trim()
    .toLowerCase();
  if (forced === 'volcano' || forced === 'cyclone' || forced === 'chem' || forced === 'solar' || forced === 'heart') {
    return forced;
  }
  if (forced === 'custom') return 'generic';
  const h = hint.toLowerCase();
  if (/cyclone|hurricane|typhoon|eyewall|eye wall|rain band/.test(h)) return 'cyclone';
  if (/chemical|reactant|exothermic|endothermic|reaction progress/.test(h)) return 'chem';
  if (/volcano|lava|magma|erupt/.test(h)) return 'volcano';
  if (/solar|planet|orbit/.test(h)) return 'solar';
  if (/heart|circulat|cardiac|blood/.test(h)) return 'heart';
  return 'generic';
}

/**
 * New-concept playground with real classroom interactions (not just orbit):
 * callout focus, part buttons, and topic sliders — plus optional Meshy GLB.
 */
export function mountAiMesh(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';
  const mesh = (opts.scene as { mesh?: MeshMeta } | null | undefined)?.mesh;
  const topicHint = `${mesh?.prompt || ''} ${opts.scene?.hudHint || ''} ${(opts.scene?.hotspots || [])
    .map((h) => `${h.id} ${h.label}`)
    .join(' ')} ${(opts.scene?.objectives || []).join(' ')}`;
  const kind = detectTopic(topicHint, opts.scene?.interactionKind);
  const focusHints = opts.scene?.focusHints || {};

  const cycloneStory = [
    { id: 'form', label: '1 · Form' },
    { id: 'strengthen', label: '2 · Strengthen' },
    { id: 'landfall', label: '3 · Landfall' },
    { id: 'eye', label: 'Eye' },
    { id: 'eyewall', label: 'Eyewall' },
    { id: 'rainbands', label: 'Rain bands' },
  ];
  const hotspots =
    kind === 'cyclone'
      ? cycloneStory
      : opts.scene?.hotspots?.length
        ? opts.scene.hotspots
        : [
            { id: 'model', label: 'Model' },
            { id: 'parts', label: 'Parts' },
            { id: 'use', label: 'Why it matters' },
          ];

  const stage = document.createElement('div');
  stage.className = 'stage stage-showcase';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <span class="hud-pill hud-accent">${kind === 'generic' ? 'New topic' : kind} · interactive</span>
    <span class="hud-pill" data-readout>Tap a callout or use the controls</span>
  `;
  stage.appendChild(hud);

  const defaultSliders: SliderConfig[] =
    kind === 'volcano'
      ? [
          { id: 'heat', label: 'Magma heat', min: 0, max: 100, value: 35 },
          { id: 'erupt', label: 'Eruption', min: 0, max: 100, value: 10 },
        ]
      : kind === 'cyclone'
        ? [
            { id: 'ocean_temp', label: 'Ocean temperature (°C)', min: 24, max: 32, value: 27 },
            { id: 'wind', label: 'Wind speed (km/h)', min: 0, max: 100, value: 40 },
            { id: 'landfall', label: 'Path to land', min: 0, max: 100, value: 5 },
          ]
        : kind === 'chem'
          ? [
              { id: 'temp', label: 'Temperature', min: 0, max: 100, value: 40 },
              { id: 'progress', label: 'Reaction progress', min: 0, max: 100, value: 15 },
            ]
          : kind === 'solar'
            ? [{ id: 'orbit', label: 'Orbit speed', min: 0, max: 100, value: 40 }]
            : kind === 'heart'
              ? [{ id: 'beat', label: 'Beat rate', min: 40, max: 140, value: 72 }]
              : [{ id: 'explore', label: 'Explore', min: 0, max: 100, value: 40 }];
  // Cyclone story needs ocean → land controls even if the LLM sent other slider ids
  const sliders: SliderConfig[] =
    kind === 'cyclone' ? defaultSliders : opts.scene?.sliders?.length ? opts.scene.sliders : defaultSliders;

  const controls = document.createElement('div');
  controls.className = 'controls controls-on-dark';
  controls.innerHTML = `
    ${hotspots
      .slice(0, 4)
      .map(
        (h) =>
          `<button type="button" class="btn btn-ghost" data-id="${h.id}">${h.label}</button>`
      )
      .join('')}
    ${sliders
      .map(
        (s) =>
          `<label>${s.label} <input type="range" min="${s.min}" max="${s.max}" value="${s.value}" ${
            s.step != null ? `step="${s.step}"` : ''
          } data-${s.id} /></label>`
      )
      .join('')}
    <button type="button" class="btn btn-primary" data-auto>Auto orbit</button>
    <span class="hud-pill" data-load></span>
  `;
  host.appendChild(stage);
  host.appendChild(controls);
  applySceneChrome(controls, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const loadEl = controls.querySelector('[data-load]') as HTMLElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);
  scene.fog = new THREE.Fog(0x0b1220, 12, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  camera.position.set(2.8, 2.2, 4.2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene.add(new THREE.HemisphereLight(0xfff1e0, 0x1a2433, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4, 8, 3);
  scene.add(key);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.autoRotate = true;
  orbit.autoRotateSpeed = 0.55;
  orbit.target.set(0, 0.9, 0);

  const root = new THREE.Group();
  scene.add(root);

  const parts = new Map<string, THREE.Object3D>();
  let glowLight: THREE.PointLight | null = null;
  let lavaMat: THREE.MeshStandardMaterial | null = null;
  let ash: THREE.Points | null = null;
  let planet: THREE.Object3D | null = null;
  let heartMesh: THREE.Object3D | null = null;
  let cycloneSpin: THREE.Object3D | null = null;
  let cycloneOcean: THREE.Mesh | null = null;
  let cycloneVapor: THREE.Points | null = null;
  let cycloneRain: THREE.Points | null = null;
  let cycloneLand: THREE.Object3D | null = null;
  let reactantA: THREE.Object3D | null = null;
  let reactantB: THREE.Object3D | null = null;
  let productMesh: THREE.Object3D | null = null;

  const setReadout = (msg: string) => {
    readout.textContent = msg;
  };

  const highlight = (id: string) => {
    parts.forEach((obj, key) => {
      obj.traverse((n) => {
        const m = (n as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'emissive' in m) {
          m.emissive = new THREE.Color(key === id ? 0xfe580d : 0x000000);
          m.emissiveIntensity = key === id ? 0.55 : 0;
        }
      });
      obj.scale.setScalar(key === id ? 1.08 : 1);
    });
  };

  const focusId = (id: string) => {
    highlight(id);
    opts.onFocus?.(id);
    if (focusHints[id]) {
      setReadout(focusHints[id]);
      // still nudge sliders for known packs below
    }
    const say = (msg: string) => {
      if (!focusHints[id]) setReadout(msg);
    };
    if (kind === 'volcano') {
      const heat = controls.querySelector('[data-heat]') as HTMLInputElement | null;
      const erupt = controls.querySelector('[data-erupt]') as HTMLInputElement | null;
      if (id === 'magma' || id === 'model') {
        if (heat) heat.value = '80';
        say('Magma chamber — molten rock under pressure');
      } else if (id === 'vent' || id === 'parts') {
        if (heat) heat.value = '55';
        say('Vent / crater — opening where magma reaches the surface');
      } else if (id === 'lava' || id === 'use') {
        if (erupt) erupt.value = '85';
        say('Lava & ash — eruption sends material out of the crater');
      } else {
        say(hotspots.find((h) => h.id === id)?.label || id);
      }
      return;
    }
    if (kind === 'solar') {
      say(
        id === 'sun'
          ? 'Sun — centre of the solar system'
          : id === 'earth'
            ? 'Earth — planet in orbit'
            : id === 'orbit'
              ? 'Orbit — path around the Sun'
              : hotspots.find((h) => h.id === id)?.label || id
      );
      return;
    }
    if (kind === 'heart') {
      say(
        id === 'chambers'
          ? 'Chambers — atria and ventricles'
          : id === 'flow'
            ? 'Blood flow — pump cycle'
            : id === 'valves'
              ? 'Valves — keep blood moving one way'
              : hotspots.find((h) => h.id === id)?.label || id
      );
      return;
    }
    if (kind === 'cyclone') {
      const ocean = controls.querySelector('[data-ocean_temp]') as HTMLInputElement | null;
      const wind = controls.querySelector('[data-wind]') as HTMLInputElement | null;
      const land = controls.querySelector('[data-landfall]') as HTMLInputElement | null;
      if (id === 'form') {
        if (ocean) ocean.value = '30';
        if (wind) wind.value = '25';
        if (land) land.value = '5';
        say('Forms over warm ocean (~26.5°C+): moisture rises → low pressure → spin begins');
      } else if (id === 'strengthen') {
        if (ocean) ocean.value = '30';
        if (wind) wind.value = '85';
        if (land) land.value = '25';
        say('Strengthens over open sea: eyewall winds roar; rain bands spread energy outward');
      } else if (id === 'landfall') {
        if (ocean) ocean.value = '26';
        if (wind) wind.value = '55';
        if (land) land.value = '92';
        say('Landfall: storm hits the coast, loses warm-water fuel, winds ease — heavy rain still hits land');
      } else if (id === 'eye') {
        if (wind) wind.value = '20';
        say('Eye — calm centre; air sinks here while the wall around it is fierce');
      } else if (id === 'eyewall') {
        if (wind) wind.value = '90';
        say('Eyewall — strongest winds and rain, tightly wrapped around the eye');
      } else if (id === 'rainbands') {
        if (wind) wind.value = '60';
        say('Rain bands — spiral arms of cloud and rain reaching far from the centre');
      } else {
        say(hotspots.find((h) => h.id === id)?.label || id);
      }
      return;
    }
    if (kind === 'chem') {
      const temp = controls.querySelector('[data-temp]') as HTMLInputElement | null;
      const progress = controls.querySelector('[data-progress]') as HTMLInputElement | null;
      if (id === 'reactants') {
        if (progress) progress.value = '10';
        say('Reactants — starting substances before the change');
      } else if (id === 'reaction') {
        if (temp) temp.value = '75';
        if (progress) progress.value = '55';
        say('Reaction — bonds break and new bonds form');
      } else if (id === 'products') {
        if (progress) progress.value = '95';
        say('Products — new substances formed by the reaction');
      } else {
        say(hotspots.find((h) => h.id === id)?.label || id);
      }
      return;
    }
    setReadout(focusHints[id] || hotspots.find((h) => h.id === id)?.label || id);
  };

  const sliderVal = (id: string, fallback: number) => {
    const el = controls.querySelector(`[data-${id}]`) as HTMLInputElement | null;
    return el ? Number(el.value) : fallback;
  };

  const buildVolcano = () => {
    root.clear();
    parts.clear();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 2.1, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x3d4a3a, roughness: 0.95 })
    );
    base.position.y = 0.12;
    root.add(base);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 1.85, 28, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, flatShading: true, roughness: 0.92 })
    );
    cone.position.y = 1.05;
    root.add(cone);

    const magma = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x8b1a00,
        emissive: 0xff2200,
        emissiveIntensity: 0.35,
        roughness: 0.4,
      })
    );
    magma.position.set(0, 0.55, 0);
    magma.userData.id = 'magma';
    root.add(magma);
    parts.set('magma', magma);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.52, 0.3, 20),
      new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.85 })
    );
    vent.position.y = 1.85;
    vent.userData.id = 'vent';
    root.add(vent);
    parts.set('vent', vent);

    lavaMat = new THREE.MeshStandardMaterial({
      color: 0xfe580d,
      emissive: 0xff3300,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    });
    const lava = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), lavaMat);
    lava.position.y = 2.05;
    lava.userData.id = 'lava';
    root.add(lava);
    parts.set('lava', lava);

    glowLight = new THREE.PointLight(0xff5500, 0.6, 10);
    glowLight.position.set(0, 2.2, 0);
    root.add(glowLight);

    const ashGeo = new THREE.BufferGeometry();
    const count = 120;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = Math.random() * 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    ashGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    ash = new THREE.Points(
      ashGeo,
      new THREE.PointsMaterial({ color: 0xffaa66, size: 0.05, transparent: true, opacity: 0.2 })
    );
    ash.position.y = 2.1;
    ash.visible = false;
    root.add(ash);

    loadEl.textContent = 'Use callouts + sliders';
    setReadout('Drag Magma heat / Eruption — or tap Magma, Vent, Lava');
  };

  const buildCyclone = () => {
    root.clear();
    parts.clear();
    scene.background = new THREE.Color(0x071525);
    ground.visible = false;

    // Warm ocean (left / centre) — formation energy source
    cycloneOcean = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 48),
      new THREE.MeshStandardMaterial({ color: 0x0d4a6e, roughness: 0.28, metalness: 0.25 })
    );
    cycloneOcean.rotation.x = -Math.PI / 2;
    cycloneOcean.position.set(-0.8, 0.02, 0);
    cycloneOcean.userData.id = 'form';
    root.add(cycloneOcean);
    parts.set('form', cycloneOcean);

    // Coast / land (right) — landfall target
    cycloneLand = new THREE.Group();
    const land = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.18, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x3d5c3a, roughness: 0.92 })
    );
    land.position.set(2.6, 0.12, 0);
    cycloneLand.add(land);
    const hills = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x2f4a2c, flatShading: true })
    );
    hills.position.set(2.9, 0.45, -0.6);
    cycloneLand.add(hills);
    const town = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xc4a574 })
    );
    town.position.set(2.35, 0.35, 0.5);
    cycloneLand.add(town);
    cycloneLand.userData.id = 'landfall';
    root.add(cycloneLand);
    parts.set('landfall', cycloneLand);

    // Rising vapour over warm sea (formation)
    const vaporGeo = new THREE.BufferGeometry();
    const vCount = 90;
    const vPos = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      vPos[i * 3] = -1.2 + (Math.random() - 0.5) * 1.6;
      vPos[i * 3 + 1] = 0.2 + Math.random() * 0.8;
      vPos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    vaporGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
    cycloneVapor = new THREE.Points(
      vaporGeo,
      new THREE.PointsMaterial({ color: 0xa8d4f0, size: 0.06, transparent: true, opacity: 0.45 })
    );
    cycloneVapor.userData.id = 'form';
    root.add(cycloneVapor);

    // Storm body
    cycloneSpin = new THREE.Group();
    cycloneSpin.position.set(-1.2, 1.05, 0);
    root.add(cycloneSpin);

    const eye = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: 0xdbeafe, emissive: 0x93c5fd, emissiveIntensity: 0.3 })
    );
    eye.userData.id = 'eye';
    cycloneSpin.add(eye);
    parts.set('eye', eye);

    const eyewall = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.2, 12, 48),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.88,
        roughness: 0.7,
      })
    );
    eyewall.rotation.x = Math.PI / 2;
    eyewall.userData.id = 'eyewall';
    cycloneSpin.add(eyewall);
    parts.set('eyewall', eyewall);
    parts.set('strengthen', eyewall);

    const bands = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(1.1 + i * 0.4, 0.09, 8, 48),
        new THREE.MeshStandardMaterial({
          color: 0xcbd5e1,
          transparent: true,
          opacity: 0.55 - i * 0.1,
          roughness: 0.8,
        })
      );
      band.rotation.x = Math.PI / 2;
      band.rotation.z = i * 0.4;
      bands.add(band);
    }
    bands.userData.id = 'rainbands';
    cycloneSpin.add(bands);
    parts.set('rainbands', bands);

    // Rain over land at landfall
    const rainGeo = new THREE.BufferGeometry();
    const rCount = 140;
    const rPos = new Float32Array(rCount * 3);
    for (let i = 0; i < rCount; i++) {
      rPos[i * 3] = 2.0 + Math.random() * 1.4;
      rPos[i * 3 + 1] = 0.6 + Math.random() * 1.8;
      rPos[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    cycloneRain = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.04, transparent: true, opacity: 0 })
    );
    root.add(cycloneRain);

    camera.position.set(3.4, 3.2, 5.2);
    orbit.target.set(0.6, 0.7, 0);
    orbit.update();

    loadEl.textContent = 'Form → Strengthen → Landfall';
    setReadout('1 · Form on warm sea → 2 · Strengthen → 3 · Landfall on the coast');
  };

  const buildChem = () => {
    root.clear();
    parts.clear();
    scene.background = new THREE.Color(0x101820);

    const beaker = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.1, 1.4, 32, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x88c0d0,
        transparent: true,
        opacity: 0.25,
        roughness: 0.2,
        side: THREE.DoubleSide,
      })
    );
    beaker.position.y = 1.0;
    root.add(beaker);

    reactantA = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 })
    );
    reactantA.position.set(-0.45, 0.85, 0);
    reactantA.userData.id = 'reactants';
    root.add(reactantA);
    parts.set('reactants', reactantA);

    reactantB = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    reactantB.position.set(0.45, 0.85, 0);
    reactantB.userData.id = 'reactants';
    root.add(reactantB);

    const spark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshStandardMaterial({
        color: 0xfe580d,
        emissive: 0xff3300,
        emissiveIntensity: 0.4,
        flatShading: true,
      })
    );
    spark.position.set(0, 1.35, 0);
    spark.userData.id = 'reaction';
    root.add(spark);
    parts.set('reaction', spark);
    glowLight = new THREE.PointLight(0xff6600, 0.5, 6);
    glowLight.position.set(0, 1.4, 0);
    root.add(glowLight);

    productMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 0),
      new THREE.MeshStandardMaterial({
        color: 0xc8f542,
        flatShading: true,
        roughness: 0.45,
        transparent: true,
        opacity: 0.25,
      })
    );
    productMesh.position.set(0, 0.55, 0);
    productMesh.userData.id = 'products';
    root.add(productMesh);
    parts.set('products', productMesh);

    loadEl.textContent = 'Temperature + progress';
    setReadout('Raise temperature / progress — or tap Reactants, Reaction, Products');
  };

  const buildSolar = () => {
    root.clear();
    parts.clear();
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 20),
      new THREE.MeshStandardMaterial({
        color: 0xffcc44,
        emissive: 0xff8800,
        emissiveIntensity: 0.8,
      })
    );
    sun.position.y = 1.1;
    parts.set('sun', sun);
    root.add(sun);
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x3a7bd5, roughness: 0.55 })
    );
    earth.position.set(1.6, 1.1, 0);
    parts.set('earth', earth);
    root.add(earth);
    planet = earth;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.02, 8, 64),
      new THREE.MeshStandardMaterial({ color: 0xc8f542, roughness: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.1;
    parts.set('orbit', ring);
    root.add(ring);
    loadEl.textContent = 'Orbit + callouts';
    setReadout('Change orbit speed or tap Sun / Earth / Orbit');
  };

  const buildHeart = () => {
    root.clear();
    parts.clear();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.55 })
    );
    body.scale.set(1, 1.15, 0.85);
    body.position.y = 1.1;
    parts.set('chambers', body);
    root.add(body);
    heartMesh = body;
    const flow = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.06, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0xff8a80, emissive: 0xff1744, emissiveIntensity: 0.3 })
    );
    flow.position.y = 1.1;
    parts.set('flow', flow);
    root.add(flow);
    const valve = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffe082 })
    );
    valve.position.set(0.35, 1.35, 0.35);
    parts.set('valves', valve);
    root.add(valve);
    loadEl.textContent = 'Beat + callouts';
    setReadout('Change beat rate or tap Chambers / Flow / Valves');
  };

  const buildGeneric = () => {
    root.clear();
    parts.clear();
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 1),
      new THREE.MeshStandardMaterial({
        color: 0xfe580d,
        flatShading: true,
        metalness: 0.15,
        roughness: 0.55,
      })
    );
    core.position.y = 1.1;
    parts.set(hotspots[0]?.id || 'model', core);
    root.add(core);
    hotspots.slice(1, 3).forEach((h, i) => {
      const bit = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 12),
        new THREE.MeshStandardMaterial({ color: i === 0 ? 0xc8f542 : 0x60a5fa, roughness: 0.45 })
      );
      bit.position.set(i === 0 ? 1.2 : -1.1, 1.1 + i * 0.15, 0.2);
      parts.set(h.id, bit);
      root.add(bit);
    });
    loadEl.textContent = mesh?.note || 'Interactive topic model';
    setReadout('Tap callouts to highlight parts — use the Explore slider');
  };

  const addStub = () => {
    if (kind === 'volcano') buildVolcano();
    else if (kind === 'cyclone') buildCyclone();
    else if (kind === 'chem') buildChem();
    else if (kind === 'solar') buildSolar();
    else if (kind === 'heart') buildHeart();
    else buildGeneric();
  };

  const glb = (mesh?.glb_url || '').trim();
  if (glb) {
    const loader = new GLTFLoader();
    loader.load(
      glb,
      (gltf) => {
        root.clear();
        parts.clear();
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.2 / maxDim;
        model.scale.setScalar(scale);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.y += 1.1;
        root.add(model);
        // Still expose hotspot focuses even on GLB
        hotspots.forEach((h, i) => {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 10, 8),
            new THREE.MeshStandardMaterial({
              color: 0xc8f542,
              emissive: 0xc8f542,
              emissiveIntensity: 0.4,
            })
          );
          marker.position.set(Math.cos(i) * 0.9, 1.2 + i * 0.15, Math.sin(i) * 0.9);
          parts.set(h.id, marker);
          root.add(marker);
        });
        loadEl.textContent = mesh?.approved ? 'Approved GLB + interactions' : 'Draft GLB + interactions';
        setReadout('Orbit the model — tap callouts to highlight parts');
      },
      undefined,
      () => {
        addStub();
        loadEl.textContent = 'GLB failed — interactive local model';
      }
    );
  } else {
    addStub();
  }

  controls.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => focusId((btn as HTMLElement).dataset.id || ''));
  });
  controls.querySelector('[data-auto]')?.addEventListener('click', () => {
    orbit.autoRotate = !orbit.autoRotate;
    (controls.querySelector('[data-auto]') as HTMLButtonElement).textContent = orbit.autoRotate
      ? 'Auto orbit'
      : 'Orbit paused';
  });

  // Click mesh parts
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects([...parts.values()], true);
    if (!hits.length) return;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData.id && obj.parent) obj = obj.parent;
    const id =
      (obj?.userData.id as string) ||
      [...parts.entries()].find(([, o]) => o === hits[0].object || o.children.includes(hits[0].object))?.[0];
    if (id) focusId(id);
  });

  let alive = true;
  const clock = new THREE.Clock();
  const resize = () => {
    const w = stage.clientWidth || 640;
    const h = stage.clientHeight || 420;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const tick = () => {
    if (!alive) return;
    const t = clock.getElapsedTime();
    if (kind === 'volcano') {
      const heat = sliderVal('heat', 35) / 100;
      const erupt = sliderVal('erupt', 10) / 100;
      if (lavaMat) {
        lavaMat.emissiveIntensity = 0.35 + heat * 0.9 + erupt * 0.5;
        lavaMat.color.setRGB(1, 0.25 + (1 - heat) * 0.2, 0.05);
      }
      if (glowLight) glowLight.intensity = 0.4 + heat * 1.6 + erupt * 1.2;
      const lava = parts.get('lava');
      if (lava) {
        lava.position.y = 2.05 + erupt * 0.55 + Math.sin(t * (2 + erupt * 6)) * 0.04 * erupt;
        lava.scale.setScalar(0.85 + erupt * 0.7 + heat * 0.15);
      }
      if (ash) {
        ash.visible = erupt > 0.25;
        (ash.material as THREE.PointsMaterial).opacity = Math.min(1, erupt * 0.9);
        const pos = (ash.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + (0.01 + erupt * 0.04);
          if (y > 1.8) y = Math.random() * 0.1;
          pos.setY(i, y);
          pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * 0.01 * erupt);
        }
        pos.needsUpdate = true;
      }
    } else if (kind === 'cyclone' && cycloneSpin) {
      // Ocean temp may be 24–32°C scale from UI
      const oceanRaw = sliderVal('ocean_temp', sliderVal('temperature', sliderVal('temp', 27)));
      const oceanN = oceanRaw > 20 ? (oceanRaw - 24) / 8 : oceanRaw / 100; // 0..1
      const wind = sliderVal('wind', sliderVal('wind_speed', 40)) / 100;
      const landN = sliderVal('landfall', sliderVal('path', 5)) / 100;
      const overSea = 1 - landN;
      const fuel = Math.max(0, oceanN) * overSea;
      const spin = 0.25 + wind * 2.4 * (0.35 + fuel * 0.65) * (1 - landN * 0.45);
      cycloneSpin.rotation.y = t * spin;

      // Drift from warm sea (left) toward land (right)
      const x = -1.35 + landN * 3.4;
      cycloneSpin.position.set(x, 1.05 - landN * 0.15, Math.sin(t * 0.4) * 0.08 * wind);
      const shrink = 1 - landN * 0.35;
      cycloneSpin.scale.setScalar(0.75 + fuel * 0.35 + wind * 0.15 * overSea);

      if (cycloneOcean) {
        const mat = cycloneOcean.material as THREE.MeshStandardMaterial;
        mat.color.setRGB(0.05, 0.22 + oceanN * 0.25, 0.35 + oceanN * 0.2);
        mat.emissive = new THREE.Color(0x146077);
        mat.emissiveIntensity = 0.05 + oceanN * 0.35 * overSea;
      }

      if (cycloneVapor) {
        const showVapor = oceanN > 0.35 && landN < 0.55;
        cycloneVapor.visible = showVapor;
        (cycloneVapor.material as THREE.PointsMaterial).opacity = showVapor
          ? 0.25 + oceanN * 0.55 * overSea
          : 0;
        const pos = cycloneVapor.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + 0.008 + oceanN * 0.02;
          if (y > 2.2) y = 0.15 + Math.random() * 0.2;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      if (cycloneRain) {
        const raining = landN > 0.45;
        (cycloneRain.material as THREE.PointsMaterial).opacity = raining ? 0.25 + landN * 0.7 : 0;
        if (raining) {
          const pos = cycloneRain.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < pos.count; i++) {
            let y = pos.getY(i) - (0.04 + landN * 0.06);
            if (y < 0.15) y = 1.6 + Math.random() * 1.2;
            pos.setY(i, y);
          }
          pos.needsUpdate = true;
        }
      }

      if (cycloneLand) {
        cycloneLand.traverse((n) => {
          const m = (n as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m && 'emissive' in m) {
            m.emissive = new THREE.Color(landN > 0.6 ? 0xfe580d : 0x000000);
            m.emissiveIntensity = landN > 0.6 ? 0.15 * landN : 0;
          }
        });
      }

      const eye = parts.get('eye');
      if (eye) eye.scale.setScalar((1.05 - wind * 0.2) * shrink);
      const wall = parts.get('eyewall');
      if (wall) wall.scale.setScalar((0.9 + wind * 0.35 * overSea + fuel * 0.15) * shrink);
      const bands = parts.get('rainbands');
      if (bands) bands.scale.setScalar((0.85 + wind * 0.25 + landN * 0.2) * shrink);
    } else if (kind === 'chem') {
      const temp = sliderVal('temp', 40) / 100;
      const progress = sliderVal('progress', 15) / 100;
      const jitter = 0.02 + temp * 0.08;
      if (reactantA) {
        reactantA.position.x = -0.45 + (1 - progress) * 0 + progress * 0.35;
        reactantA.position.y = 0.85 + Math.sin(t * (3 + temp * 8)) * jitter;
        reactantA.scale.setScalar(1 - progress * 0.55);
      }
      if (reactantB) {
        reactantB.position.x = 0.45 - progress * 0.35;
        reactantB.position.y = 0.85 + Math.cos(t * (3 + temp * 8)) * jitter;
        reactantB.scale.setScalar(1 - progress * 0.55);
      }
      const spark = parts.get('reaction');
      if (spark) {
        spark.rotation.y = t * (1 + temp * 4);
        spark.scale.setScalar(0.6 + temp * 0.6 + progress * 0.4);
      }
      if (glowLight) glowLight.intensity = 0.3 + temp * 1.2 + progress * 0.8;
      if (productMesh) {
        const mat = (productMesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.opacity = 0.15 + progress * 0.85;
        productMesh.scale.setScalar(0.5 + progress * 0.9);
        productMesh.rotation.y = t * 0.6;
      }
    } else if (kind === 'solar' && planet) {
      const spd = Number((controls.querySelector('[data-orbit]') as HTMLInputElement)?.value || 40) / 100;
      const a = t * (0.4 + spd * 1.8);
      planet.position.set(Math.cos(a) * 1.6, 1.1, Math.sin(a) * 1.6);
    } else if (kind === 'heart' && heartMesh) {
      const bpm = Number((controls.querySelector('[data-beat]') as HTMLInputElement)?.value || 72);
      const pulse = 1 + Math.sin(t * (bpm / 60) * Math.PI * 2) * 0.08;
      heartMesh.scale.set(pulse, pulse * 1.15, pulse * 0.85);
    } else {
      const ex = Number((controls.querySelector('[data-explore]') as HTMLInputElement)?.value || 40) / 100;
      root.rotation.y = t * (0.15 + ex * 0.5);
    }
    orbit.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  return {
    dispose: () => {
      alive = false;
      ro.disconnect();
      orbit.dispose();
      renderer.dispose();
      host.innerHTML = '';
    },
    focus: focusId,
  };
}
