import { Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { lessons, type Lesson } from "@/data/lessons";

const lessonImages: Record<string, string> = {
  "1": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1000&q=80",
  "2": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
  "3": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=80",
  "4": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=80",
  "5": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=80",
};

export function LessonCode({ code }: { code: string }) {
  return <span className="inline-flex rounded border border-border px-1.5 py-0.5 align-middle font-mono text-xs leading-none text-ink-muted">{code}</span>;
}

export function LessonName({ lesson, className = "" }: { lesson: Lesson; className?: string }) {
  return <span className={className}>{lesson.title} <LessonCode code={lesson.courseCode} /></span>;
}

function LessonIllustration({ lesson }: { lesson: Lesson }) {
  return <img src={lessonImages[lesson.id]} alt={lesson.title} className="h-full w-full object-cover" loading="lazy" />;
}

export function LessonCard({ lesson, isUpNext = false }: { lesson: Lesson; isUpNext?: boolean }) {
  const status = lesson.kind === "quiz" ? "checkpoint" : lesson.markedDone ? "completed" : isUpNext ? "now" : "open";
  const action = lesson.kind === "quiz" ? "takeQuiz" : lesson.markedDone ? "review" : "start";
  const earlierLessonsDone = lesson.kind !== "quiz" || lessons.filter((item) => item.order < lesson.order).every((item) => item.markedDone);
  const canOpen = earlierLessonsDone;
  const meta = lesson.markedDone ? t("lessonCard.completedMeta") : t("lessonCard.available");
  const actionClass = "btn-primary w-full";
  return (
    <article className="overflow-hidden rounded-surface border border-border bg-surface">
      <div className="relative aspect-[16/9] bg-page-bg">
        <LessonIllustration lesson={lesson} />
        <span className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink shadow-sm">{t(`lessonCard.status.${status}`)}</span>
      </div>
      <div className="flex h-full flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("lessonCard.eyebrow", { number: String(lesson.order).padStart(2, "0"), type: t(`shared.lessonKind.${lesson.kind}`).toUpperCase() })}</p>
        <h2 className="mt-2 font-heading text-xl font-bold text-ink"><LessonName lesson={lesson} /></h2>
        <p className="mt-2 text-sm text-ink-muted">{lesson.markedDone ? `${t("lessonCard.duration")} · ${meta}` : meta}</p>
        <div className="mt-4">
          {canOpen ? lesson.kind === "quiz" ? <Link to="/quiz" className={actionClass}>{t(`lessonCard.actions.${action}`)}</Link>
            : <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={actionClass}>{t(`lessonCard.actions.${action}`)}</Link>
            : <button type="button" disabled aria-describedby={`lesson-${lesson.id}-lock`} className={`${actionClass} cursor-not-allowed opacity-60`}>{t(`lessonCard.actions.${action}`)}</button>}
          {!canOpen && <p id={`lesson-${lesson.id}-lock`} className="mt-2 text-sm text-ink-muted">{t("lessonCard.quizLocked")}</p>}
        </div>
      </div>
    </article>
  );
}

export function LessonGrid({ items, upNextId, singleColumn = false }: { items: Lesson[]; upNextId?: string | undefined; singleColumn?: boolean }) {
  return <ul className={`grid grid-cols-1 gap-4 ${singleColumn ? "" : "desktop:grid-cols-2"}`}>{items.map((lesson) => <li key={lesson.id}><LessonCard lesson={lesson} isUpNext={lesson.id === upNextId} /></li>)}</ul>;
}
