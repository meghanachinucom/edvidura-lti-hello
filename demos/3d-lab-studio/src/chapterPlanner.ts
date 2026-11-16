import { fetchLlmLabPlan, plannerLabel, resolveLlmProvider } from './llmPlanner';
import {
  PLAYGROUND_IDS,
  TEMPLATE_DEFAULTS,
  type ChapterPlan,
  type QuizItem,
  type SceneConfig,
  type SliderConfig,
} from './sceneConfig';
import type { Callout, PlaygroundId } from './types';

const CALLOUT_KEYS: Record<PlaygroundId, { id: string; label: string; keys: string[] }[]> = {
  forces: [
    { id: 'force', label: 'Force (F)', keys: ['force', 'push', 'newton'] },
    { id: 'mass', label: 'Mass (m)', keys: ['mass', 'inertia'] },
    { id: 'accel', label: 'Acceleration (a)', keys: ['accelerat', 'f = m', 'second law'] },
  ],
  cell_tour: [
    { id: 'nucleus', label: 'Nucleus', keys: ['nucleus', 'genetic'] },
    { id: 'mito', label: 'Mitochondria', keys: ['mitochondr', 'powerhouse'] },
    { id: 'membrane', label: 'Plasma membrane', keys: ['membrane', 'selectively permeable'] },
  ],
  circuit: [
    { id: 'battery', label: 'Cell / battery', keys: ['battery', 'cell', 'voltage'] },
    { id: 'bulb', label: 'Bulb', keys: ['bulb', 'lamp', 'glow'] },
    { id: 'switch', label: 'Switch', keys: ['switch', 'open circuit', 'closed'] },
  ],
  fraction_bar: [
    { id: 'whole', label: 'Whole', keys: ['whole', 'one complete'] },
    { id: 'numerator', label: 'Numerator', keys: ['numerator', 'shaded'] },
    { id: 'denominator', label: 'Denominator', keys: ['denominator', 'equal parts'] },
  ],
  photosynthesis: [
    { id: 'sun', label: 'Sunlight', keys: ['sunlight', 'light energy'] },
    { id: 'leaf', label: 'Leaf / chlorophyll', keys: ['chlorophyll', 'leaf'] },
    { id: 'oxygen', label: 'Oxygen', keys: ['oxygen', 'released'] },
  ],
  water_cycle: [
    { id: 'evap', label: 'Evaporation', keys: ['evaporat', 'vapour', 'vapor'] },
    { id: 'cloud', label: 'Cloud / condensation', keys: ['condens', 'cloud'] },
    { id: 'rain', label: 'Rain (precipitation)', keys: ['precipitat', 'rain', 'monsoon'] },
  ],
  digestive: [
    { id: 'mouth', label: 'Mouth', keys: ['mouth', 'saliva'] },
    { id: 'stomach', label: 'Stomach', keys: ['stomach', 'gastric'] },
    { id: 'intestine', label: 'Small intestine', keys: ['intestine', 'absorpt'] },
  ],
  light_mirror: [
    { id: 'incident', label: 'Incident ray', keys: ['incident', 'incoming'] },
    { id: 'normal', label: 'Normal', keys: ['normal', 'perpendicular'] },
    { id: 'reflected', label: 'Reflected ray', keys: ['reflect', 'i = r'] },
  ],
  ai_mesh: [
    { id: 'model', label: '3D model', keys: ['model', 'structure', 'object'] },
    { id: 'parts', label: 'Main parts', keys: ['part', 'section', 'layer'] },
    { id: 'use', label: 'Why it matters', keys: ['important', 'because', 'helps'] },
  ],
};

/** Extra callout packs for new topics that use the AI mesh playground. */
const TOPIC_CALLOUTS: { re: RegExp; items: { id: string; label: string; keys: string[] }[] }[] = [
  {
    re: /volcano|volcanic|lava|magma|erupt/,
    items: [
      { id: 'magma', label: 'Magma chamber', keys: ['magma', 'chamber', 'molten'] },
      { id: 'vent', label: 'Vent / crater', keys: ['vent', 'crater', 'opening'] },
      { id: 'lava', label: 'Lava & ash', keys: ['lava', 'ash', 'erupt'] },
    ],
  },
  {
    re: /cyclone|hurricane|typhoon|eye wall|eyewall|landfall/,
    items: [
      { id: 'form', label: 'How it forms', keys: ['form', 'warm ocean', 'low pressure', 'evapor'] },
      { id: 'strengthen', label: 'Strengthen over sea', keys: ['strengthen', 'eyewall', 'wind', 'energy'] },
      { id: 'landfall', label: 'Hits land', keys: ['landfall', 'coast', 'land', 'weaken'] },
      { id: 'eye', label: 'Eye (calm centre)', keys: ['eye', 'calm', 'centre', 'center'] },
      { id: 'eyewall', label: 'Eyewall / winds', keys: ['eyewall', 'eye wall', 'wind', 'spiral'] },
      { id: 'rainbands', label: 'Rain bands', keys: ['rain', 'band', 'cloud', 'moisture'] },
    ],
  },
  {
    re: /chemical\s*reaction|reactant|exothermic|endothermic|bond break|products of reaction/,
    items: [
      { id: 'reactants', label: 'Reactants', keys: ['reactant', 'starting', 'substance'] },
      { id: 'reaction', label: 'Reaction', keys: ['reaction', 'collide', 'break', 'form'] },
      { id: 'products', label: 'Products', keys: ['product', 'new substance', 'formed'] },
    ],
  },
  {
    re: /solar system|planet|orbit|sun and earth/,
    items: [
      { id: 'sun', label: 'Sun', keys: ['sun', 'star'] },
      { id: 'earth', label: 'Earth', keys: ['earth', 'planet'] },
      { id: 'orbit', label: 'Orbit', keys: ['orbit', 'revolv'] },
    ],
  },
  {
    re: /heart|circulat|blood vessel|cardiac/,
    items: [
      { id: 'chambers', label: 'Chambers', keys: ['chamber', 'atrium', 'ventricle'] },
      { id: 'flow', label: 'Blood flow', keys: ['blood', 'pump', 'circulat'] },
      { id: 'valves', label: 'Valves', keys: ['valve', 'prevent'] },
    ],
  },
];

function calloutKeysFor(playground: PlaygroundId, text: string) {
  if (playground === 'ai_mesh') {
    const low = text.toLowerCase();
    const hit = TOPIC_CALLOUTS.find((t) => t.re.test(low));
    if (hit) return hit.items;
  }
  return CALLOUT_KEYS[playground];
}

function pickPlayground(text: string): { id: PlaygroundId; confidence: number; rationale: string } {
  const low = text.toLowerCase();
  // New-topic packs first — stop keyword collisions (e.g. cyclone rain → water cycle)
  if (/cyclone|hurricane|typhoon|eyewall|eye wall/.test(low)) {
    return { id: 'ai_mesh', confidence: 0.8, rationale: 'cyclones / tropical storm' };
  }
  if (/chemical\s*reaction|reactants?|exothermic|endothermic|products of reaction/.test(low)) {
    return { id: 'ai_mesh', confidence: 0.8, rationale: 'chemical reaction' };
  }
  if (/volcano|lava|magma|erupt/.test(low)) {
    return { id: 'ai_mesh', confidence: 0.8, rationale: 'volcanoes' };
  }
  const rules: { id: PlaygroundId; re: RegExp; why: string }[] = [
    { id: 'fraction_bar', re: /(fraction|numerator|denominator|equal parts|shaded)/, why: 'fraction language' },
    { id: 'photosynthesis', re: /(photosynth|chlorophyll|stomata|nutrition in plants)/, why: 'plant nutrition' },
    { id: 'water_cycle', re: /(water cycle|evaporat|condens|monsoon|precipitation)/, why: 'water cycle / monsoon' },
    { id: 'digestive', re: /(digest|oesophagus|esophagus|stomach|intestine|bolus)/, why: 'digestion' },
    { id: 'light_mirror', re: /(mirror|reflect|incidence|ray of light)/, why: 'reflection' },
    { id: 'circuit', re: /(circuit|battery|bulb|switch|current|voltage)/, why: 'electric circuit' },
    { id: 'cell_tour', re: /(cell|nucleus|mitochondr|organelle|membrane|fundamental unit)/, why: 'cell structure' },
    { id: 'forces', re: /(force|mass|accelerat|newton|friction|laws of motion)/, why: 'force & motion' },
  ];
  for (const r of rules) {
    if (r.re.test(low)) return { id: r.id, confidence: 0.72, rationale: r.why };
  }
  return {
    id: 'ai_mesh',
    confidence: 0.55,
    rationale: 'new topic — no fixed template; using interactive AI 3D path',
  };
}

function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 28 && s.length < 320);
}

function snippet(chapter: string, keys: string[], label: string): string {
  const low = chapter.toLowerCase();
  const sentences = sentencesOf(chapter);
  for (const key of keys) {
    const hit = sentences.find((s) => s.toLowerCase().includes(key));
    if (hit) return hit.slice(0, 400);
  }
  for (const key of keys) {
    const idx = low.indexOf(key);
    if (idx >= 0) {
      const start = Math.max(0, chapter.lastIndexOf('.', idx) + 1);
      const end = chapter.indexOf('.', idx + key.length);
      const slice = chapter.slice(start, end > idx ? end + 1 : idx + 160).trim();
      if (slice.length > 20) return slice.slice(0, 400);
    }
  }
  return sentences[0]?.slice(0, 400) || `From your chapter: review ${label.toLowerCase()}.`;
}

function guessTitle(text: string, fallback: string): string {
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length >= 8 && l.length <= 90 && !/^page\s+\d+/i.test(l));
  return (fallback.trim() || line || 'Chapter lab').slice(0, 120);
}

function summarize(text: string, maxChars = 3500): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n\n…(chapter truncated for lab draft)`;
}

function objectivesFrom(text: string, playground: PlaygroundId): string[] {
  const seeds = calloutKeysFor(playground, text)
    .slice(0, 3)
    .map((c) => {
      const bit = snippet(text, c.keys, c.label);
      return `Explain ${c.label}: ${bit.slice(0, 110)}${bit.length > 110 ? '…' : ''}`;
    });
  return seeds;
}

function quizFrom(text: string, playground: PlaygroundId): QuizItem[] {
  const callouts = calloutKeysFor(playground, text);
  const items: QuizItem[] = [];
  for (const c of callouts.slice(0, 2)) {
    const body = snippet(text, c.keys, c.label);
    const wrong = callouts.filter((x) => x.id !== c.id).map((x) => x.label);
    items.push({
      q: `According to this chapter, which idea fits best with “${c.label}”?`,
      choices: [body.slice(0, 100), `Only about ${wrong[0] || 'another topic'}`, 'Not in this chapter'],
      answer: 0,
    });
  }
  return items;
}

function mergeSliders(playground: PlaygroundId, overrides?: Partial<SliderConfig>[]): SliderConfig[] {
  const base = TEMPLATE_DEFAULTS[playground].sliders.map((s) => ({ ...s }));
  if (!overrides?.length) return base;
  for (const o of overrides) {
    if (!o?.id) continue;
    const hit = base.find((s) => s.id === o.id);
    if (!hit) continue;
    if (o.label) hit.label = o.label;
    if (o.min != null) hit.min = o.min;
    if (o.max != null) hit.max = o.max;
    if (o.step != null) hit.step = o.step;
    if (o.value != null) hit.value = Math.min(hit.max, Math.max(hit.min, o.value));
  }
  return base;
}

export function planChapterHeuristic(title: string, body: string): ChapterPlan {
  const text = body.trim() || title.trim();
  const pick = pickPlayground(`${title}\n${text}`);
  const playground = pick.id;
  const defaults = TEMPLATE_DEFAULTS[playground];
  const keys = calloutKeysFor(playground, `${title}\n${text}`);
  const callouts: Callout[] = keys.map((c) => ({
    id: c.id,
    label: c.label,
    body: snippet(text, c.keys, c.label),
  }));
  const topicTitle = guessTitle(text, title);
  const topicLow = `${title}\n${text}`.toLowerCase();
  const aiSliders =
    playground === 'ai_mesh'
      ? /volcano|lava|magma|erupt/.test(topicLow)
        ? [
            { id: 'heat', label: 'Magma heat', min: 0, max: 100, value: 35 },
            { id: 'erupt', label: 'Eruption', min: 0, max: 100, value: 10 },
          ]
        : /cyclone|hurricane|typhoon/.test(topicLow)
          ? [
              { id: 'ocean_temp', label: 'Ocean temperature (°C)', min: 24, max: 32, value: 27 },
              { id: 'wind', label: 'Wind speed (km/h)', min: 0, max: 100, value: 40 },
              { id: 'landfall', label: 'Path to land', min: 0, max: 100, value: 5 },
            ]
          : /chemical\s*reaction|reactant|exothermic|endothermic/.test(topicLow)
            ? [
                { id: 'temp', label: 'Temperature', min: 0, max: 100, value: 40 },
                { id: 'progress', label: 'Reaction progress', min: 0, max: 100, value: 15 },
              ]
            : /solar|planet|orbit/.test(topicLow)
              ? [{ id: 'orbit', label: 'Orbit speed', min: 0, max: 100, value: 40 }]
              : /heart|circulat|cardiac/.test(topicLow)
                ? [{ id: 'beat', label: 'Beat rate', min: 40, max: 140, value: 72 }]
                : [{ id: 'explore', label: 'Explore', min: 0, max: 100, value: 40 }]
      : mergeSliders(playground);

  const interactionKind =
    playground === 'ai_mesh'
      ? /volcano|lava|magma|erupt/.test(topicLow)
        ? 'volcano'
        : /cyclone|hurricane|typhoon/.test(topicLow)
          ? 'cyclone'
          : /chemical\s*reaction|reactant|exothermic|endothermic/.test(topicLow)
            ? 'chem'
            : /solar|planet|orbit/.test(topicLow)
              ? 'solar'
              : /heart|circulat|cardiac/.test(topicLow)
                ? 'heart'
                : 'custom'
      : undefined;

  const scene: SceneConfig = {
    hudHint:
      playground === 'ai_mesh'
        ? `Try the controls for “${topicTitle}” — tap callouts to focus parts`
        : defaults.hudHint,
    objectives: objectivesFrom(text, playground),
    hotspots: (defaults.hotspots.length
      ? defaults.hotspots
      : keys.map((k) => ({ id: k.id, label: k.label }))
    ).map((h) => {
      const c = callouts.find((x) => x.id === h.id);
      return { id: h.id, label: c?.label || h.label };
    }),
    sliders: aiSliders,
    quiz: quizFrom(text, playground),
    planner: 'heuristic',
    interactionKind,
  };
  return {
    playground,
    title: topicTitle,
    summaryMd: summarize(text),
    callouts,
    scene,
    confidence: pick.confidence,
    rationale: pick.rationale,
  };
}

function normalizeSliders(
  playground: PlaygroundId,
  raw?: { id?: string; label?: string; min?: number; max?: number; step?: number; value?: number }[]
): SliderConfig[] {
  if (playground === 'ai_mesh' && raw?.length) {
    return raw
      .filter((s) => s?.id && s?.label)
      .slice(0, 3)
      .map((s) => {
        const min = Number.isFinite(s.min) ? Number(s.min) : 0;
        const max = Number.isFinite(s.max) ? Number(s.max) : 100;
        const value = Number.isFinite(s.value) ? Number(s.value) : min;
        return {
          id: String(s.id).slice(0, 32),
          label: String(s.label).slice(0, 60),
          min,
          max,
          step: s.step,
          value: Math.min(max, Math.max(min, value)),
        };
      });
  }
  return mergeSliders(playground, raw as Partial<SliderConfig>[]);
}

export function plannerMode(): 'anthropic' | 'openai' | 'llm' | 'heuristic' {
  const label = plannerLabel();
  if (label === 'heuristic') return 'heuristic';
  return label;
}

async function planChapterLlm(title: string, body: string): Promise<ChapterPlan> {
  if (!resolveLlmProvider()) return planChapterHeuristic(title, body);

  const chapter = summarize(`${title}\n\n${body}`, 8000);
  const { plan: parsed, provider } = await fetchLlmLabPlan(chapter);

  const fallback = planChapterHeuristic(title, body);
  const playground = PLAYGROUND_IDS.includes(parsed.playground as PlaygroundId)
    ? (parsed.playground as PlaygroundId)
    : fallback.playground;
  const defaults = TEMPLATE_DEFAULTS[playground];

  const callouts: Callout[] =
    parsed.callouts?.filter((c) => c?.label && c?.body).length
      ? parsed.callouts!
          .filter((c) => c?.label && c?.body)
          .slice(0, 5)
          .map((c, i) => ({
            id: String(c.id || CALLOUT_KEYS[playground][i]?.id || `c${i}`),
            label: String(c.label).slice(0, 80),
            body: String(c.body).slice(0, 400),
          }))
      : fallback.callouts;

  const interactionKind = String(
    parsed.interaction_kind || fallback.scene.interactionKind || ''
  )
    .trim()
    .toLowerCase()
    .slice(0, 32);

  const focusHints: Record<string, string> = {};
  if (parsed.focus_hints && typeof parsed.focus_hints === 'object') {
    for (const [k, v] of Object.entries(parsed.focus_hints)) {
      if (k && v) focusHints[String(k).slice(0, 32)] = String(v).slice(0, 160);
    }
  }

  const scene: SceneConfig = {
    hudHint: (parsed.hud_hint || defaults.hudHint).slice(0, 160),
    objectives:
      parsed.objectives?.filter(Boolean).slice(0, 4).map((o) => String(o).slice(0, 200)) ||
      fallback.scene.objectives,
    hotspots:
      parsed.hotspots?.filter((h) => h?.id && h?.label).length
        ? parsed.hotspots!
            .filter((h) => h?.id && h?.label)
            .map((h) => ({ id: String(h.id), label: String(h.label).slice(0, 60) }))
        : playground === 'ai_mesh'
          ? callouts.map((c) => ({ id: c.id, label: c.label }))
          : defaults.hotspots.length
            ? defaults.hotspots
            : fallback.scene.hotspots,
    sliders: normalizeSliders(playground, parsed.sliders),
    quiz:
      parsed.quiz
        ?.filter((q) => q?.q && Array.isArray(q.choices) && q.choices.length >= 2)
        .slice(0, 3)
        .map((q) => ({
          q: String(q.q).slice(0, 200),
          choices: q.choices!.slice(0, 4).map((c) => String(c).slice(0, 120)),
          answer: Math.min(Math.max(0, Number(q.answer) || 0), (q.choices!.length || 1) - 1),
        })) || fallback.scene.quiz,
    planner: 'llm',
    model: `${provider.kind}:${provider.model}`,
    interactionKind: interactionKind || fallback.scene.interactionKind,
    focusHints: Object.keys(focusHints).length ? focusHints : fallback.scene.focusHints,
  };

  return {
    playground,
    title: (parsed.title || fallback.title).slice(0, 120),
    summaryMd: summarize(parsed.summary_md || fallback.summaryMd),
    callouts,
    scene,
    confidence: 0.9,
    rationale: (
      parsed.rationale || `${provider.kind} mapped chapter → ${playground}/${interactionKind || 'template'}`
    ).slice(0, 240),
  };
}

/** Rebuild plan for a teacher-chosen template, keeping chapter-derived text/quiz. */
export function planWithPlayground(
  title: string,
  body: string,
  playground: PlaygroundId,
  planner: 'llm' | 'heuristic' = 'heuristic'
): ChapterPlan {
  const text = body.trim() || title.trim();
  const defaults = TEMPLATE_DEFAULTS[playground];
  const callouts: Callout[] = CALLOUT_KEYS[playground].map((c) => ({
    id: c.id,
    label: c.label,
    body: snippet(text, c.keys, c.label),
  }));
  return {
    playground,
    title: guessTitle(text, title),
    summaryMd: summarize(text),
    callouts,
    scene: {
      hudHint: defaults.hudHint,
      objectives: objectivesFrom(text, playground),
      hotspots: defaults.hotspots.map((h) => {
        const c = callouts.find((x) => x.id === h.id);
        return { id: h.id, label: c?.label || h.label };
      }),
      sliders: mergeSliders(playground),
      quiz: quizFrom(text, playground),
      planner,
    },
    confidence: 0.8,
    rationale: `Teacher selected template → ${playground}`,
  };
}

/**
 * Plan a lab from chapter text.
 * Uses Anthropic (ANTHROPIC_API_KEY via Vite proxy) or OpenAI-compatible LLM when configured;
 * otherwise heuristic extraction (always works offline).
 */
export async function planChapter(title: string, body: string): Promise<ChapterPlan> {
  const text = body.trim();
  const t = title.trim();
  if (!text && !t) throw new Error('Upload a chapter PDF or paste lesson text before proposing.');

  if (!resolveLlmProvider()) return planChapterHeuristic(t, text);

  try {
    return await planChapterLlm(t, text);
  } catch (err) {
    const h = planChapterHeuristic(t, text);
    h.rationale = `LLM failed (${err instanceof Error ? err.message : 'error'}); used heuristic. ${h.rationale}`;
    h.scene.planner = 'heuristic';
    h.confidence = Math.min(h.confidence, 0.55);
    return h;
  }
}
