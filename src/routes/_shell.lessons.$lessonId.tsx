import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { LoopStepper } from "@/components/shared/LoopStepper";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SlowNetworkNote } from "@/components/shared/SlowNetworkNote";
import { CircuitWorkbench } from "@/components/learner/CircuitWorkbench";
import { lessonById, lessons, type Lesson } from "@/data/lessons";
import { mockState } from "@/data/mockState";

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

function Page() {
  const { lessonId } = Route.useParams();
  const lesson = lessonById(lessonId);
  // Unknown record: neutral "not available" page, never confirming it exists elsewhere.
  if (!lesson) return <AccessUnavailable back={{ to: "/lessons", label: s("back") }} />;
  return <Player key={lesson.id} lesson={lesson} />;
}

function Player({ lesson }: { lesson: Lesson }) {
  const [done, setDone] = useState(lesson.markedDone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const i = lessons.findIndex((l) => l.id === lesson.id);
  const prev = lessons[i - 1];
  const next = lessons[i + 1];

  const toggle = () => {
    setSaving(true); setError(false);
    setTimeout(() => {
      setSaving(false);
      if (mockState.lessons.save === "error") setError(true);
      else setDone((d) => !d);
    }, mockState.lessons.savingMs);
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 pt-6 pb-48 tablet:pb-10">
      <Link to="/lessons" className="inline-flex min-h-11 items-center gap-2 text-ink underline">
        <ArrowLeft aria-hidden size={18} />{s("back")}
      </Link>
      <div className="mt-2"><PageHeading text={lesson.title} /></div>
      <p className="mt-1 text-ink-muted">{t(`shared.lessonKind.${lesson.kind}`)}</p>

      {lesson.kind === "video" && (
        <div className="mt-6 flex aspect-video max-w-reading flex-col items-center justify-center gap-2 rounded-surface bg-border text-ink">
          <PlayCircle aria-hidden size={48} />
          <span>{s("video")}</span>
        </div>
      )}

      <div className="mt-6 max-w-reading space-y-4 text-[17px] leading-relaxed text-ink">
        {[0, 1, 2].map((n) => <p key={n}>{t(`LR-02.body.${lesson.id}.${n}`)}</p>)}
      </div>

      {mockState.lessons.fromMiss && (
        <section className="mt-8 max-w-reading space-y-3 rounded-surface border border-border bg-surface p-4">
          <LoopStepper current={1} />
          <p className="text-ink">{s("loopLine")}</p>
          <Link to="/active-quizzes" className="btn-secondary">{s("practise")}</Link>
        </section>
      )}

      <CircuitWorkbench />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] tablet:static tablet:mt-10 tablet:border-0 tablet:bg-transparent tablet:p-0">
        <div className="mx-auto max-w-content space-y-2">
          {error && <ErrorAlert message={s("saveError")} />}
          <div className="flex flex-wrap items-center gap-3">
            {done && <p className="font-semibold text-ink">{s("markedDone")}</p>}
            <button type="button" onClick={toggle} disabled={saving} aria-disabled={saving}
              className={done ? "btn-secondary" : "btn-primary"}>
              {saving ? s("saving") : done ? s("markIncomplete") : s("markComplete")}
            </button>
          </div>
          <p className="text-sm text-ink-muted">{s("ownTracking")}</p>
          <SlowNetworkNote pending={saving} />
          <nav aria-label={s("lessonNav")} className="flex justify-between gap-3">
            {prev ? (
              <Link to="/lessons/$lessonId" params={{ lessonId: prev.id }} className="inline-flex min-h-11 items-center gap-1 text-ink underline">
                <ChevronLeft aria-hidden size={18} />{s("prev")}
              </Link>
            ) : <span />}
            {next && (
              <Link to="/lessons/$lessonId" params={{ lessonId: next.id }} className="inline-flex min-h-11 items-center gap-1 text-ink underline">
                {s("next")}<ChevronRight aria-hidden size={18} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
