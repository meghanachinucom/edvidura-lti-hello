import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface Question {
  id: string;
  prompt: string;
  options: string[];
}

interface ChatQuizMinterProps {
  userId?: string;
  defaultTopic?: string;
  embedded?: boolean;
}

export function ChatQuizMinter({
  userId = "6",
  defaultTopic = "Linear Equations & Industrial Balance",
  embedded = false,
}: ChatQuizMinterProps) {
  const [topic, setTopic] = useState(defaultTopic);

  useEffect(() => {
    if (defaultTopic) {
      setTopic(defaultTopic);
    }
  }, [defaultTopic]);
  const [loading, setLoading] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score?: number;
    total?: number;
    feedback?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMintQuiz = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnswers({});
    try {
      const res = await api.post<{ ok: boolean; quiz_id: string; questions: Question[] }>(
        "/api/v1/coach/mint-quiz",
        {
          user_id: userId,
          topic,
        },
      );
      if (res && res.quiz_id) {
        setQuizId(res.quiz_id);
        setQuestions(res.questions || []);
      }
    } catch {
      setError("Could not generate practice questions at this moment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId: string, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ ok: boolean; score: number; total: number; feedback: string }>(
        "/api/v1/coach/submit-minted-quiz",
        {
          quiz_id: quizId,
          user_id: userId,
          answers,
        },
      );
      if (res && res.ok) {
        setResult({
          score: res.score,
          total: res.total,
          feedback: res.feedback || "Great work completing your targeted practice check!",
        });
      }
    } catch {
      setError("Could not submit answers.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-1">
            Adaptive Knowledge Verification
          </span>
          <h3 className="text-sm sm:text-base font-bold text-ink font-heading">
            Instant 3-Question Practice Quiz
          </h3>
          <p className="text-xs text-ink-muted">
            Synthesize interactive practice questions tailored to {topic}.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter concept or chapter topic..."
            className="flex-1 rounded-control border border-border bg-page-bg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
          />
          <button
            onClick={handleMintQuiz}
            disabled={loading || !topic.trim()}
            className="btn-primary inline-flex items-center justify-center rounded-control disabled:opacity-50 text-white px-3.5 py-2 text-xs font-semibold transition shrink-0"
          >
            {loading ? "Generating..." : "Generate 3-Q Quiz"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {questions.length > 0 && !result && (
        <div className="space-y-4 pt-2">
          {questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                <span className="font-bold text-primary-600 mr-1.5">{idx + 1}.</span> {q.prompt}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[q.id] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleSelectOption(q.id, oIdx)}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                        isSelected
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-200 font-semibold"
                          : "border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmitQuiz}
              disabled={loading || Object.keys(answers).length < questions.length}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 text-sm font-semibold shadow-sm transition"
            >
              {loading ? "Evaluating..." : "Submit Answers"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Score: {result.score} / {result.total}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
              {Math.round(((result.score || 0) / (result.total || 1)) * 100)}% Mastery
            </span>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-300">{result.feedback}</p>
          <button
            onClick={handleMintQuiz}
            className="mt-2 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline"
          >
            Try Another Practice Set
          </button>
        </div>
      )}
    </div>
  );
}
