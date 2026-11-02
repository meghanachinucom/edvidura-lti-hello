import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, Volume2, VolumeX } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { EmptyState } from "@/components/shared/EmptyState";
import { CircuitWorkbench } from "@/components/learner/CircuitWorkbench";
import { reels } from "@/data/reels";
import { mockState } from "@/data/mockState";

// LR-11 Micro-learning. No autoplay, no infinite scroll.
export const Route = createFileRoute("/_shell/learn/micro")({
  head: () => ({
    meta: [
      { title: t("pages.micro") + t("app.titleSuffix") },
      { name: "description", content: t("LR-11.swipe") },
      { property: "og:title", content: t("pages.micro") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-11.swipe") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-11.${k}`, v);

function Page() {
  const list = mockState.micro.reels === "empty" ? [] : reels;
  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);
  const startY = useRef<number | null>(null);
  const reel = list[i];
  const go = (n: number) => setI(Math.max(0, Math.min(list.length - 1, n)));

  return (
    <div className="mx-auto w-full max-w-content space-y-4 px-4 py-8">
      <PageHeading titleKey="pages.micro" />
      {!reel ? <EmptyState title={s("empty")} help={s("emptyHelp")} /> : (
        <>
          <article aria-live="polite" aria-label={s("counter", { n: i + 1, total: list.length })}
            onTouchStart={(e) => { startY.current = e.touches[0]?.clientY ?? null; }}
            onTouchEnd={(e) => {
              const y = e.changedTouches[0]?.clientY; if (startY.current == null || y == null) return;
              const d = startY.current - y; if (Math.abs(d) > 50) go(i + (d > 0 ? 1 : -1)); startY.current = null;
            }}
            className="mx-auto flex min-h-[70vh] max-w-md flex-col gap-3 rounded-surface border border-border bg-surface p-4 text-ink tablet:min-h-0">
            <p className="text-sm text-ink-muted">{s("counter", { n: i + 1, total: list.length })}</p>
            <h2 className="font-heading text-[22px]">{reel.title}</h2>
            <p>{reel.idea}</p>
            <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-surface bg-border">
              <PlayCircle aria-hidden size={48} /><span>{s("video")}</span>
            </div>
            <div className="mt-auto flex flex-col gap-2 tablet:flex-row">
              <Link to="/lessons/$lessonId" params={{ lessonId: reel.lessonId }} className="btn-primary">{s("full")}</Link>
              <Link to="/active-quizzes" className="btn-secondary">{s("practise")}</Link>
            </div>
          </article>
          <div className="mx-auto max-w-md space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="btn-secondary">{s("prev")}</button>
              <button type="button" onClick={() => go(i + 1)} disabled={i === list.length - 1} className="btn-secondary">{s("next")}</button>
            </div>
            <p className="text-center text-sm text-ink-muted">{s("swipe")}</p>
            <button type="button" aria-pressed={sound} onClick={() => setSound((x) => !x)} className="btn-secondary w-full">
              {sound ? <Volume2 aria-hidden size={18} /> : <VolumeX aria-hidden size={18} />}<span className="ml-2">{s("sound")}</span>
            </button>
          </div>
          <CircuitWorkbench />
        </>
      )}
    </div>
  );
}
