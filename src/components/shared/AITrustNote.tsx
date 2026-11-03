import { t } from "@/i18n";
import { lessons } from "@/data/lessons";
import { LessonName } from "@/components/shared/LessonList";

/** Used under every AI output. Sources line only when sources exist — never invented. */
export function AITrustNote({ audience, sources, limits }: { audience: "learner" | "instructor"; sources?: string[]; limits?: string }) {
  const hasSources = !!sources && sources.length > 0;
  return (
    <aside className="mt-3 space-y-2 border-t border-border pt-3 text-sm text-ink">
      {audience === "instructor" && (
        <p><span className="inline-block rounded-surface border border-warning px-2 py-0.5 font-semibold text-warning">{t("shared.ai.draftTag")}</span></p>
      )}
      {hasSources && (
        <div>
          <p className="font-semibold">{t(audience === "learner" ? "shared.ai.sourcesLearner" : "shared.ai.sourcesInstructor")}</p>
          <ul className="ml-5 list-disc">{sources!.map((source) => {
            const lesson = lessons.find((item) => item.title === source);
            return <li key={source}>{lesson ? <LessonName lesson={lesson} /> : source}</li>;
          })}</ul>
        </div>
      )}
      <p><span className="font-semibold">{t("shared.ai.limitsLabel")}</span> {limits ?? t("shared.ai.limitsDefault")}</p>
    </aside>
  );
}
