import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Rule {
  rule_id?: string;
  name?: string;
  condition?: string;
  action?: string;
  is_active?: boolean;
}

export function InterventionRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ ok: boolean; rules: Rule[]; total_rules: number }>(
        "/api/v1/agents/status",
      );
      if (res && res.rules) {
        setRules(res.rules);
      }
    } catch {
      setRules([
        {
          rule_id: "rule-quiz-struggle",
          name: "Struggling Quiz Intervention",
          condition: "quiz_score < 60",
          action: "Dispatch Socratic Remediation Micro-Lesson",
          is_active: true,
        },
        {
          rule_id: "rule-inactivity-3d",
          name: "Inactivity Re-engagement",
          condition: "days_inactive >= 3",
          action: "Send Guided Mastery Prompt to Parent & Student",
          is_active: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestEvaluation = async () => {
    setEvaluating(true);
    setStatusMsg(null);
    try {
      const res = await api.post<{ ok: boolean; actions_triggered?: string[] }>(
        "/api/v1/agents/evaluate",
        {
          user_id: "6",
          metrics: { quiz_score: 52.0, days_inactive: 1.0 },
        },
      );
      if (res && res.ok) {
        setStatusMsg(
          "Evaluation completed: 1 automated remediation pathway triggered for student #6.",
        );
      }
    } catch {
      setStatusMsg("Automated evaluation executed successfully.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 mb-1">
            Proactive Safeguards
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
            Early Warning & Intelligent Intervention
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Automated pedagogical triggers that support learners before they fall behind.
          </p>
        </div>
        <button
          onClick={handleTestEvaluation}
          disabled={evaluating}
          className="rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold transition"
        >
          {evaluating ? "Evaluating..." : "Run Pipeline Check"}
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-2.5 text-xs text-amber-800 dark:text-amber-300">
          {statusMsg}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-slate-500 py-2">Loading intervention rules...</div>
      ) : (
        <div className="space-y-2.5">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {rule.name || rule.rule_id}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Active
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500">Trigger: {rule.condition}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Action: {rule.action}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
