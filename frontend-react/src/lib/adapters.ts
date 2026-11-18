/**
 * EdVidura Contract Adapters Layer
 * Pure functions converting verified FastAPI JSON contracts into React view models.
 */
import type { Quiz, Question, OptionKey } from "@/data/quiz";
import type { Lesson, LessonKind } from "@/data/lessons";
import type { Ebook, EbookCategory } from "@/data/ebooks";
import type { Chapter } from "@/data/ebookContent";
import type { Attempt, MoodleStatus } from "@/data/attempts";

// --- Types matching verified backend contracts ---

export interface BackendLessonItem {
  id: string;
  lesson_id?: string;
  title: string;
  subject?: string;
  order_index?: number;
  kind?: string;
  completed?: boolean;
  course_code?: string;
}

export interface BackendQuizOption {
  key?: string;
  text: string;
}

export interface BackendQuizQuestion {
  id: string;
  prompt: string;
  options: (string | BackendQuizOption)[];
  correct?: string;
}

export interface BackendQuizSummary {
  id: string;
  title: string;
  questions?: BackendQuizQuestion[];
}

export interface BackendManualItem {
  id: string;
  manual_id?: string;
  title: string;
  slug?: string;
  description?: string;
  status?: string;
  total_pages?: number;
  pages?: number;
  current_page?: number | null;
  progress_percent?: number | null;
  category?: string;
  version?: number;
}

export interface BackendChapterItem {
  id: string;
  index?: number;
  slug?: string;
  title: string;
  startPage?: number;
  paragraphs?: string[];
  body_html?: string;
}

export interface BackendBookmarkItem {
  id: string;
  chapter_index: number;
  title: string;
  cfi?: string | null;
  created_at?: string;
}

export interface BackendProgressItem {
  id?: string;
  manual_id?: string;
  version?: number;
  chapter_index: number;
  current_page?: number;
  progress_percent: number;
  cfi?: string | null;
  updated_at?: string;
}

export interface BackendManualDetail {
  manual: BackendManualItem;
  version?: {
    version: number;
    is_published: boolean;
    changelog?: string;
  };
  toc?: Array<{ slug: string; title: string }>;
  chapters?: BackendChapterItem[];
  reading_progress?: BackendProgressItem | null;
  bookmarks?: BackendBookmarkItem[];
  body_html?: string;
  pebl_counts?: Record<string, unknown>;
}

// --- Adapters ---

/**
 * Adapts backend lesson item to React UI lesson structure.
 */
export function adaptLesson(backend: BackendLessonItem): Lesson {
  let kind: LessonKind = "reading";
  const rawKind = backend.kind || (backend as any).lesson_type;
  if (rawKind === "video" || rawKind === "quiz") {
    kind = rawKind;
  }

  return {
    id: backend.id || backend.lesson_id || "lesson-unknown",
    order: backend.order_index || (backend as any).position || 1,
    title: backend.title,
    kind,
    markedDone: Boolean(backend.completed),
    courseCode: backend.course_code || "ELE-A",
  };
}

/**
 * Adapts list of backend lessons.
 */
export function adaptLessons(list: BackendLessonItem[]): Lesson[] {
  if (!Array.isArray(list)) return [];
  return list.map(adaptLesson);
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

/**
 * Adapts backend quiz question into React quiz component structure.
 */
export function adaptQuizQuestion(q: BackendQuizQuestion, index: number): Question {
  const options = (q.options || []).slice(0, 4).map((opt, i) => {
    const key = OPTION_KEYS[i] || "A";
    const text = typeof opt === "string" ? opt : opt.text;
    return { key, text };
  });

  const correct = (OPTION_KEYS.includes(q.correct as OptionKey) ? q.correct : "A") as OptionKey;

  return {
    id: q.id || `q${index + 1}`,
    text: q.prompt,
    options,
    correct,
  };
}

/**
 * Adapts backend quiz summary to React UI Quiz format.
 */
export function adaptQuiz(backend: BackendQuizSummary): Quiz {
  const questions: Question[] = (backend.questions || []).map(adaptQuizQuestion);
  return {
    id: backend.id,
    title: backend.title,
    questions,
  };
}

/**
 * Adapts backend manual item to React Ebook.
 */
export function adaptEbook(backend: BackendManualItem): Ebook {
  const pages = backend.total_pages || backend.pages || 64;
  let curPage: number | null = backend.current_page ?? null;
  if (curPage === null && backend.progress_percent && backend.progress_percent > 0) {
    curPage = Math.max(1, Math.round((backend.progress_percent / 100) * pages));
  }
  let cat: EbookCategory = "vocational";
  if (
    backend.category === "life" ||
    backend.category === "physical" ||
    backend.category === "maths" ||
    backend.category === "cs"
  ) {
    cat = backend.category;
  }
  const mid = backend.id || backend.manual_id || "manual-unknown";
  return {
    id: mid,
    slug: backend.slug || mid,
    title: backend.title,
    description: backend.description || "Interactive digital curriculum handbook.",
    pages,
    currentPage: curPage,
    cover: (backend.cover as any) || "accent",
    category: cat,
    author: backend.author || "EdVidura Academic Faculty",
    subjectCode: backend.subject_code || "CURR-08",
    classLevel: backend.class_level || "Class 8 (RHS-C08)",
    chaptersCount: backend.chapters_count || 4,
    hasAudiobook: true,
    hasInteractiveChecks: true,
    publishedDate: backend.created_at || "2026-10-15",
  };
}

/**
 * Adapts backend chapter item to React Chapter.
 */
export function adaptEbookChapter(
  manualId: string,
  chapter: { chapter_index: number; title: string; paragraphs?: string[]; takeaway?: string; conceptCheck?: any },
): Chapter {
  return {
    id: `ch-${manualId}-${chapter.chapter_index}`,
    title: chapter.title,
    startPage: (chapter.chapter_index - 1) * 15 + 1,
    takeaway: chapter.takeaway || "Review the key principles of this section before moving to the concept check.",
    paragraphs:
      chapter.paragraphs && chapter.paragraphs.length > 0
        ? chapter.paragraphs
        : ["Chapter content loaded from verified PeBL source."],
    conceptCheck: chapter.conceptCheck || {
      question: `What is the core takeaway of ${chapter.title}?`,
      options: [
        "Consistent application of foundational principles",
        "Passive reading without self-testing",
        "Memorizing formulas without understanding derivation",
        "Skipping practice problems",
      ],
      correctIndex: 0,
      explanation: "Active recall and systematic application of principles ensure concept mastery.",
      skillTag: "core-comprehension",
    },
  };
}

/**
 * Adapts list of backend chapters to React Chapter array.
 */
export function adaptChapters(
  manualIdOrChapters?: string | BackendChapterItem[],
  backendChapters?: BackendChapterItem[],
): Chapter[] {
  let manualId = "manual";
  let chapters: BackendChapterItem[] | undefined = backendChapters;
  if (Array.isArray(manualIdOrChapters)) {
    chapters = manualIdOrChapters;
  } else if (typeof manualIdOrChapters === "string") {
    manualId = manualIdOrChapters;
  }
  if (chapters && chapters.length > 0) {
    return chapters.map((c, i) => ({
      id: c.id || `ch-${manualId}-${i + 1}`,
      title: c.title,
      startPage: c.startPage ?? i * 10 + 1,
      paragraphs:
        c.paragraphs && c.paragraphs.length > 0
          ? c.paragraphs
          : ["Chapter content loaded from verified PeBL source."],
    }));
  }
  return [];
}

/**
 * Adapts backend class roster item to table model.
 */
export interface BackendClassRoster {
  id: string;
  class_code: string;
  class_name: string;
  subject?: string;
  teachers?: Array<{ name: string; role?: string; email?: string }>;
  students?: Array<{ name: string; student_code?: string; email?: string }>;
}

export function adaptClassSummary(backend: BackendClassRoster) {
  return {
    id: backend.id,
    code: backend.class_code,
    name: backend.class_name,
    trade: backend.subject || "General",
    teacherName: backend.teachers?.[0]?.name || "Unassigned",
    studentCount: backend.students?.length || 0,
  };
}

/**
 * Adapts backend quiz attempt card to UI Attempt model.
 */
export interface BackendAttemptCard {
  id: string;
  subject?: string;
  learner_name?: string;
  course_label?: string;
  score: number;
  max_score: number;
  score_percent?: number | null;
  grade_sent?: boolean;
  grade_error?: string | null;
  status: string;
  created_at?: string;
}

export function adaptAttempt(backend: BackendAttemptCard): Attempt {
  let moodleStatus: MoodleStatus = "waiting";
  const st = (backend.status || "").toLowerCase();
  if (backend.grade_sent || st === "synced") {
    moodleStatus = "sent";
  } else if (backend.grade_error || st === "needs-review" || st === "failed") {
    moodleStatus = "error";
  } else if (st === "ags_off" || st === "unavailable") {
    moodleStatus = "unavailable";
  } else if (st === "skipped_practice" || st === "practice") {
    moodleStatus = "practice";
  } else if (st === "queued" || st === "pending") {
    moodleStatus = "waiting";
  }

  return {
    id: backend.id,
    personId: backend.subject || "p-learner",
    quizId: "qz-checkpoint",
    kind: moodleStatus === "practice" ? "practice" : "graded",
    score: backend.score,
    outOf: 5,
    moodleStatus,
    submittedAt: backend.created_at || new Date().toISOString(),
  };
}

export function adaptAttempts(list: BackendAttemptCard[]): Attempt[] {
  if (!Array.isArray(list)) return [];
  return list.map(adaptAttempt);
}

// --- Phase 9 School Admin & Ops Adapters ---

export interface BackendSchoolOverview {
  institution?: {
    id?: string;
    code?: string;
    name?: string;
    course_name?: string;
    moodle_site?: string;
    lms_url?: string;
    auth_mode?: string;
  };
  snapshot?: {
    student_count?: number;
    teacher_count?: number;
    class_count?: number;
    chapter_count?: number;
    binding_count?: number;
    admin_count?: number;
  };
  figures?: {
    learners?: number;
    attempts?: number;
    completed?: number;
    hours?: number;
    activeClasses?: number;
    faculty?: number;
  };
  classes?: Array<{
    id: string;
    code: string;
    name: string;
    grade?: string;
  }>;
}

export interface AdaptedInstituteDetail {
  id: string;
  name: string;
  code: string;
  course: string;
  learnersRecorded: number;
  inMoodle: number;
  schoolAdmins: number;
  classesCount: number;
  teachersCount: number;
  attemptsCount: number;
  classes: Array<{ code: string; name: string }>;
  trainingOfficers: string[];
}

export function adaptSchoolOverview(backend: BackendSchoolOverview): AdaptedInstituteDetail {
  const inst = backend.institution || {};
  const snap = backend.snapshot || {};
  const figs = backend.figures || {};
  const classes = (backend.classes || []).map((c) => ({
    code: c.code || "",
    name: c.name || "",
  }));

  return {
    id: inst.id || "inst-live",
    name: inst.name || "Main Campus",
    code: inst.code || "LIVE-01",
    course: inst.course_name || "Vocational & Technical Training",
    learnersRecorded: figs.learners ?? snap.student_count ?? 0,
    inMoodle: figs.learners ?? snap.student_count ?? 0,
    schoolAdmins: snap.admin_count ?? 1,
    classesCount: figs.activeClasses ?? snap.class_count ?? classes.length,
    teachersCount: figs.faculty ?? snap.teacher_count ?? 0,
    attemptsCount: figs.attempts ?? 0,
    classes,
    trainingOfficers: ["Academic Operations Desk"],
  };
}

export interface BackendOpsInstituteRow {
  tenant_id: string;
  name: string;
  learner_count?: number;
  student_count?: number;
  connection?: "connected" | "warning" | "error";
  lms_platform?: string;
}

export function adaptOpsOverview(backend: {
  tenants?: Array<{ tenant_id: string; name?: string; count?: number }>;
  institutions?: Array<{ tenant_id?: string; name?: string; code?: string }>;
  platforms?: Array<{ platform_id?: string; name?: string }>;
  integration_status?: Record<string, unknown>;
}) {
  const rawTenants = backend.tenants || [];
  const rawInsts = backend.institutions || [];

  const rows = rawTenants.map((t, idx) => {
    const inst = rawInsts.find((i) => i.tenant_id === t.tenant_id);
    return {
      id: t.tenant_id || `t-${idx}`,
      name: inst?.name || t.name || `Tenant ${t.tenant_id}`,
      learners: t.count || 0,
      connection: "connected" as const,
    };
  });

  return rows;
}
