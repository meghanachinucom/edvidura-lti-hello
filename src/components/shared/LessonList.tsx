import { Link } from "@tanstack/react-router";
import { t } from "@/i18n";
import { lessons, type Lesson } from "@/data/lessons";

export function LessonCode({ code }: { code: string }) {
  return <span className="inline-flex rounded border border-border px-1.5 py-0.5 align-middle font-mono text-xs leading-none text-ink-muted">{code}</span>;
}

export function LessonName({ lesson, className = "" }: { lesson: Lesson; className?: string }) {
  return <span className={className}>{lesson.title} <LessonCode code={lesson.courseCode} /></span>;
}

function LessonIllustration({ lesson }: { lesson: Lesson }) {
  const shared = { stroke: "var(--secondary)", strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={t("lessonCard.illustration", { title: lesson.title })} className="h-full w-full">
      <rect width="320" height="180" fill="var(--surface-container-low)" />
      {lesson.id === "1" && <>
        <path d="M160 32 208 50v38c0 31-20 54-48 68-28-14-48-37-48-68V50z" fill="var(--secondary-container)" {...shared} />
        <path d="m138 89 15 15 31-34" {...shared} />
      </>}
      {lesson.id === "2" && <>
        <path d="M111 61a55 55 0 0 1 91 11" fill="none" {...shared} />
        <path d="m191 56 12 16-19 4" fill="none" {...shared} />
        <path d="M209 119a55 55 0 0 1-91-11" fill="none" {...shared} />
        <path d="m129 124-12-16 19-4" fill="none" {...shared} />
        <circle cx="160" cy="90" r="22" fill="var(--highlight)" {...shared} />
        <path d="M160 73v34m-11-17h22" {...shared} />
      </>}
      {lesson.id === "3" && <>
        <path d="M160 37v72m-42 0h84m-70 18h56m-42 18h28" fill="none" {...shared} />
        <circle cx="160" cy="43" r="8" fill="var(--secondary)" />
      </>}
      {lesson.id === "4" && <>
        <rect x="99" y="43" width="122" height="94" rx="12" fill="var(--surface)" {...shared} />
        <circle cx="127" cy="90" r="8" fill="var(--secondary)" />
        <circle cx="193" cy="90" r="8" fill="var(--secondary)" />
        <path d="m135 86 44-27" fill="none" {...shared} />
      </>}
      {lesson.id === "5" && <>
        <rect x="111" y="47" width="98" height="101" rx="10" fill="var(--surface)" {...shared} />
        <path d="M143 47v-8h34v8m-45 28h56m-56 22h28m-28 22 11 11 23-25" fill="none" {...shared} />
      </>}
    </svg>
  );
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
      <div className="relative aspect-[16/9]">
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
