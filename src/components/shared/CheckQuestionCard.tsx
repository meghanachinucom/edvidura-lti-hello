export function CheckQuestionCard({ question, label }: { question: string; label: string }) {
  return <section className="rounded-surface border border-border bg-surface p-3"><h3 className="text-sm font-semibold text-ink">{label}</h3><p className="mt-1 text-ink">{question}</p></section>;
}
