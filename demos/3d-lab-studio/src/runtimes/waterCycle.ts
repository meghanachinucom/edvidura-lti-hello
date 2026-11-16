import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { applySceneChrome } from '../sceneConfig';
import type { LabHandle, RuntimeOpts } from '../types';

function makeSkyTexture(storm = 0): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 512);
  const top = lerpColor('#9fd4f5', '#4a6a88', storm);
  const mid = lerpColor('#6eb6e8', '#3d5570', storm);
  const bot = lerpColor('#c8e6f8', '#6a7f94', storm);
  grd.addColorStop(0, top);
  grd.addColorStop(0.45, mid);
  grd.addColorStop(1, bot);
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  // soft sun disc
  const sx = 120;
  const sy = 90;
  const rg = g.createRadialGradient(sx, sy, 4, sx, sy, 90);
  rg.addColorStop(0, `rgba(255,240,180,${0.95 - storm * 0.5})`);
  rg.addColorStop(0.4, `rgba(255,210,120,${0.35 - storm * 0.2})`);
  rg.addColorStop(1, 'rgba(255,200,100,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lerpColor(a: string, b: string, t: number): string {
  const pa = hex(a);
  const pb = hex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function hex(h: string): [number, number, number] {
  const n = h.replace('#', '');
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

/**
 * Showcase — Water cycle / Indian monsoon with stronger graphics.
 */
export function mountWaterCycle(opts: RuntimeOpts): LabHandle {
  const host = opts.host;
  host.innerHTML = '';

  const stage = document.createElement('div');
  stage.className = 'stage stage-showcase';
  const canvas = document.createElement('canvas');
  stage.appendChild(canvas);

  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <span class="hud-pill hud-accent">Showcase · Monsoon</span>
    <span class="hud-pill" data-readout>Heat the Arabian Sea · build cloud · rain on the Deccan</span>
  `;
  stage.appendChild(hud);

  const controlsEl = document.createElement('div');
  controlsEl.className = 'controls';
  controlsEl.innerHTML = `
    <label>Sun / heat <input type="range" min="0" max="100" value="48" data-heat /></label>
    <label>Cloud build-up <input type="range" min="0" max="100" value="38" data-cloud /></label>
    <button type="button" class="btn btn-ghost" data-id="evap">Evaporation</button>
    <button type="button" class="btn btn-ghost" data-id="cloud">Cloud</button>
    <button type="button" class="btn btn-ghost" data-id="rain">Monsoon rain</button>
    <button type="button" class="btn btn-primary" data-auto>Auto orbit</button>
  `;
  host.appendChild(stage);
  host.appendChild(controlsEl);
  applySceneChrome(controlsEl, hud, opts.scene);

  const readout = hud.querySelector('[data-readout]') as HTMLElement;
  const heatIn = controlsEl.querySelector('[data-heat]') as HTMLInputElement;
  const cloudIn = controlsEl.querySelector('[data-cloud]') as HTMLInputElement;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  let skyTex = makeSkyTexture(0);
  scene.background = skyTex;
  scene.fog = new THREE.FogExp2(0x7ec0e8, 0.018);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(8.5, 5.2, 12.5);

  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.048;
  orbit.minDistance = 8;
  orbit.maxDistance = 22;
  orbit.maxPolarAngle = Math.PI * 0.47;
  orbit.target.set(0.4, 1.4, 0);
  orbit.autoRotate = true;
  orbit.autoRotateSpeed = 0.28;

  // Lights
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x2d4a38, 0.7);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffe6b8, 1.45);
  sunLight.position.set(10, 14, 5);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 50;
  sunLight.shadow.camera.left = -14;
  sunLight.shadow.camera.right = 14;
  sunLight.shadow.camera.top = 14;
  sunLight.shadow.camera.bottom = -14;
  sunLight.shadow.bias = -0.00025;
  scene.add(sunLight);
  const rim = new THREE.DirectionalLight(0x89b4fa, 0.4);
  rim.position.set(-8, 3, -6);
  scene.add(rim);
  const warmFill = new THREE.PointLight(0xffaa66, 0.55, 28);
  warmFill.position.set(-5, 3, 4);
  scene.add(warmFill);

  // —— Animated water (vertex waves) ——
  const waterGeo = new THREE.PlaneGeometry(11, 9, 96, 72);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a6a9c,
    metalness: 0.45,
    roughness: 0.08,
    transmission: 0.22,
    thickness: 1.4,
    ior: 1.33,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.95,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(-3.2, 0, 0);
  water.receiveShadow = true;
  water.castShadow = true;
  water.userData.id = 'evap';
  scene.add(water);

  const basePositions = waterGeo.attributes.position.array.slice(0) as Float32Array;

  // Foam edge
  const foam = new THREE.Mesh(
    new THREE.TorusGeometry(4.9, 0.08, 10, 80),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.5,
    })
  );
  foam.rotation.x = Math.PI / 2;
  foam.position.set(-3.2, 0.08, 0);
  scene.add(foam);

  // —— Land / Deccan ——
  const land = new THREE.Group();
  land.position.set(4.0, 0, 0.3);
  const landBody = new THREE.Mesh(
    new THREE.CylinderGeometry(3.9, 4.15, 0.85, 56),
    new THREE.MeshStandardMaterial({ color: 0x5c8a42, roughness: 0.9, metalness: 0.04 })
  );
  landBody.position.y = 0.15;
  landBody.receiveShadow = true;
  landBody.castShadow = true;
  landBody.userData.id = 'rain';
  land.add(landBody);

  // Ghats ridge
  for (let i = 0; i < 7; i++) {
    const h = 1.0 + (i % 3) * 0.35;
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(0.45 + (i % 2) * 0.15, h, 7),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.28, 0.35, 0.28 + (i % 3) * 0.04),
        roughness: 0.92,
      })
    );
    peak.position.set(-0.8 + i * 0.55, 0.55 + h * 0.35, -1.1 + (i % 3) * 0.4);
    peak.castShadow = true;
    peak.receiveShadow = true;
    land.add(peak);
  }

  // Terraced fields
  const fieldColors = [0xc5d96a, 0x8fbc4a, 0xd4c15a, 0x6fa83a];
  for (let i = 0; i < 6; i++) {
    const field = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.07, 0.6),
      new THREE.MeshStandardMaterial({ color: fieldColors[i % 4], roughness: 0.95 })
    );
    field.position.set(-0.3 + (i % 3) * 1.15, 0.6, 1.0 + Math.floor(i / 3) * 0.75);
    field.receiveShadow = true;
    land.add(field);
  }
  scene.add(land);

  // —— Volumetric-looking cloud ——
  const cloud = new THREE.Group();
  cloud.position.set(1.0, 4.0, 0);
  cloud.userData.id = 'cloud';
  const cloudMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  for (let i = 0; i < 18; i++) {
    const s = 0.55 + Math.random() * 0.75;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), cloudMat.clone());
    puff.scale.set(s * 1.3, s * 0.85, s * 1.1);
    puff.position.set(
      (Math.random() - 0.5) * 3.2,
      (Math.random() - 0.5) * 1.1,
      (Math.random() - 0.5) * 2.0
    );
    puff.castShadow = true;
    cloud.add(puff);
  }
  // Dark underbelly for storm
  const under = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
    })
  );
  under.position.y = -0.55;
  under.scale.set(1.6, 0.45, 1.2);
  cloud.add(under);
  scene.add(cloud);

  // —— Evaporation mist ——
  const vapourCount = 220;
  const vapourGeo = new THREE.BufferGeometry();
  const vPos = new Float32Array(vapourCount * 3);
  const vPhase = new Float32Array(vapourCount);
  for (let i = 0; i < vapourCount; i++) {
    vPhase[i] = Math.random();
    vPos[i * 3] = -6 + Math.random() * 5;
    vPos[i * 3 + 1] = 0.2;
    vPos[i * 3 + 2] = -3.5 + Math.random() * 7;
  }
  vapourGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  const vapour = new THREE.Points(
    vapourGeo,
    new THREE.PointsMaterial({
      color: 0xf0f9ff,
      size: 0.09,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  vapour.userData.id = 'evap';
  scene.add(vapour);

  // Surface sparkle when hot
  const sparkCount = 60;
  const sparkGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    sPos[i * 3] = -6 + Math.random() * 5;
    sPos[i * 3 + 1] = 0.12;
    sPos[i * 3 + 2] = -3 + Math.random() * 6;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: 0xffe08a,
      size: 0.06,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  scene.add(sparks);

  // —— Rain streaks ——
  const rainCount = 700;
  const rainGeo = new THREE.BufferGeometry();
  const rPos = new Float32Array(rainCount * 3);
  const rSpeed = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    rPos[i * 3] = 1.2 + Math.random() * 5.5;
    rPos[i * 3 + 1] = Math.random() * 5;
    rPos[i * 3 + 2] = -2.5 + Math.random() * 5;
    rSpeed[i] = 0.1 + Math.random() * 0.12;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({
      color: 0xbfdbfe,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    })
  );
  rain.visible = false;
  rain.userData.id = 'rain';
  scene.add(rain);

  // Wet ground sheen
  const wet = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0x3b6e9e,
      metalness: 0.35,
      roughness: 0.15,
      transparent: true,
      opacity: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    })
  );
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(4.0, 0.6, 0.3);
  scene.add(wet);

  // Distant horizon haze disc
  const haze = new THREE.Mesh(
    new THREE.RingGeometry(14, 22, 64),
    new THREE.MeshBasicMaterial({
      color: 0xa8d4f0,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  haze.rotation.x = -Math.PI / 2;
  haze.position.y = -0.4;
  scene.add(haze);

  // Post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.55, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let alive = true;
  let lastStorm = -1;

  const resize = () => {
    const w = stage.clientWidth || 720;
    const h = Math.max(stage.clientHeight, 520);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  const focusId = (id: string) => {
    if (id === 'evap') {
      heatIn.value = '78';
      readout.textContent = 'Evaporation — Arabian Sea heats up; vapour rises';
    } else if (id === 'cloud') {
      cloudIn.value = '72';
      readout.textContent = 'Condensation — moisture piles into monsoon cloud';
    } else if (id === 'rain') {
      heatIn.value = '58';
      cloudIn.value = '88';
      readout.textContent = 'Monsoon rain — water returns to Deccan land & fields';
    }
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

  const clock = new THREE.Clock();
  const posAttr = waterGeo.attributes.position as THREE.BufferAttribute;

  const tick = () => {
    if (!alive) return;
    const t = clock.getElapsedTime();
    const heat = Number(heatIn.value) / 100;
    const cloudAmt = Number(cloudIn.value) / 100;
    const storm = Math.min(1, cloudAmt * 0.85 + (cloudAmt > 0.55 ? 0.15 : 0));

    // Sky refresh when storm amount changes meaningfully
    if (Math.abs(storm - lastStorm) > 0.04) {
      lastStorm = storm;
      skyTex.dispose();
      skyTex = makeSkyTexture(storm);
      scene.background = skyTex;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.set(storm > 0.45 ? 0x5a7390 : 0x7ec0e8);
        scene.fog.density = 0.016 + storm * 0.02;
      }
    }

    sunLight.intensity = 0.4 + heat * 1.5 - storm * 0.35;
    warmFill.intensity = 0.25 + heat * 0.7;
    hemi.intensity = 0.55 + heat * 0.25;
    bloom.strength = 0.4 + heat * 0.35 + (rain.visible ? 0.1 : 0);
    renderer.toneMappingExposure = 1.05 + heat * 0.25 - storm * 0.1;

    // Wave displacement
    for (let i = 0; i < posAttr.count; i++) {
      const x = basePositions[i * 3];
      const z = basePositions[i * 3 + 2];
      const wave =
        Math.sin(x * 0.55 + t * 1.4) * 0.08 +
        Math.sin(z * 0.7 + t * 1.1) * 0.06 +
        Math.sin((x + z) * 0.35 + t * 0.8) * 0.05;
      posAttr.setY(i, wave * (0.6 + heat * 0.8));
    }
    posAttr.needsUpdate = true;
    waterGeo.computeVertexNormals();
    waterMat.roughness = 0.06 + (1 - heat) * 0.12;
    waterMat.color.setRGB(0.04, 0.35 + heat * 0.08, 0.55 + heat * 0.05);

    foam.rotation.z = t * 0.08;
    foam.scale.setScalar(1 + Math.sin(t * 1.2) * 0.015);
    (foam.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2 + heat * 0.5;

    // Cloud
    cloud.scale.setScalar(0.5 + cloudAmt * 1.15);
    cloud.position.x = 0.6 + Math.sin(t * 0.22) * 1.4;
    cloud.position.y = 3.6 + cloudAmt * 0.7;
    cloud.children.forEach((c, i) => {
      if (c instanceof THREE.Mesh) {
        c.position.y += Math.sin(t * 0.9 + i) * 0.0012;
        if (c.material instanceof THREE.MeshPhysicalMaterial) {
          c.material.opacity = 0.55 + cloudAmt * 0.35;
          c.material.color.setRGB(0.95 - storm * 0.25, 0.96 - storm * 0.2, 0.98 - storm * 0.1);
        }
        if (c.material instanceof THREE.MeshStandardMaterial && i === cloud.children.length - 1) {
          c.material.opacity = 0.2 + storm * 0.45;
        }
      }
    });

    // Vapour
    const vp = vapour.geometry.attributes.position as THREE.BufferAttribute;
    const vMat = vapour.material as THREE.PointsMaterial;
    vMat.opacity = heat > 0.08 ? 0.2 + heat * 0.55 : 0;
    vapour.visible = heat > 0.06;
    for (let i = 0; i < vapourCount; i++) {
      const phase = (vPhase[i] + t * (0.12 + heat * 0.5)) % 1;
      vp.setY(i, 0.25 + phase * (3.2 + heat * 2));
      vp.setX(i, -5.5 + (i % 22) * 0.22 + Math.sin(t * 0.7 + i) * 0.15);
    }
    vp.needsUpdate = true;

    // Sparks on hot water
    const sp = sparks.material as THREE.PointsMaterial;
    sp.opacity = heat > 0.5 ? (heat - 0.5) * 1.2 : 0;

    const raining = cloudAmt > 0.5 && heat > 0.2;
    rain.visible = raining;
    const wetMat = wet.material as THREE.MeshPhysicalMaterial;
    wetMat.opacity = raining
      ? Math.min(0.55, wetMat.opacity + 0.02)
      : Math.max(0, wetMat.opacity - 0.015);

    if (raining) {
      const rp = rain.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < rainCount; i++) {
        let y = rp.getY(i) - rSpeed[i] * (1.2 + cloudAmt);
        if (y < 0.55) {
          y = 4.2 + Math.random() * 1.5;
          rp.setX(i, 1.2 + Math.random() * 5.5);
          rp.setZ(i, -2.5 + Math.random() * 5);
        }
        rp.setY(i, y);
      }
      rp.needsUpdate = true;
      readout.textContent = 'Monsoon burst — rain on land & fields';
    } else if (heat > 0.6) {
      readout.textContent = 'Strong evaporation off the sea — vapour feeds the cloud';
    } else if (cloudAmt > 0.55) {
      readout.textContent = 'Heavy cloud — raise heat a little for rain';
    } else if (heat < 0.25) {
      readout.textContent = 'Cooler — less vapour rising';
    } else {
      readout.textContent = 'Water cycle running — tune heat & cloud';
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
      orbit.dispose();
      skyTex.dispose();
      composer.dispose();
      renderer.dispose();
      host.innerHTML = '';
    },
    focus: focusId,
  };
}
