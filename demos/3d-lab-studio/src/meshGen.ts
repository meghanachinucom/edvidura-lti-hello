/** Demo-local Meshy client or stub (no EdVidura backend required). */

export type MeshJob = {
  provider: string;
  task_id: string;
  status: string;
  prompt: string;
  approved: boolean;
  glb_url: string;
  thumbnail_url: string;
  note?: string;
  mode?: string;
};

function meshyKey(): string {
  return (import.meta.env.VITE_MESHY_API_KEY as string | undefined)?.trim() || '';
}

export function buildClassroomPrompt(title: string, excerpt: string): string {
  const topic = (title || 'school science model').slice(0, 120);
  const clean = excerpt.replace(/\s+/g, ' ').trim().slice(0, 280);
  return (
    `Low-poly educational 3D model for Indian school classroom: ${topic}. ` +
    `Simple, clear silhouette, child-safe, no text labels on mesh. Context: ${clean || topic}`
  ).slice(0, 800);
}

export async function startMeshJob(prompt: string): Promise<MeshJob> {
  const key = meshyKey();
  if (!key) {
    return {
      provider: 'stub',
      task_id: 'stub-local',
      status: 'SUCCEEDED',
      prompt,
      approved: false,
      glb_url: '',
      thumbnail_url: '',
      mode: 'stub',
      note: 'No VITE_MESHY_API_KEY — local placeholder. Set key for real Meshy GLB.',
    };
  }
  const res = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      ai_model: 'latest',
      target_formats: ['glb'],
    }),
  });
  if (!res.ok) throw new Error(`Meshy ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  const taskId = String(body.result || body.id || '');
  if (!taskId) throw new Error('Meshy did not return a task id');
  return {
    provider: 'meshy',
    task_id: taskId,
    status: 'PENDING',
    prompt,
    approved: false,
    glb_url: '',
    thumbnail_url: '',
    mode: 'preview',
  };
}

export async function pollMeshJob(job: MeshJob): Promise<MeshJob> {
  if (job.provider === 'stub') return { ...job, status: 'SUCCEEDED' };
  const key = meshyKey();
  if (!key) return job;
  const res = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${job.task_id}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Meshy poll ${res.status}`);
  const body = await res.json();
  const urls = body.model_urls || {};
  return {
    ...job,
    status: String(body.status || job.status),
    glb_url: String(urls.glb || job.glb_url || ''),
    thumbnail_url: String(body.thumbnail_url || job.thumbnail_url || ''),
  };
}
