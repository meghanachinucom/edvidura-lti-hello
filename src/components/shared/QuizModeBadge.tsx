import { t } from "@/i18n";

/** M3 quiz mode label: plain text badge, "Practice lane — questions unique to you" or "Graded quiz". */
export function QuizModeBadge({ kind }: { kind: "graded" | "practice" }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-medium ${kind === "graded" ? "border-ink text-ink" : "border-dashed border-border-control text-ink"}`}>
      {t(`shared.quizMode.${kind}`)}
    </span>
  );
}
