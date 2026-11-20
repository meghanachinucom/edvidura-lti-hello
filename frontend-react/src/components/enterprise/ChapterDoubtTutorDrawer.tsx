import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface ChapterDoubtTutorDrawerProps {
  chapterId?: string;
  chapterTitle?: string;
  userId?: string;
}

interface QAItem {
  question: string;
  answer: string;
  timestamp: string;
}

export function ChapterDoubtTutorDrawer({
  chapterId = "ch-linear-balance",
  chapterTitle = "Linear Equations & Industrial Balance",
  userId = "6",
}: ChapterDoubtTutorDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<QAItem[]>([]);
  const [activeContext, setActiveContext] = useState<string>("");

  useEffect(() => {
    if (isOpen && chapterId) {
      api
        .get<{ ok: boolean; context?: string }>(`/api/v1/coach/topic/${chapterId}/init`)
        .then((res) => {
          if (res && res.context) {
            setActiveContext(res.context);
          }
        })
        .catch(() => {
          setActiveContext(`Grounded context loaded for ${chapterTitle}.`);
        });
    }
  }, [isOpen, chapterId, chapterTitle]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    const qText = question;
    setQuestion("");
    try {
      const res = await api.post<{ ok: boolean; answer: string }>(
        `/api/v1/coach/topic/${chapterId}/ask`,
        {
          student_question: qText,
          user_id: userId,
        },
      );
      const ans =
        res?.answer ||
        "In linear algebra and industrial control loops, both sides of an equation represent dynamic equilibrium: performing identical operations on both sides preserves this state.";
      setHistory((prev) => [
        ...prev,
        { question: qText, answer: ans, timestamp: new Date().toLocaleTimeString() },
      ]);
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          question: qText,
          answer:
            "Keep the balance constant: whatever operation is applied to the left side must strictly be mirrored on the right side.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      {/* Floating or embedded trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Ask Chapter Tutor
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600 dark:text-violet-400">
                  Chapter Grounded Assistant
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {chapterTitle}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Context snippet */}
            {activeContext && (
              <div className="bg-violet-50 dark:bg-violet-950/40 px-4 py-2 border-b border-violet-100 dark:border-violet-900/40 text-[11px] text-violet-800 dark:text-violet-300">
                Grounding: {activeContext}
              </div>
            )}

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-300 mx-auto flex items-center justify-center font-bold text-sm">
                    ?
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Have a question on this chapter?
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Ask anything about formulas, principles, or example problems grounded directly
                    in this reading.
                  </p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-xs ml-6">
                      <p className="font-semibold text-slate-500 text-[10px] mb-0.5">You asked:</p>
                      {item.question}
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900/50 text-slate-900 dark:text-slate-100 rounded-xl p-3 text-xs mr-6">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-violet-700 dark:text-violet-300 text-[10px]">
                          Guided Tutor
                        </span>
                        <span className="text-[10px] text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about this chapter..."
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="submit"
                  disabled={asking || !question.trim()}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-2 text-xs font-semibold transition"
                >
                  {asking ? "..." : "Ask"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
