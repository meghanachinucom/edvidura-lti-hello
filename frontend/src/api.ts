/**
 * EdVidura App API client — same envelope as docs/MOBILE_API.md.
 * Vite proxies /api and /dev to FastAPI (:8000) in local development.
 */

const TOKEN_KEY = 'edvidura_token';

export type AppEnvelope<T> = {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: Record<string, unknown>;
};

export class AppApiError extends Error {
  code: string;
  status: number;
  details: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AppApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function captureTokenFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = (params.get('token') || '').trim();
  if (fromQuery) {
    sessionStorage.setItem(TOKEN_KEY, fromQuery);
    params.delete('token');
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);
    return fromQuery;
  }
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function getToken(): string {
  return sessionStorage.getItem(TOKEN_KEY) || '';
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  let body: AppEnvelope<T> | null = null;
  try {
    body = (await response.json()) as AppEnvelope<T>;
  } catch {
    throw new AppApiError(
      `API ${path} returned ${response.status}`,
      'http_error',
      response.status
    );
  }
  if (!body || !body.ok) {
    const err = body?.error;
    throw new AppApiError(
      err?.message || `API ${path} failed`,
      err?.code || 'error',
      response.status,
      err && 'details' in err ? err.details : undefined
    );
  }
  return body.data as T;
}

export type LiveSession = {
  token: string;
  tenant_id: string;
  subject: string;
  learner_name: string;
  given_name?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  course?: string | null;
  course_id?: string | null;
  tenant_slug?: string | null;
  is_instructor: boolean;
  is_school_admin: boolean;
  lms_name: string;
  lms_return_url?: string | null;
  segment: string;
  is_corporate: boolean;
  is_government?: boolean;
  capabilities: Record<string, boolean>;
  tenant_name?: string | null;
  preferred_language?: string | null;
  preferred_state?: string | null;
};

export type PravachanaProgress = {
  position_sec: number;
  duration_sec: number;
  completed: boolean;
  play_count?: number;
};

export type PravachanaEpisode = {
  id: string;
  series_id?: string;
  slug: string;
  position: number;
  title_te: string;
  title_en: string;
  duration_sec: number;
  stream_url: string;
  source: string;
  language: string;
  pack: string;
  featured: boolean;
  cover_url: string;
  demo: boolean;
  progress?: PravachanaProgress | null;
  series_title_te?: string;
  series_title_en?: string;
  series_slug?: string;
  scripture?: string;
  transcript_sa?: string;
  transcript_te?: string;
  meaning_en?: string;
  prev?: { id: string; title_te: string; title_en: string } | null;
  next?: { id: string; title_te: string; title_en: string } | null;
};

export type PravachanaSeries = {
  id: string;
  slug: string;
  title_te: string;
  title_en: string;
  description_te: string;
  description_en: string;
  scripture: string;
  cover_url: string;
  episode_count: number;
  episodes: PravachanaEpisode[];
};

export type PravachanaNote = {
  id: string;
  author_subject: string;
  author_name: string;
  body: string;
  created_at?: string;
};

export type LiveLesson = {
  id: string;
  slug: string;
  title: string;
  position: number;
  lesson_type: string;
  status: string;
  completed: boolean;
  video_url?: string | null;
  body_html?: string;
  body_md?: string;
};

export type LiveProgress = {
  percent: number;
  completed_count: number;
  total_count: number;
  all_lessons_done: boolean;
  completed_ids: string[];
  lessons: LiveLesson[];
  next_lesson: LiveLesson | null;
  course?: { id: string; slug: string; title: string } | null;
};

export type LiveManual = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status?: string;
};

export type LiveAttempt = {
  id: string;
  subject: string;
  learner_name: string;
  initials: string;
  course_label: string;
  score: number;
  max_score: number;
  score_percent: number | null;
  grade_sent: boolean;
  grade_error: string | null;
  status: string;
  created_at: string | null;
};

export type LiveQuizQuestion = {
  id: string;
  prompt: string;
  qtype?: string;
  choices: string[];
  topic?: string;
};

export function getSession() {
  return api<LiveSession>('/api/v1/app/session');
}

export function getHome() {
  return api<{
    session: LiveSession;
    course: { id: string; slug: string; title: string } | null;
    progress: LiveProgress;
    lessons: LiveLesson[];
  }>('/api/v1/app/home');
}

export function getLessons() {
  return api<{ course: LiveProgress['course']; lessons: LiveLesson[] }>(
    '/api/v1/app/lessons'
  );
}

export function getLesson(id: string) {
  return api<{
    lesson: LiveLesson;
    prev: LiveLesson | null;
    next: LiveLesson | null;
  }>(`/api/v1/app/lessons/${id}`);
}

export function completeLesson(id: string) {
  return api<{ completed: boolean; progress: LiveProgress }>(
    `/api/v1/app/lessons/${id}/complete`,
    { method: 'POST' }
  );
}

export function getProgress() {
  return api<LiveProgress>('/api/v1/app/progress');
}

export function getManuals() {
  return api<{ manuals: LiveManual[] }>('/api/v1/app/manuals');
}

export function getManual(id: string) {
  return api<{
    manual: LiveManual;
    version: { version: number; is_published: boolean; changelog: string };
    toc: { id?: string; title?: string; slug?: string }[];
    body_html: string;
    pebl_counts: Record<string, number>;
  }>(`/api/v1/app/manuals/${id}`);
}

export function getQuiz(practice = false) {
  const q = practice ? '?practice=true' : '';
  return api<{
    practice: boolean;
    questions: LiveQuizQuestion[];
    count: number;
    quota?: { used: number; limit: number; remaining: number; allowed: boolean };
    group_assignment?: { group_id?: string; group_name?: string; title?: string } | null;
    assigned?: boolean;
    can_submit?: boolean;
  }>(`/api/v1/app/quiz${q}`);
}

export function generateTestBank(body: {
  count?: number;
  lesson_id?: string;
  title?: string;
  difficulty?: string;
  complexity?: string;
}) {
  return api<{
    questions: Array<{
      prompt: string;
      choices: string[];
      correct_index: number;
      qtype?: string;
      topic?: string;
      review_status?: string;
    }>;
    bank_size: number;
    review_required: boolean;
    batch?: { id: string; item_count: number } | null;
    items?: Array<{ id: string; prompt: string; qtype?: string; topic?: string }>;
  }>('/api/v1/app/quiz/bank/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getTestBank(batchId = '', status = '') {
  const params = new URLSearchParams();
  if (batchId) params.set('batch_id', batchId);
  if (status) params.set('status', status);
  const qs = params.toString();
  return api<{
    items: Array<{
      id: string;
      prompt: string;
      choices: string[];
      qtype?: string;
      topic?: string;
      status?: string;
    }>;
    live: Array<{ id: string; prompt: string; qtype?: string }>;
    live_count: number;
  }>(`/api/v1/app/quiz/bank${qs ? `?${qs}` : ''}`);
}

export type CatCompetency = {
  id?: string;
  to_code?: string;
  to_label?: string;
  skill_code?: string;
  label: string;
  skill_id?: string;
  confidence?: number;
  matched?: boolean;
  status?: string;
  percent?: number | null;
  samples?: number;
  correct?: number;
  total?: number;
};

export type LiveCat = {
  skills: Array<{ skill_code: string; label: string; question_keys?: string[] }>;
  class_map: CatCompetency[];
  profile: CatCompetency[];
  proposals: Array<{
    id: string;
    to_code: string;
    to_label: string;
    skill_code: string;
    confidence: number;
    status: string;
  }>;
};

export function mapCatDocument(body: {
  text?: string;
  filename?: string;
  title?: string;
  base64?: string;
  persist?: boolean;
}) {
  return api<{
    competencies: CatCompetency[];
    mapped_count: number;
    source_filename?: string;
    page_count?: number | null;
  }>('/api/v1/app/cat/map', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generateCatBank(body: {
  text?: string;
  filename?: string;
  title?: string;
  base64?: string;
  count?: number;
  persist?: boolean;
}) {
  return api<{
    questions: Array<{
      prompt: string;
      choices: string[];
      skill_code?: string;
      topic?: string;
      qtype?: string;
    }>;
    bank_size: number;
    mapped_count: number;
    competencies: CatCompetency[];
    batch?: { id: string; item_count: number } | null;
    items?: Array<{ id: string; prompt: string; qtype?: string; topic?: string }>;
  }>('/api/v1/app/cat/bank', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getCatOverview() {
  return api<LiveCat>('/api/v1/app/cat');
}

export function reviewCatProposal(id: string, action: 'approve' | 'reject') {
  return api<{ id: string; status: string }>(
    `/api/v1/app/cat/proposals/${encodeURIComponent(id)}/${action}`,
    { method: 'POST', body: JSON.stringify({}) }
  );
}

export function reviewTestBank(body: {
  batch_id?: string;
  item_ids: string[];
  status: string;
  promote?: boolean;
}) {
  return api<{ updated: number; promoted?: { saved: number } | null }>(
    '/api/v1/app/quiz/bank/review',
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export function exportAssessment(format: 'md' | 'pdf', answers = false) {
  const qs = new URLSearchParams({ format, answers: answers ? 'true' : 'false' });
  return api<{
    format: string;
    filename: string;
    body?: string;
    base64?: string;
    content_type?: string;
  }>(`/api/v1/app/quiz/export?${qs}`);
}

export function gradeEssay(body: {
  prompt: string;
  student_answer: string;
  instructor_answer?: string;
  rubric?: string;
  max_score?: number;
}) {
  return api<{
    score: number;
    max_score: number;
    percent: number;
    feedback: string;
    compared_to?: string;
    citations?: { title: string; ref: string }[];
    copy_text?: string;
  }>('/api/v1/app/quiz/essay-grade', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getGroups() {
  return api<{
    groups: Array<{
      id: string;
      group_id: string;
      name: string;
      member_count: number;
      source: string;
      members?: { user_id: string; name: string }[];
    }>;
    assignments: Array<{
      id: string;
      group_id: string;
      group_name: string;
      activity_type: string;
      title: string;
    }>;
    gs_available: boolean;
  }>('/api/v1/app/groups');
}

export function createGroup(name: string, members: { user_id: string; name: string }[] = []) {
  return api<{ group_id: string; name: string }>('/api/v1/app/groups', {
    method: 'POST',
    body: JSON.stringify({ name, members }),
  });
}

export function assignGroup(groupId: string, title = 'Class quiz') {
  return api<{ id: string }>('/api/v1/app/groups/assign', {
    method: 'POST',
    body: JSON.stringify({
      group_id: groupId,
      activity_type: 'quiz',
      activity_id: 'school-quiz',
      title,
    }),
  });
}

export function submitQuiz(answers: Record<string, string>, practice = false) {
  return api<{
    attempt_id: string;
    score: number;
    max_score: number;
    practice: boolean;
    grade_sent: boolean;
    grade_queued: boolean;
    detail: Record<string, { prompt?: string; correct?: boolean; chosen?: number }>;
  }>('/api/v1/app/quiz/submit', {
    method: 'POST',
    body: JSON.stringify({ answers, practice }),
  });
}

export function askCoach(question: string, replyLanguage = 'en-IN') {
  return api<{
    question: string;
    answer: string;
    strategy?: string | null;
    strategy_label?: string | null;
    check_question?: string | null;
    grounded: boolean;
    refusal_reason?: string | null;
    clarify: boolean;
    integrity_blocked: boolean;
    citations: { title: string; excerpt: string }[];
    course_title?: string;
  }>('/api/v1/app/coach', {
    method: 'POST',
    body: JSON.stringify({ question, reply_language: replyLanguage }),
  });
}

export function getAttempts() {
  return api<{
    attempts: LiveAttempt[];
    quota?: { used: number; limit: number; remaining: number; allowed: boolean };
    counters?: { learners?: Array<{ subject?: string; used?: number; remaining?: number }> };
  }>('/api/v1/app/attempts');
}

export function getAssignments() {
  return api<{
    assignments: Array<{
      group_id?: string;
      group_name?: string;
      title?: string;
      activity_type?: string;
    }>;
    learners: Array<{
      subject?: string;
      name?: string;
      quota?: { used?: number; remaining?: number; limit?: number };
      assignments?: Array<{ title?: string; group_name?: string }>;
    }>;
    learner_count?: number;
    group_count?: number;
  }>('/api/v1/app/assignments');
}

export function fetchJsonFile(fileId: string) {
  return api<{
    id: string;
    filename: string;
    kind: string;
    body: unknown;
  }>(`/api/v1/app/files/${encodeURIComponent(fileId)}`);
}

export async function streamFile(fileId: string): Promise<Blob> {
  const token = getToken();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(
    `/api/v1/app/files/${encodeURIComponent(fileId)}/stream`,
    { headers }
  );
  if (!response.ok) {
    throw new AppApiError(
      `Stream ${fileId} failed`,
      'http_error',
      response.status
    );
  }
  return response.blob();
}

export function getFileMeta(fileId: string) {
  return api<{
    id: string;
    filename: string;
    kind: string;
    route: string;
    content_type: string;
    size?: number;
  }>(`/api/v1/app/files/${encodeURIComponent(fileId)}/meta`);
}

export function ingestExternalGrade(body: {
  subject: string;
  score: number;
  max_score?: number;
  learner_name?: string;
}) {
  return api<{ attempt_id: string; score: number; max_score: number }>(
    '/api/v1/app/grades',
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export type LivePlan = {
  active: boolean;
  message?: string;
  progress_pct?: number;
  done_count?: number;
  step_count?: number;
  skills?: { code: string; label: string }[];
  signal_sources?: string[];
  mode?: string | null;
  trend?: string | null;
  risk?: { score?: number; band?: string; reasons?: string[] } | null;
  interventions?: { code?: string; label: string; href?: string }[];
};

export type LiveAnalytics = {
  attempt_count: number;
  learner_count: number;
  avg_percent: number | null;
  pass_count: number;
  fail_count: number;
  xapi_count: number;
  lesson_completions: number;
  lesson_learners: number;
  avg_session_minutes?: number | null;
  xapi_verbs: { verb_id: string; label: string; count: number }[];
  top_learners: { label: string; attempts: number; avg_percent: number }[];
  by_tool?: {
    tool: string;
    attempts: number;
    complete: number;
    ongoing: number;
    incomplete: number;
    last_progress?: string | null;
  }[];
  sessions?: {
    actor_sub: string;
    started_at: string;
    ended_at: string;
    duration_minutes: number;
    event_count: number;
    tools?: string[];
    content?: string;
  }[];
  heatmap?: { days: string[]; hours: string[]; cells: number[][] };
  learner_heatmap?: {
    dates: string[];
    date_labels: string[];
    learners: { id: string; label: string; total: number }[];
    cells: number[][];
    intensity: number[][];
    peak: number;
  };
  time_series?: {
    learners: { id: string; label: string; total: number }[];
    charts: {
      id: string;
      title: string;
      grain: string;
      metric: string;
      unit: string;
      keys: string[];
      labels: string[];
      class_values: Array<number | null>;
      learners: Record<string, Array<number | null>>;
    }[];
  };
};

export function getPlan() {
  return api<LivePlan>('/api/v1/app/plan');
}

export function getAnalytics() {
  return api<LiveAnalytics>('/api/v1/app/analytics');
}

export function getHealth() {
  return api<{ contract?: string; status?: string }>('/api/v1/app/health');
}

export function getMicro() {
  return api<Record<string, unknown>>('/api/v1/app/micro');
}

export function recordMicroViewed(skillId: string, title = 'Micro reel') {
  return api<{ recorded: boolean }>('/api/v1/app/micro/viewed', {
    method: 'POST',
    body: JSON.stringify({ skill_id: skillId, title }),
  });
}

export function recordManualPageTime(
  manualId: string,
  body: { chapter_slug?: string; page_label?: string; seconds: number }
) {
  return api<{ recorded: boolean; page: string; seconds: number }>(
    `/api/v1/app/manuals/${encodeURIComponent(manualId)}/page-time`,
    { method: 'POST', body: JSON.stringify(body) }
  );
}

export function getManualDiscussions(manualId: string, chapter: string) {
  const qs = new URLSearchParams({ chapter });
  return api<{
    chapter_slug: string;
    messages: {
      id: string;
      author_name: string;
      body: string;
      created_at?: string | null;
    }[];
  }>(`/api/v1/app/manuals/${manualId}/discussions?${qs}`);
}

export function postManualDiscussion(
  manualId: string,
  body: { chapter_slug: string; body: string; chapter_title?: string }
) {
  return api<{ message: { id: string; author_name: string; body: string } }>(
    `/api/v1/app/manuals/${manualId}/discussions`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export function getPravachanas(query = '', pack = '') {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (pack) params.set('pack', pack);
  const qs = params.toString();
  return api<{
    featured: PravachanaEpisode | null;
    series: PravachanaSeries[];
    episodes: PravachanaEpisode[];
    count: number;
    mine: {
      completed_count: number;
      total_count: number;
      percent: number;
      recent: Array<{
        episode_id: string;
        title_te: string;
        title_en: string;
        cover_url: string;
        completed: boolean;
        position_sec: number;
        duration_sec: number;
      }>;
    };
  }>(`/api/v1/app/pravachanas${qs ? `?${qs}` : ''}`);
}

export function getPravachana(id: string) {
  return api<{ episode: PravachanaEpisode; notes: PravachanaNote[] }>(
    `/api/v1/app/pravachanas/${id}`
  );
}

export function postPravachanaProgress(
  id: string,
  body: { position_sec: number; duration_sec: number; completed?: boolean }
) {
  return api<PravachanaProgress>(`/api/v1/app/pravachanas/${id}/progress`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function postPravachanaNote(id: string, text: string) {
  return api<PravachanaNote>(`/api/v1/app/pravachanas/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body: text }),
  });
}

export function getPravachanaStats() {
  return api<{
    episodes: number;
    watches: number;
    completed: number;
    viewers: number;
    by_episode: Array<{
      id: string;
      title_te: string;
      title_en: string;
      pack: string;
      featured: boolean;
      plays: number;
      viewers: number;
      completed: number;
    }>;
  }>('/api/v1/app/pravachanas/stats');
}
