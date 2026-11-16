import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Video, ClipboardCheck } from "lucide-react";
import { t } from "@/i18n";
import { lessons, type Lesson } from "@/data/lessons";

const LOCAL_LESSON_IMAGES = [
  "/images/lessons/lesson-1.svg",
  "/images/lessons/lesson-2.svg",
  "/images/lessons/lesson-3.svg",
  "/images/lessons/lesson-4.svg",
  "/images/lessons/lesson-5.svg",
];

export function getLessonImage(lesson: Lesson): string {
  if (typeof lesson.order === "number" && lesson.order > 0) {
    const idx = (lesson.order - 1) % LOCAL_LESSON_IMAGES.length;
    return LOCAL_LESSON_IMAGES[idx] || "/images/lessons/lesson-default.svg";
  }
  return "/images/lessons/lesson-default.svg";
}

export function LessonCode({ code }: { code: string }) {
  return (
    <span className="inline-flex rounded border border-border px-1.5 py-0.5 align-middle font-mono text-xs leading-none text-ink-muted">
      {code}
    </span>
  );
}

export function LessonName({ lesson, className = "" }: { lesson: Lesson; className?: string }) {
  return (
    <span className={className}>
      {lesson.title} <LessonCode code={lesson.courseCode} />
    </span>
  );
}

function LessonIllustration({ lesson }: { lesson: Lesson }) {
  const [hasError, setHasError] = useState(false);
  const src = getLessonImage(lesson);

  if (hasError) {
    const KindIcon =
      lesson.kind === "video" ? Video : lesson.kind === "quiz" ? ClipboardCheck : BookOpen;
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary/15 via-surface to-secondary-container">
        <KindIcon aria-hidden className="size-12 text-secondary/60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export function LessonCard({ lesson, isUpNext = false }: { lesson: Lesson; isUpNext?: boolean }) {
  const status =
    lesson.kind === "quiz"
      ? "checkpoint"
      : lesson.markedDone
        ? "completed"
        : isUpNext
          ? "now"
          : "open";
  const action = lesson.kind === "quiz" ? "takeQuiz" : lesson.markedDone ? "review" : "start";
  const earlierLessonsDone =
    lesson.kind !== "quiz" ||
    lessons.filter((item) => item.order < lesson.order).every((item) => item.markedDone);
  const canOpen = earlierLessonsDone;
  const meta = lesson.markedDone ? t("lessonCard.completedMeta") : t("lessonCard.available");
  const actionClass = "btn-primary w-full";
  return (
    <article className="overflow-hidden rounded-surface border border-border bg-surface">
      <div className="relative aspect-[16/9] bg-page-bg">
        <LessonIllustration lesson={lesson} />
        <span className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink shadow-sm">
          {t(`lessonCard.status.${status}`)}
        </span>
      </div>
      <div className="flex h-full flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t("lessonCard.eyebrow", {
            number: String(lesson.order).padStart(2, "0"),
            type: t(`shared.lessonKind.${lesson.kind}`).toUpperCase(),
          })}
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold text-ink">
          <LessonName lesson={lesson} />
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {lesson.markedDone ? `${t("lessonCard.duration")} · ${meta}` : meta}
        </p>
        <div className="mt-4">
          {canOpen ? (
            lesson.kind === "quiz" ? (
              <Link to="/quiz" className={actionClass}>
                {t(`lessonCard.actions.${action}`)}
              </Link>
            ) : (
              <Link
                to="/lessons/$lessonId"
                params={{ lessonId: lesson.id }}
                className={actionClass}
              >
                {t(`lessonCard.actions.${action}`)}
              </Link>
            )
          ) : (
            <button
              type="button"
              disabled
              aria-describedby={`lesson-${lesson.id}-lock`}
              className={`${actionClass} cursor-not-allowed opacity-60`}
            >
              {t(`lessonCard.actions.${action}`)}
            </button>
          )}
          {!canOpen && (
            <p id={`lesson-${lesson.id}-lock`} className="mt-2 text-sm text-ink-muted">
              {t("lessonCard.quizLocked")}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function LessonGrid({
  items,
  upNextId,
  singleColumn = false,
}: {
  items: Lesson[];
  upNextId?: string | undefined;
  singleColumn?: boolean;
}) {
  return (
    <ul className={`grid grid-cols-1 gap-4 ${singleColumn ? "" : "desktop:grid-cols-2"}`}>
      {items.map((lesson) => (
        <li key={lesson.id}>
          <LessonCard lesson={lesson} isUpNext={lesson.id === upNextId} />
        </li>
      ))}
    </ul>
  );
}
