import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  BookOpen,
  FileText,
  Save,
  Sparkles,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { LessonVideoMasterclass } from "@/components/shared/LessonVideoMasterclass";
import { getLessonImage } from "@/components/shared/LessonList";
import { VideoCheckpointCard } from "@/components/enterprise/VideoCheckpointCard";
import { lessonById, lessons, type Lesson } from "@/data/lessons";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { adaptLesson } from "@/lib/adapters";

export const Route = createFileRoute("/_shell/lessons/$lessonId")({
  head: () => ({
    meta: [
      { title: t("pages.lesson") + t("app.titleSuffix") },
      { name: "description", content: t("pages.lesson") },
      { property: "og:title", content: t("pages.lesson") + t("app.titleSuffix") },
      { property: "og:description", content: t("pages.lesson") },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`LR-02.${k}`);

interface BackendLessonDetail {
  id: string;
  title: string;
  summary?: string;
  body_md?: string;
  body_html?: string;
  kind?: string;
  completed?: boolean;
  order_index?: number;
  course_code?: string;
}

interface LessonDetailResponse {
  lesson: BackendLessonDetail;
  prev?: { id: string; title?: string };
  next?: { id: string; title?: string };
}

function Page() {
  const { lessonId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [bodyMd, setBodyMd] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLesson() {
      setLoading(true);
      try {
        const resp = await api.get<LessonDetailResponse>(`/api/v1/app/lessons/${lessonId}`);
        if (active && resp?.lesson) {
          setLesson(adaptLesson(resp.lesson));
          setPrevId(resp.prev?.id ?? null);
          setNextId(resp.next?.id ?? null);
          setBodyHtml(resp.lesson.body_html ?? null);
          setBodyMd(resp.lesson.body_md ?? null);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Live lesson fetch fallback:", err);
      }

      if (active) {
        const fallback = lessonById(lessonId);
        if (fallback) {
          setLesson(fallback);
          const i = lessons.findIndex((l) => l.id === fallback.id);
          setPrevId(lessons[i - 1]?.id ?? null);
          setNextId(lessons[i + 1]?.id ?? null);
        }
        setLoading(false);
      }
    }
    loadLesson();
    return () => {
      active = false;
    };
  }, [lessonId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-content px-4 py-8">
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  if (!lesson) return <AccessUnavailable back={{ to: "/lessons", label: s("back") }} />;
  return (
    <Player
      key={lesson.id}
      lesson={lesson}
      prevId={prevId}
      nextId={nextId}
      bodyHtml={bodyHtml}
      bodyMd={bodyMd}
    />
  );
}

function Player({
  lesson,
  prevId,
  nextId,
  bodyHtml,
  bodyMd,
}: {
  lesson: Lesson;
  prevId: string | null;
  nextId: string | null;
  bodyHtml: string | null;
  bodyMd: string | null;
}) {
  const [done, setDone] = useState(lesson.markedDone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [notes, setNotes] = useState(
    "Key Takeaways:\n• An equation remains in balance if operations are mirrored on both sides.\n• Inverse operations: Addition ↔ Subtraction, Multiplication ↔ Division.\n• Check solution by back-substitution.",
  );
  const [savedNotes, setSavedNotes] = useState(false);

  const toggle = async () => {
    setSaving(true);
    setError(false);
    try {
      if (!done) {
        await api.post(`/api/v1/app/lessons/${lesson.id}/complete`);
      }
      setDone((d) => !d);
    } catch (err) {
      console.warn("Complete lesson API error:", err);
      if (mockState.lessons.save === "error") setError(true);
      else setDone((d) => !d);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = () => {
    setSavedNotes(true);
    setTimeout(() => setSavedNotes(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 pt-6 pb-24">
      {/* Back Link */}
      <Link to="/lessons" className="inline-flex min-h-11 items-center gap-2 text-ink underline font-medium">
        <ArrowLeft aria-hidden size={18} />
        {s("back")}
      </Link>

      {/* Header */}
      <div className="mt-2 mb-6">
        <PageHeading
          text={lesson.title}
          context={`Class 8 Curriculum · ${t(`shared.lessonKind.${lesson.kind}`)} · Verified Formative Checkpoints`}
        />
      </div>

      {/* 2-Column Balanced Chapter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Video Session + Interactive Checkpoints + Text Content) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Chapter Specific Video Masterclass */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
            <div className="bg-gradient-to-r from-secondary/10 via-surface to-surface p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="text-secondary size-5" />
                <h3 className="text-sm font-bold font-heading text-ink">
                  Interactive Video Session
                </h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                1080p HD Masterclass
              </span>
            </div>
            <div className="p-4">
              <LessonVideoMasterclass
                lecture={{
                  id: `lec-${lesson.id}`,
                  title: lesson.title,
                  description: `Visual intuition and step-by-step masterclass reasoning for Chapter ${lesson.order || 1}.`,
                  durationSec: 840,
                  coverUrl: getLessonImage(lesson),
                  speaker: "Prof. Ramanujan · Mathematics Faculty",
                  chapters: [
                    { timeSec: 0, label: "Core Principles & Definitions" },
                    { timeSec: 180, label: "Step-by-Step Worked Problems" },
                    { timeSec: 420, label: "Interactive Checkpoint Demo" },
                    { timeSec: 680, label: "Summary & Reflection" },
                  ],
                }}
              />
            </div>
          </div>

          {/* Video Checkpoint Markers Matched to Chapter Topic */}
          <VideoCheckpointCard videoId={`les-${lesson.id}`} />

          {/* Reading / Instruction Content */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <BookOpen className="text-secondary size-5" />
              <h3 className="text-base font-bold font-heading text-ink">
                Chapter Core Concepts & Reading
              </h3>
            </div>

            {bodyHtml ? (
              <div
                className="prose max-w-none text-base leading-relaxed text-ink"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : bodyMd ? (
              <div className="space-y-4 whitespace-pre-wrap text-base leading-relaxed text-ink">
                {bodyMd}
              </div>
            ) : (
              <div className="space-y-4 text-base leading-relaxed text-ink">
                {[0, 1, 2].map((n) => (
                  <p key={n}>{t(`LR-02.body.${lesson.id}.${n}`)}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Synchronous Chapter Notes & Concept Pad) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Synchronous Takeaways & Formulas Box */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Lightbulb className="text-amber-500 size-5" />
              <h3 className="text-base font-bold font-heading text-ink">
                Key Formulas & Rules
              </h3>
            </div>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-secondary/5 border border-secondary/20">
                <span className="font-bold text-secondary block mb-1">Additive Inverse Rule</span>
                <p className="text-ink-muted">To eliminate a term +c on the LHS, subtract c from both sides: ax + c - c = d - c</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="font-bold text-amber-700 block mb-1">Multiplicative Inverse Rule</span>
                <p className="text-ink-muted">To eliminate coefficient a, multiply by (1/a) or divide both sides by a: ax ÷ a = b ÷ a</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <span className="font-bold text-emerald-800 block mb-1">Verification Step</span>
                <p className="text-ink-muted">Substitute the calculated value back into LHS: Confirm LHS == RHS identically.</p>
              </div>
            </div>
          </div>

          {/* Synchronous Chapter Notes Pad */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-secondary size-5" />
                <h3 className="text-base font-bold font-heading text-ink">
                  Synchronous Chapter Notes
                </h3>
              </div>
              {savedNotes && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> Saved!
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              Jot down notes while watching the video or reading. Notes sync across your devices.
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-border bg-page-bg p-3 text-xs font-mono text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary leading-relaxed"
              placeholder="Write your study notes here..."
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-white hover:bg-secondary-hover shadow-xs transition"
              >
                <Save size={14} />
                <span>Save Notes</span>
              </button>
            </div>
          </div>

          {/* Chapter Completion & Navigation Action */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold font-heading text-ink">Chapter Completion Status</h4>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggle}
                disabled={saving}
                aria-disabled={saving}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold shadow-xs transition ${
                  done
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                    : "bg-secondary text-white hover:bg-secondary-hover"
                }`}
              >
                {saving ? s("saving") : done ? "✓ Chapter Completed (Click to Undo)" : "Mark Chapter Completed"}
              </button>
            </div>
            <SlowNetworkNote pending={saving} />
            {error && <ErrorAlert message={s("saveError")} />}

            {/* Prev / Next Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs font-bold">
              {prevId ? (
                <Link
                  to="/lessons/$lessonId"
                  params={{ lessonId: prevId }}
                  className="inline-flex items-center gap-1 text-secondary hover:underline"
                >
                  <ChevronLeft size={16} />
                  <span>Previous Chapter</span>
                </Link>
              ) : (
                <span className="text-ink-muted">First Chapter</span>
              )}

              {nextId ? (
                <Link
                  to="/lessons/$lessonId"
                  params={{ lessonId: nextId }}
                  className="inline-flex items-center gap-1 text-secondary hover:underline"
                >
                  <span>Next Chapter</span>
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <Link to="/active-quizzes" className="inline-flex items-center gap-1 text-secondary hover:underline">
                  <span>Take Chapter Quiz</span>
                  <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
