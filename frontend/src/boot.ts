/**
 * Hydrate SPA state from /api/v1/app after /dev/client-launch?spa=1 (or LTI token).
 */
import {
  AppApiError,
  askCoach,
  captureTokenFromUrl,
  completeLesson,
  getAttempts,
  getAnalytics,
  getHome,
  getLesson,
  getManual,
  getManualDiscussions,
  getManuals,
  getPlan,
  recordManualPageTime,
  getPravachana,
  getPravachanas,
  getPravachanaStats,
  getQuiz,
  getGroups,
  getAssignments,
  getTestBank,
  getToken,
  postManualDiscussion,
  postPravachanaNote,
  postPravachanaProgress,
  submitQuiz,
  type LiveAttempt,
  type LiveSession,
} from './api';
import { notify, setScreen, showToast, state, type StudentRow, type UserRole } from './state';
import { getLocale, localizeText, setLocale } from './i18n';

export function isGovernment(): boolean {
  const seg = String(state.liveSession?.segment || '');
  return seg === 'government' || Boolean(state.liveSession?.is_government);
}

export function applySession(session: LiveSession): void {
  state.connected = true;
  state.apiError = null;
  state.liveSession = session as unknown as Record<string, unknown>;
  state.learnerName = session.learner_name || session.given_name || 'Learner';
  state.classLabel = isGovernmentSession(session)
    ? session.tenant_name || 'AP Pravachanalu'
    : session.class_name || session.course || session.tenant_slug || 'EdVidura';
  if (session.is_school_admin) state.role = 'admin';
  else if (session.is_instructor) state.role = 'teacher';
  else state.role = 'student';
  if (isGovernmentSession(session)) {
    try {
      if (!sessionStorage.getItem('edvidura_locale_user')) {
        setLocale(session.preferred_language || 'te-IN');
      }
    } catch {
      setLocale(session.preferred_language || 'te-IN');
    }
    state.screen =
      state.role === 'student' ? 'pravachana-home' : 'pravachana-dept';
  } else if (state.role === 'teacher') state.screen = 'teacher-results';
  else if (state.role === 'admin') state.screen = 'admin-overview';
  else state.screen = 'student-home';
}

function isGovernmentSession(session: LiveSession): boolean {
  return session.segment === 'government' || Boolean(session.is_government);
}

function attemptsToRows(attempts: LiveAttempt[]): StudentRow[] {
  return attempts.map(a => ({
    id: a.id,
    name: a.learner_name,
    email: a.subject,
    initials: a.initials || '?',
    attempts: 1,
    scorePercent: a.score_percent,
    scorePoints: a.max_score ? `${a.score}/${a.max_score}` : '—',
    status:
      a.status === 'needs-review'
        ? 'needs-review'
        : a.status === 'synced'
        ? 'synced'
        : a.status === 'pending'
        ? 'pending'
        : 'queued',
    syncTime: a.created_at ? String(a.created_at).slice(0, 16).replace('T', ' ') : a.status,
  }));
}

export async function hydrateFromApi(): Promise<boolean> {
  captureTokenFromUrl();
  if (!getToken()) {
    state.connected = false;
    return false;
  }
  try {
    const home = await getHome();
    applySession(home.session);
    state.liveLessons = home.lessons || [];
    state.liveProgress = home.progress || null;
    state.liveCourseTitle = home.course?.title || home.session.course || '';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load session';
    state.apiError = message;
    state.connected = false;
    showToast(message, 'error');
    return false;
  }

  const extras: Promise<void>[] = [];

  if (isGovernment()) {
    extras.push(loadPravachanaCatalog().catch(() => undefined));
    if (state.role !== 'student') {
      extras.push(
        getPravachanaStats()
          .then(pack => {
            state.livePravachanaStats = pack;
          })
          .catch(() => {
            state.livePravachanaStats = null;
          })
      );
    }
    await Promise.all(extras);
    notify();
    return true;
  }

  extras.push(
    getManuals()
      .then(pack => {
        state.liveManuals = pack.manuals || [];
      })
      .catch(() => {
        state.liveManuals = [];
      })
  );
  state.discussions = [];

  if (state.role === 'teacher' || state.role === 'admin') {
    extras.push(
      getAttempts()
        .then(pack => {
          state.liveAttempts = attemptsToRows(pack.attempts || []);
        })
        .catch(() => {
          state.liveAttempts = [];
        })
    );
    extras.push(
      getAnalytics()
        .then(pack => {
          state.liveAnalytics = pack;
        })
        .catch(() => {
          state.liveAnalytics = null;
        })
    );
    extras.push(
      getTestBank()
        .then(pack => {
          state.liveBankItems = pack.items || [];
          state.liveBankCount = pack.live_count || 0;
        })
        .catch(() => {
          state.liveBankItems = [];
          state.liveBankCount = 0;
        })
    );
    extras.push(
      getGroups()
        .then(pack => {
          state.liveGroups = pack.groups || [];
          state.liveGroupAssignments = pack.assignments || [];
          state.gsAvailable = Boolean(pack.gs_available);
        })
        .catch(() => {
          state.liveGroups = [];
          state.liveGroupAssignments = [];
          state.gsAvailable = false;
        })
    );
    extras.push(
      getAssignments()
        .then(pack => {
          state.liveAssignmentDash = pack;
        })
        .catch(() => {
          state.liveAssignmentDash = null;
        })
    );
  } else {
    extras.push(
      getAttempts()
        .then(pack => {
          const last = (pack.attempts || [])[0];
          if (last && last.max_score) {
            state.quizScore = {
              correct: last.score,
              total: last.max_score,
              percent: last.score_percent ?? 0,
            };
          }
          if (pack.quota) state.liveQuizQuota = pack.quota;
        })
        .catch(() => undefined)
    );
    extras.push(
      getAssignments()
        .then(pack => {
          state.liveAssignmentDash = pack;
        })
        .catch(() => {
          state.liveAssignmentDash = null;
        })
    );
  }

  extras.push(
    loadQuizBank().catch(() => undefined)
  );

  extras.push(
    getPlan()
      .then(pack => {
        state.livePlan = pack;
      })
      .catch(() => {
        state.livePlan = null;
      })
  );

  await Promise.all(extras);
  notify();
  return true;
}

export async function loadQuizBank(): Promise<void> {
  const tryLoad = async (practice: boolean) => {
    const pack = await getQuiz(practice);
    state.liveQuizPractice = pack.practice;
    state.liveQuizQuota = pack.quota || state.liveQuizQuota;
    state.liveQuizAssignment = pack.group_assignment || null;
    state.liveQuizCanSubmit = pack.can_submit !== false;
    state.liveQuizBlocked = '';
    state.liveQuizQuestions = (pack.questions || []).map((q, i) => {
      const type = mapLiveQtype(q.qtype);
      return {
        id: q.id,
        num: String(i + 1).padStart(2, '0'),
        type,
        title: `Question ${i + 1}`,
        pts: '1 point',
        question: escapeHtml(q.prompt),
        placeholder: type === 'fill-blank' ? (q.qtype === 'numeric' ? 'Number' : 'Type answer here…') : undefined,
        choices: (q.choices || []).map((text, idx) => ({
          key: String(idx),
          text,
        })),
      };
    });
    state.quizAnswers = {};
    state.quizSubmitted = false;
  };
  try {
    await tryLoad(false);
  } catch (err) {
    if (err instanceof AppApiError && err.code === 'not_assigned') {
      state.liveQuizBlocked = err.message;
      state.liveQuizQuestions = [];
      state.liveQuizCanSubmit = false;
      return;
    }
    if (err instanceof AppApiError && (err.code === 'ghost_coach_gate' || err.status === 403)) {
      try {
        await tryLoad(true);
        return;
      } catch {
        state.liveQuizQuestions = [];
      }
    }
  }
}

export async function submitLiveQuiz(): Promise<boolean> {
  if (!state.connected || !state.liveQuizQuestions.length) return false;
  const answers: Record<string, string> = { ...state.quizAnswers };
  const result = await submitQuiz(answers, state.liveQuizPractice);
  const total = result.max_score || state.liveQuizQuestions.length || 1;
  state.quizScore = {
    correct: result.score,
    total,
    percent: Math.round((100 * result.score) / total),
  };
  state.quizSubmitted = true;
  state.quizReview = result.detail || {};
  return true;
}

export async function openLiveLesson(id: string): Promise<void> {
  state.activeLessonId = id;
  try {
    const pack = await getLesson(id);
    state.liveLessonDetail = pack.lesson;
    setScreen('lesson-detail');
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Lesson unavailable', 'error');
  }
}

export async function markLiveLessonComplete(): Promise<void> {
  const id = state.activeLessonId || state.liveLessonDetail?.id;
  if (!id) return;
  try {
    const pack = await completeLesson(id);
    if (pack.progress) {
      state.liveProgress = pack.progress;
      state.liveLessons = pack.progress.lessons || state.liveLessons;
    }
    if (state.liveLessonDetail) state.liveLessonDetail.completed = true;
    if (pack.progress?.all_lessons_done) {
      await loadQuizBank().catch(() => undefined);
    }
    showToast('Lesson marked complete', 'check_circle');
    notify();
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Could not save progress', 'error');
  }
}

function mapLiveQtype(qtype?: string): import('./views/quiz').QuestionType {
  const raw = (qtype || 'single').toLowerCase().replace(/-/g, '_');
  if (raw === 'true_false') return 'true-false';
  if (raw === 'short' || raw === 'numeric' || raw === 'fill_blank') return 'fill-blank';
  if (raw === 'essay') return 'essay';
  if (raw === 'multi') return 'multi';
  return 'multiple-choice';
}

let chapterOpenedAt = Date.now();
let lastChapterSlug = '';

function chapterSlugForManual(): string {
  const toc = state.liveManualDetail?.toc || [];
  const active = String(state.manualActiveChapterId || '').trim();
  if (active && toc.some(t => t.slug === active)) return active;
  const fromToc = String(toc[0]?.slug || '').trim();
  return fromToc || 'chapter';
}

export async function noteManualChapterTime(nextSlug?: string): Promise<void> {
  const id = state.activeManualId || state.liveManualDetail?.id;
  const slug = lastChapterSlug || chapterSlugForManual();
  const seconds = Math.max(0, Math.round((Date.now() - chapterOpenedAt) / 1000));
  chapterOpenedAt = Date.now();
  if (nextSlug) lastChapterSlug = nextSlug;
  if (!id || seconds < 2) return;
  try {
    await recordManualPageTime(id, {
      chapter_slug: slug,
      page_label: slug,
      seconds,
    });
  } catch {
    /* stay on the reader even if telemetry fails */
  }
}

export async function loadLiveDiscussions(): Promise<void> {
  const id = state.activeManualId || state.liveManualDetail?.id;
  if (!id) {
    state.discussions = [];
    return;
  }
  const pack = await getManualDiscussions(id, chapterSlugForManual());
  state.discussions = (pack.messages || []).map(m => ({
    id: m.id,
    author: m.author_name || 'Classmate',
    role: 'student',
    avatarInitials: (m.author_name || '?').slice(0, 2).toUpperCase(),
    timeAgo: m.created_at ? String(m.created_at).slice(0, 16).replace('T', ' ') : '',
    content: m.body,
  }));
}

export async function postLiveDiscussion(body: string): Promise<void> {
  const id = state.activeManualId || state.liveManualDetail?.id;
  if (!id) throw new Error('Open a handbook first');
  const slug = chapterSlugForManual();
  const title = String(state.liveManualDetail?.toc?.[0]?.title || slug);
  await postManualDiscussion(id, {
    chapter_slug: slug,
    chapter_title: title,
    body,
  });
  await loadLiveDiscussions();
}

export async function openLiveManual(id: string): Promise<void> {
  state.activeManualId = id;
  try {
    const pack = await getManual(id);
    state.liveManualDetail = {
      id: pack.manual.id,
      title: pack.manual.title,
      body_html: pack.body_html || '',
      toc: pack.toc || [],
    };
    await loadLiveDiscussions().catch(() => {
      state.discussions = [];
    });
    lastChapterSlug = chapterSlugForManual();
    chapterOpenedAt = Date.now();
    setScreen('manual-reader');
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Manual unavailable', 'error');
  }
}

export async function loadPravachanaCatalog(): Promise<void> {
  const pack = state.pravachanaPack === 'all' ? '' : state.pravachanaPack;
  const data = await getPravachanas(state.pravachanaQuery, pack);
  state.livePravachanas = {
    featured: data.featured,
    series: data.series || [],
    episodes: data.episodes || [],
    mine: data.mine || null,
  };
}

export async function openPravachana(id: string): Promise<void> {
  try {
    const pack = await getPravachana(id);
    state.livePravachanaDetail = pack.episode;
    state.livePravachanaNotes = pack.notes || [];
    state.pravachanaTheatre = false;
    setScreen('pravachana-player');
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Episode unavailable', 'error');
  }
}

export async function savePravachanaProgress(
  positionSec: number,
  durationSec: number,
  completed = false
): Promise<void> {
  const id = state.livePravachanaDetail?.id;
  if (!id) return;
  try {
    await postPravachanaProgress(id, {
      position_sec: Math.floor(positionSec),
      duration_sec: Math.floor(durationSec),
      completed,
    });
  } catch {
    /* keep watching */
  }
}

export async function addPravachanaNote(body: string): Promise<void> {
  const id = state.livePravachanaDetail?.id;
  if (!id) return;
  const row = await postPravachanaNote(id, body);
  state.livePravachanaNotes = [row, ...state.livePravachanaNotes];
  notify();
}

export async function sendCoachQuestion(question: string): Promise<{
  text: string;
  citations: { label: string; ref: string }[];
  isRefusal: boolean;
  refusalTitle?: string;
  refusalExplanation?: string;
}> {
  const data = await askCoach(question, getLocale());
  const citations = (data.citations || []).map(c => ({
    label: c.title || 'Source',
    ref: c.excerpt || '',
  }));
  const blocked = Boolean(data.integrity_blocked || data.refusal_reason);
  return {
    text: data.answer || '',
    citations,
    isRefusal: blocked,
    refusalTitle: blocked ? 'Syllabus guard' : undefined,
    refusalExplanation: data.refusal_reason || undefined,
  };
}

export function roleFromSession(): UserRole {
  return state.role;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function displayName(): string {
  const raw = state.learnerName
    ? state.learnerName
    : state.role === 'teacher'
      ? 'Dr. Padmavathi Rao'
      : state.role === 'admin'
        ? 'Sri Ramesh Naidu'
        : 'Lakshmi Reddy';
  return localizeText(raw);
}

export function firstName(): string {
  return displayName().split(/\s+/)[0] || displayName();
}

export function classLabel(): string {
  return localizeText(state.classLabel || 'ZPHS Vijayawada · Class 8 Mathematics');
}
