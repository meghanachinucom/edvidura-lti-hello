import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { LoopStepper } from "@/components/shared/LoopStepper";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { CircuitWorkbench } from "@/components/learner/CircuitWorkbench";
import { LessonVideoMasterclass } from "@/components/shared/LessonVideoMasterclass";
import { lessonById, lessons, type Lesson } from "@/data/lessons";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";
import { adaptLesson } from "@/lib/adapters";

// LR-02 Lesson player.
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

      // Prototype fallback
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

  // Unknown record: neutral "not available" page, never confirming it exists elsewhere.
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

  return (
    <div className="mx-auto w-full max-w-content px-4 pt-6 pb-48 tablet:pb-10">
      <Link to="/lessons" className="inline-flex min-h-11 items-center gap-2 text-ink underline">
        <ArrowLeft aria-hidden size={18} />
        {s("back")}
      </Link>
      <div className="mt-2">
        <PageHeading
          text={lesson.title}
          context={t(`shared.lessonKind.${lesson.kind}`)}
        />
      </div>

      {lesson.kind === "video" ? (
        <div className="mt-6 max-w-reading">
          <LessonVideoMasterclass />
        </div>
      ) : (
        <div className="mt-6 max-w-reading">
          <LessonVideoMasterclass />
        </div>
      )}

      {bodyHtml ? (
        <div
          className="prose mt-6 max-w-reading text-[17px] leading-relaxed text-ink"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : bodyMd ? (
        <div className="mt-6 max-w-reading space-y-4 whitespace-pre-wrap text-[17px] leading-relaxed text-ink">
          {bodyMd}
        </div>
      ) : (
        <div className="mt-6 max-w-reading space-y-4 text-[17px] leading-relaxed text-ink">
          {[0, 1, 2].map((n) => (
            <p key={n}>{t(`LR-02.body.${lesson.id}.${n}`)}</p>
          ))}
        </div>
      )}

      {mockState.lessons.fromMiss && (
        <section className="mt-8 max-w-reading space-y-3 rounded-surface border border-border bg-surface p-4">
          <LoopStepper current={1} />
          <p className="text-ink">{s("loopLine")}</p>
          <Link to="/active-quizzes" className="btn-secondary">
            {s("practise")}
          </Link>
        </section>
      )}

      <CircuitWorkbench />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] tablet:static tablet:mt-10 tablet:border-0 tablet:bg-transparent tablet:p-0">
        <div className="mx-auto max-w-content space-y-2">
          {error && <ErrorAlert message={s("saveError")} />}
          <div className="flex flex-wrap items-center gap-3">
            {done && <p className="font-semibold text-ink">{s("markedDone")}</p>}
            <button
              type="button"
              onClick={toggle}
              disabled={saving}
              aria-disabled={saving}
              className={done ? "btn-secondary" : "btn-primary"}
            >
              {saving ? s("saving") : done ? s("markIncomplete") : s("markComplete")}
            </button>
          </div>
          <p className="text-sm text-ink-muted">{s("ownTracking")}</p>
          <SlowNetworkNote pending={saving} />
          <nav aria-label={s("lessonNav")} className="flex justify-between gap-3">
            {prevId ? (
              <Link
                to="/lessons/$lessonId"
                params={{ lessonId: prevId }}
                className="inline-flex min-h-11 items-center gap-1 text-ink underline"
              >
                <ChevronLeft aria-hidden size={18} />
                {s("prev")}
              </Link>
            ) : (
              <span />
            )}
            {nextId && (
              <Link
                to="/lessons/$lessonId"
                params={{ lessonId: nextId }}
                className="inline-flex min-h-11 items-center gap-1 text-ink underline"
              >
                {s("next")}
                <ChevronRight aria-hidden size={18} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
