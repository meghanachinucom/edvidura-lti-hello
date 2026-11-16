import { planChapter, planWithPlayground } from './chapterPlanner';
import { buildClassroomPrompt, startMeshJob } from './meshGen';
import { autofillFromShortTitle } from './topicAutofill';
import type { LabPack, PlaygroundId } from './types';

/** Expand a short topic / title into enough chapter text for the planner. */
export function expandTopicText(title: string, body: string): {
  title: string;
  body: string;
  autofilled: boolean;
} {
  return autofillFromShortTitle(title, body);
}

/** NCERT-flavoured samples — demo only; real path is PDF → planner. */
export const SAMPLES: Record<PlaygroundId, { title: string; body: string }> = {
  forces: {
    title: 'Force and laws of motion',
    body: `## Force and motion (Class 9)

A force can change the speed or direction of an object. For the same mass, a larger force produces a larger acceleration.

Newton's second law: F = m × a.

Push the crate. Change mass and force. Notice how acceleration changes when friction is small.`,
  },
  cell_tour: {
    title: 'The fundamental unit of life',
    body: `## Cell structure (Class 9)

The cell is the basic unit of life. The nucleus controls the cell. Mitochondria release energy. The plasma membrane controls what enters and leaves.

Tour the cell model. Match each part with your NCERT diagram.`,
  },
  circuit: {
    title: 'Electric current and its effects',
    body: `## Circuit (Class 7 / 10)

Current flows only in a closed path. Battery → bulb → switch → back to battery.

Close the switch to complete the circuit. Open it and the bulb goes off.`,
  },
  fraction_bar: {
    title: 'Fractions — parts of a whole',
    body: `## Fractions (Class 6)

A fraction shows equal parts of a whole. In ¾, the denominator 4 means four equal parts; the numerator 3 means three parts are taken.`,
  },
  photosynthesis: {
    title: 'Nutrition in plants — photosynthesis',
    body: `## Photosynthesis (Class 7)

Green plants make food using sunlight, carbon dioxide, and water. Chlorophyll in leaves helps capture light. Oxygen is released.`,
  },
  water_cycle: {
    title: 'Water cycle and our rains',
    body: `## Water cycle (Class 6–7)

Water evaporates from the sea, rises as vapour, cools into clouds, and returns as rain — the pattern behind India’s monsoon and crops.`,
  },
  digestive: {
    title: 'Nutrition in animals — digestion',
    body: `## Human digestive system (Class 7)

Food passes mouth → food pipe (oesophagus) → stomach → small intestine → large intestine.`,
  },
  light_mirror: {
    title: 'Light — reflection at a plane mirror',
    body: `## Reflection of light (Class 8 / 10)

On a plane mirror, angle of incidence equals angle of reflection (i = r). The normal is perpendicular to the mirror.`,
  },
  ai_mesh: {
    title: 'Volcanoes',
    body: `## Volcanoes

A volcano is an opening in the Earth’s crust. Magma rises from a magma chamber through a vent. During an eruption, lava, ash, and gases come out of the crater.`,
  },
};

export type ProposeOpts = {
  forcePlayground?: PlaygroundId;
  sourceName?: string;
  pageCount?: number;
};

export async function proposeFromChapter(
  title: string,
  bodyMd: string,
  opts: ProposeOpts = {}
): Promise<Omit<LabPack, 'id' | 'updatedAt' | 'status'>> {
  const expanded = expandTopicText(title, bodyMd);
  const plan = opts.forcePlayground
    ? planWithPlayground(expanded.title, expanded.body, opts.forcePlayground)
    : await planChapter(expanded.title, expanded.body);

  // New topics (volcanoes, etc.) get an interactive mesh draft immediately
  if (plan.playground === 'ai_mesh' && !plan.scene.mesh) {
    const prompt = buildClassroomPrompt(plan.title, plan.summaryMd);
    const job = await startMeshJob(prompt);
    plan.scene = {
      ...plan.scene,
      mesh: { ...job, approved: false },
      hudHint: plan.scene.hudHint || `Explore the 3D model for “${plan.title}”`,
    };
  }

  const fromPdf = Boolean(opts.sourceName);
  const engine = plan.scene.planner === 'llm' ? `LLM (${plan.scene.model || 'chat'})` : 'heuristic planner';

  return {
    title: plan.title.slice(0, 120),
    bodyMd: plan.summaryMd.slice(0, 12000),
    playground: plan.playground,
    callouts: plan.callouts,
    scene: plan.scene,
    note: fromPdf
      ? `Built from PDF “${opts.sourceName}” (${opts.pageCount ?? '?'} pp) via ${engine} → ${plan.playground} (${Math.round(plan.confidence * 100)}%). ${plan.rationale}`
      : `Built from chapter via ${engine} → ${plan.playground} (${Math.round(plan.confidence * 100)}%). ${plan.rationale}`,
  };
}

export function sampleBody(playground: PlaygroundId): { title: string; body: string } {
  return SAMPLES[playground];
}

export function newDraftId(): string {
  return `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const ALL_PLAYGROUNDS = Object.keys(SAMPLES) as PlaygroundId[];
