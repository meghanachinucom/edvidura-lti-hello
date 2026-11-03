import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { t } from "@/i18n";
import type { Lesson } from "@/data/lessons";

export function LessonCode({ code }: { code: string }) {
  return <span className="inline-flex rounded border border-border px-1.5 py-0.5 align-middle font-mono text-xs leading-none text-ink-muted">{code}</span>;
}

export function LessonName({ lesson, className = "" }: { lesson: Lesson; className?: string }) {
  return <span className={className}>{lesson.title} <LessonCode code={lesson.courseCode} /></span>;
}

export function LessonRows({ items }: { items: Lesson[] }) {
  return (
    <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((lesson) => (
        <li key={lesson.id}>
          <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className={`flex min-h-14 items-center gap-3 px-4 py-3 ${lesson.markedDone ? "text-ink-muted" : "text-ink"}`}>
            <span aria-hidden className="w-6 shrink-0 font-semibold">{String(lesson.order).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium"><LessonName lesson={lesson} /></span>
              <span className="block text-sm">{t(`shared.lessonKind.${lesson.kind}`)} · {lesson.markedDone ? t("lessonList.done") : t("lessonList.todo")}</span>
            </span>
            <ChevronRight aria-hidden size={18} className="shrink-0" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function UpNextCard({ lesson, heading = true }: { lesson: Lesson; heading?: boolean }) {
  return (
    <section aria-labelledby={heading ? "lesson-up-next" : undefined}>
      {heading && <h2 id="lesson-up-next" className="font-heading text-[22px] text-ink"><span className="text-accent">01</span> <span>{t("lessonList.upNext")}</span></h2>}
      <Link to="/lessons/$lessonId" params={{ lessonId: lesson.id }} className="mt-3 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border border-l-4 border-l-accent bg-surface px-4 py-3 text-ink">
        <span className="min-w-0">
          <span className="block text-sm text-ink-muted">{t(`shared.lessonKind.${lesson.kind}`)}</span>
          <span className="block font-medium"><LessonName lesson={lesson} /></span>
        </span>
        <ChevronRight aria-hidden size={20} className="shrink-0" />
      </Link>
    </section>
  );
}
