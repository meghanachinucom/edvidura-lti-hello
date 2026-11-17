/**
 * Optional LLM chapter → lab planner.
 * Prefers Anthropic via Vite proxy (ANTHROPIC_API_KEY), then OpenAI-compatible chat.
 * Demo only — production EdVidura keeps keys on the server.
 */

export type LlmProvider = {
  kind: 'anthropic' | 'openai';
  key: string;
  model: string;
  base?: string;
  /** Browser calls local Vite proxy instead of api.anthropic.com (avoids CORS). */
  viaProxy?: boolean;
};

export type LlmPlanJson = {
  playground?: string;
  interaction_kind?: string;
  title?: string;
  summary_md?: string;
  objectives?: string[];
  callouts?: { id?: string; label?: string; body?: string }[];
  hotspots?: { id?: string; label?: string }[];
  sliders?: { id?: string; label?: string; min?: number; max?: number; step?: number; value?: number }[];
  focus_hints?: Record<string, string>;
  hud_hint?: string;
  quiz?: { q?: string; choices?: string[]; answer?: number }[];
  rationale?: string;
};

declare const __EDV_ANTHROPIC_PROXY__: string | undefined;

export function resolveLlmProvider(): LlmProvider | null {
  const hasProxy = String(typeof __EDV_ANTHROPIC_PROXY__ !== 'undefined' ? __EDV_ANTHROPIC_PROXY__ : '') === '1';
  // Never call api.anthropic.com from the browser — always use the Vite proxy when available.
  if (hasProxy) {
    return {
      kind: 'anthropic',
      key: 'proxy',
      viaProxy: true,
      model: (
        (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) ||
        'claude-haiku-4-5-20251001'
      ).trim(),
    };
  }
  const openai = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  const base = (
    (import.meta.env.VITE_LLM_BASE_URL as string | undefined) ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '');
  const hasLocal = Boolean((import.meta.env.VITE_LLM_BASE_URL as string | undefined)?.trim());
  if (!openai && !hasLocal) return null;
  return {
    kind: 'openai',
    key: openai || 'local',
    base,
    model: ((import.meta.env.VITE_LLM_MODEL as string | undefined) || 'gpt-4o-mini').trim(),
  };
}

export function plannerLabel(): 'anthropic' | 'openai' | 'heuristic' {
  const p = resolveLlmProvider();
  if (!p) return 'heuristic';
  return p.kind === 'anthropic' ? 'anthropic' : 'openai';
}

function extractJson(raw: string): LlmPlanJson {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('LLM returned no JSON object');
  return JSON.parse(body.slice(start, end + 1)) as LlmPlanJson;
}

const SYSTEM = `You are an Indian school science/math interactive-lab planner for EdVidura.
Teachers type a short title or paste a chapter. You design a classroom lab students can manipulate.

Return ONLY a JSON object (no markdown) with:
- playground: one of forces, cell_tour, circuit, fraction_bar, photosynthesis, water_cycle, digestive, light_mirror, ai_mesh
- interaction_kind: for ai_mesh use one of volcano, cyclone, chem, solar, heart, custom (pick the closest classroom model)
- title: short lesson title
- summary_md: student-facing markdown from the chapter (do not invent curriculum facts)
- objectives: 2-4 short learning goals
- callouts: exactly 3 items {id,label,body} — ids must match hotspots; body = short NCERT-friendly explanation
- hotspots: 3 items {id,label} matching callout ids (the interactive parts)
- sliders: 1-2 items {id,label,min,max,value} that meaningfully change the lab
  examples: cyclone → ocean_temp + wind + landfall; chem → temp + progress; volcano → heat + erupt
- focus_hints: object map of hotspot id → one-line student readout when that part is focused
- hud_hint: short tip telling the student what to try first
- quiz: up to 2 items {q, choices[3], answer index}
- rationale: why this playground / interaction_kind

Rules:
- Prefer a fixed playground when the chapter clearly matches it (water cycle, cell, circuit, …).
- For cyclones/hurricanes: playground ai_mesh, interaction_kind cyclone. Callouts MUST cover form (warm ocean), strengthen (eyewall/winds), and landfall (hits coast, weakens but rain remains). Sliders: ocean_temp, wind, landfall.
- For chemical reactions, volcanoes, and other new topics → playground "ai_mesh" with the right interaction_kind.
- Never map cyclones to water_cycle. Never map chemical reactions to circuit/forces.
- Keep language simple for Class 6–10. Do not invent a brand-new 3D engine type beyond interaction_kind.`;

export async function fetchLlmLabPlan(chapter: string): Promise<{
  plan: LlmPlanJson;
  provider: LlmProvider;
}> {
  const provider = resolveLlmProvider();
  if (!provider) throw new Error('No LLM key configured');

  if (provider.kind === 'anthropic') {
    // Always go through Vite proxy — never call api.anthropic.com from the browser.
    const res = await fetch('/anthropic-api/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 2200,
        temperature: 0.2,
        system: SYSTEM,
        messages: [{ role: 'user', content: chapter }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 220)}`);
    }
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text || '').join('\n')
      : String(data.content?.[0]?.text || '');
    return { plan: extractJson(text), provider };
  }

  const res = await fetch(`${provider.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: chapter },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 220)}`);
  }
  const data = await res.json();
  const raw = String(data.choices?.[0]?.message?.content || '{}');
  return { plan: extractJson(raw), provider };
}
