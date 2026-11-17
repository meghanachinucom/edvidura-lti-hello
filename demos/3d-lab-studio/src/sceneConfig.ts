import type { Callout, PlaygroundId } from './types';

export type SliderConfig = {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
};

export type HotspotConfig = {
  id: string;
  label: string;
};

export type QuizItem = {
  q: string;
  choices: string[];
  /** Index into choices */
  answer: number;
};

/** Chapter-driven chrome for a fixed 3D template (labels / sliders / quiz). */
export type SceneConfig = {
  hudHint: string;
  objectives: string[];
  hotspots: HotspotConfig[];
  sliders: SliderConfig[];
  quiz: QuizItem[];
  planner: 'llm' | 'heuristic';
  model?: string;
  /** LLM/heuristic topic pack: volcano | cyclone | chem | solar | heart | custom */
  interactionKind?: string;
  /** Optional callout/part id → student readout from the planner */
  focusHints?: Record<string, string>;
  mesh?: {
    provider?: string;
    task_id?: string;
    status?: string;
    glb_url?: string;
    thumbnail_url?: string;
    prompt?: string;
    approved?: boolean;
    note?: string;
    mode?: string;
  };
};

export type ChapterPlan = {
  playground: PlaygroundId;
  title: string;
  summaryMd: string;
  callouts: Callout[];
  scene: SceneConfig;
  confidence: number;
  rationale: string;
};

export const PLAYGROUND_IDS: PlaygroundId[] = [
  'forces',
  'cell_tour',
  'circuit',
  'fraction_bar',
  'photosynthesis',
  'water_cycle',
  'digestive',
  'light_mirror',
  'ai_mesh',
];

/** Default chrome per template — overridden by chapter planner. */
export const TEMPLATE_DEFAULTS: Record<
  PlaygroundId,
  {
    hotspots: HotspotConfig[];
    sliders: SliderConfig[];
    hudHint: string;
  }
> = {
  forces: {
    hudHint: 'a = F ÷ m (watch friction)',
    hotspots: [],
    sliders: [
      { id: 'f', label: 'Force F', min: 0, max: 20, step: 0.5, value: 8 },
      { id: 'm', label: 'Mass m', min: 1, max: 12, step: 0.5, value: 4 },
      { id: 'mu', label: 'Friction', min: 0, max: 0.4, step: 0.02, value: 0.08 },
    ],
  },
  cell_tour: {
    hudHint: 'Drag to orbit · click an organelle',
    hotspots: [
      { id: 'nucleus', label: 'Nucleus' },
      { id: 'mito', label: 'Mitochondria' },
      { id: 'membrane', label: 'Membrane' },
    ],
    sliders: [],
  },
  circuit: {
    hudHint: 'Close the switch to light the bulb',
    hotspots: [],
    sliders: [],
  },
  fraction_bar: {
    hudHint: 'Parts of a whole',
    hotspots: [],
    sliders: [
      { id: 'den', label: 'Parts (denominator)', min: 2, max: 12, step: 1, value: 4 },
      { id: 'num', label: 'Shaded (numerator)', min: 0, max: 4, step: 1, value: 3 },
    ],
  },
  photosynthesis: {
    hudHint: 'Food-making depends on light and CO₂',
    hotspots: [],
    sliders: [
      { id: 'sun', label: 'Sunlight', min: 0, max: 100, value: 55 },
      { id: 'co2', label: 'CO₂ available', min: 20, max: 100, value: 70 },
    ],
  },
  water_cycle: {
    hudHint: 'Heat the sea · build cloud · rain on land',
    hotspots: [
      { id: 'evap', label: 'Evaporation' },
      { id: 'cloud', label: 'Cloud' },
      { id: 'rain', label: 'Monsoon rain' },
    ],
    sliders: [
      { id: 'heat', label: 'Sun / heat', min: 0, max: 100, value: 48 },
      { id: 'cloud', label: 'Cloud build-up', min: 0, max: 100, value: 38 },
    ],
  },
  digestive: {
    hudHint: 'Follow the food bolus',
    hotspots: [
      { id: 'mouth', label: 'Mouth' },
      { id: 'stomach', label: 'Stomach' },
      { id: 'intestine', label: 'Intestine' },
    ],
    sliders: [],
  },
  light_mirror: {
    hudHint: 'i = r on a plane mirror',
    hotspots: [],
    sliders: [{ id: 'i', label: 'Angle of incidence i (°)', min: 5, max: 80, value: 40 }],
  },
  ai_mesh: {
    hudHint: 'Orbit the AI-generated classroom model',
    hotspots: [],
    sliders: [],
  },
};

/** Apply chapter labels / slider ranges onto runtime control DOM. */
export function applySceneChrome(
  controls: HTMLElement,
  hud: HTMLElement | null,
  scene?: SceneConfig | null
): void {
  if (!scene) return;
  const readout = hud?.querySelector('[data-readout]') as HTMLElement | null;
  if (readout && scene.hudHint) readout.textContent = scene.hudHint;

  for (const s of scene.sliders) {
    const input = controls.querySelector(`[data-${cssIdent(s.id)}]`) as HTMLInputElement | null;
    if (!input) continue;
    if (Number.isFinite(s.min)) input.min = String(s.min);
    if (Number.isFinite(s.max)) input.max = String(s.max);
    if (s.step != null) input.step = String(s.step);
    if (Number.isFinite(s.value)) input.value = String(s.value);
    const label = input.closest('label');
    if (label && s.label) {
      const nodes = Array.from(label.childNodes);
      const textNode = nodes.find((n) => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = `${s.label} `;
      else label.insertBefore(document.createTextNode(`${s.label} `), input);
    }
  }

  for (const h of scene.hotspots) {
    const btn = controls.querySelector(`button[data-id="${cssIdent(h.id)}"]`) as HTMLButtonElement | null;
    if (btn && h.label) btn.textContent = h.label;
  }
}

function cssIdent(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
