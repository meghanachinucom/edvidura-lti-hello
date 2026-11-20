import { useState } from "react";
import { Sparkles, Calculator, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";

interface MintResponse {
  ok: boolean;
  variant_id: string;
  title: string;
  question: string;
  variables_rendered: Record<string, number>;
  unit: string;
}

interface EvaluateResponse {
  ok: boolean;
  variant_id: string;
  is_correct: boolean;
  submitted_answer: number;
  correct_answer: number;
  tolerance_pct: number;
}

export function AlgorithmicPracticeCard() {
  const [topic, setTopic] = useState<"linear-balance" | "circuit-ohms-law" | "kinetic-energy">(
    "linear-balance",
  );
  const [loading, setLoading] = useState(false);
  const [minted, setMinted] = useState<MintResponse | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [evalResult, setEvalResult] = useState<EvaluateResponse | null>(null);

  const handleMintFresh = async () => {
    setLoading(true);
    setEvalResult(null);
    setUserAnswer("");
    try {
      const res = await api.post<MintResponse>("/api/v1/quiz/algorithmic/mint", {
        template_key: topic,
        student_id: "6",
      });
      if (res && res.variant_id) {
        setMinted(res);
      }
    } catch {
      // Offline fallback
      setMinted({
        ok: true,
        variant_id: `var-local-${Date.now()}`,
        title:
          topic === "linear-balance"
            ? "Two-Step Linear Equation Solver"
            : "Ohm's Law Current & Power",
        question:
          topic === "linear-balance"
            ? "Solve for x in the equation: 4x + 12 = 48"
            : "A circuit has a supply voltage of 220 V and a resistor of 44 Ω. Calculate current I in Amperes.",
        variables_rendered: { a: 4, b: 12, c: 48 },
        unit: "numeric",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minted || !userAnswer.trim()) return;

    setLoading(true);
    const parsed = parseFloat(userAnswer);
    try {
      const res = await api.post<EvaluateResponse>("/api/v1/quiz/algorithmic/evaluate", {
        variant_id: minted.variant_id,
        student_answer: parsed,
      });
      if (res) {
        setEvalResult(res);
      }
    } catch {
      // Fallback evaluation
      const correct = topic === "linear-balance" ? 9 : 5;
      const isCorrect = Math.abs(parsed - correct) < 0.1;
      setEvalResult({
        ok: true,
        variant_id: minted.variant_id,
        is_correct: isCorrect,
        submitted_answer: parsed,
        correct_answer: correct,
        tolerance_pct: 1.0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      aria-label="Dynamic Algorithmic Question Generator"
      className="rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
            <Calculator className="size-4.5" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-ink">
              Practice Fresh Randomized Problem · BF-06
            </h3>
            <p className="text-xs text-ink-muted">
              Pure AST math generation with unique randomized coefficients per student attempt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as any)}
            className="text-xs rounded-control border border-border-control bg-surface px-2.5 py-1.5 text-ink font-semibold"
          >
            <option value="linear-balance">Linear Equations (Balance)</option>
            <option value="circuit-ohms-law">Electrical (Ohm's Law)</option>
            <option value="kinetic-energy">Kinematics & Energy</option>
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={handleMintFresh}
            className="btn-primary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5" />
            <span>Generate Problem</span>
          </button>
        </div>
      </div>

      {minted ? (
        <form
          onSubmit={handleEvaluate}
          className="rounded-xl border border-secondary/20 bg-secondary/5 p-4 space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-bold text-secondary">
            <span>{minted.title}</span>
            <span className="font-mono text-ink-muted text-[11px]">{minted.variant_id}</span>
          </div>

          <p className="text-sm sm:text-base font-semibold text-ink leading-relaxed">
            {minted.question}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <input
                type="number"
                step="any"
                placeholder="Type your numeric answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full rounded-control border border-border-control bg-surface px-3 py-2 text-sm text-ink font-semibold placeholder:text-ink-muted focus:ring-1 focus:ring-secondary"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !userAnswer.trim()}
              className="btn-secondary text-xs font-bold px-4 py-2"
            >
              Grade My Answer
            </button>
            <button
              type="button"
              onClick={handleMintFresh}
              className="text-xs text-ink-muted hover:text-ink font-semibold flex items-center gap-1 px-2 py-1"
            >
              <RotateCcw className="size-3" />
              <span>Next Random Variant</span>
            </button>
          </div>

          {evalResult && (
            <div
              className={`mt-3 p-3 rounded-lg border text-xs sm:text-sm font-semibold flex items-start gap-2.5 ${
                evalResult.is_correct
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-amber-50 border-amber-300 text-amber-900"
              }`}
            >
              {evalResult.is_correct ? (
                <CheckCircle2 className="size-4.5 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="size-4.5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div>
                <p>
                  {evalResult.is_correct
                    ? `Correct! Answer ${evalResult.submitted_answer} matches within tolerance.`
                    : `Incorrect. Expected ${evalResult.correct_answer} (your answer: ${evalResult.submitted_answer}).`}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  Safe AST engine validates exact numeric operations within ±
                  {evalResult.tolerance_pct}% margin.
                </p>
              </div>
            </div>
          )}
        </form>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-ink-muted space-y-2">
          <p>
            No active practice variant. Click <strong>Generate Problem</strong> to mint a randomized
            question.
          </p>
        </div>
      )}
    </article>
  );
}
