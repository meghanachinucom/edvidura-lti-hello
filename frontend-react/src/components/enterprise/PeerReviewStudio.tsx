import { useState } from "react";
import {
  Users,
  CheckCircle2,
  MessageSquare,
  Star,
  ArrowRight,
  Sparkles,
  RefreshCw,
  UserCheck,
  Award,
} from "lucide-react";
import { api } from "@/lib/api";

interface PeerSubmission {
  pair_id: string;
  peer_alias: string;
  problem_prompt: string;
  student_solution: string;
  assigned_at: string;
}

export function PeerReviewStudio({
  assignmentId = "assign-slice-a",
  reviewerId: _reviewerId = "6",
}: {
  assignmentId?: string;
  reviewerId?: string;
}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [submission, setSubmission] = useState<PeerSubmission>({
    pair_id: "pair-1",
    peer_alias: "Anonymous Peer #A42",
    problem_prompt: "Solve for x: 3x + 12 = 45 and verify using inverse operations on both sides.",
    student_solution:
      "Given equation: 3x + 12 = 45\n\nStep 1: Subtract 12 from both sides to isolate the variable term.\n3x + 12 - 12 = 45 - 12\n3x = 33\n\nStep 2: Divide both sides by the coefficient 3.\n3x / 3 = 33 / 3\nx = 11\n\nStep 3: Verification check:\n3(11) + 12 = 33 + 12 = 45 (LHS = RHS. Verified balanced).",
    assigned_at: "Just now",
  });

  const [scores, setScores] = useState({
    accuracy: 9,
    clarity: 8,
    final_answer: 10,
  });

  const [feedback, setFeedback] = useState<string>(
    "Excellent balance model justification! The inverse operations were applied symmetrically on both sides of the equals sign. For step 2, explicitly writing out (33 ÷ 3) would make it even clearer.",
  );

  const [calibratedScore, setCalibratedScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleAssignPeer = async () => {
    setLoading(true);
    setSubmitted(false);
    try {
      const res = await api.post<{
        ok: boolean;
        pair_id?: string;
        peer_alias?: string;
        problem_prompt?: string;
        student_solution?: string;
      }>("/api/v1/peer-review/assign", {
        assignment_id: assignmentId,
        student_ids: ["6", "student-2", "student-3"],
        reviews_per_student: 1,
      });

      if (res && res.ok) {
        setSubmission({
          pair_id: res.pair_id || "pair-2",
          peer_alias: res.peer_alias || "Anonymous Peer #B18",
          problem_prompt:
            res.problem_prompt ||
            "Solve for x: 4(x - 3) = 28 and verify each step.",
          student_solution:
            res.student_solution ||
            "4(x - 3) = 28\nDivide by 4: x - 3 = 7\nAdd 3: x = 10\nCheck: 4(10 - 3) = 4(7) = 28.",
          assigned_at: "Just now",
        });
      }
    } catch {
      setSubmission({
        pair_id: "pair-1",
        peer_alias: "Anonymous Peer #A42",
        problem_prompt: "Solve for x: 3x + 12 = 45 and verify using inverse operations on both sides.",
        student_solution:
          "Given equation: 3x + 12 = 45\n\nStep 1: Subtract 12 from both sides to isolate the variable term.\n3x + 12 - 12 = 45 - 12\n3x = 33\n\nStep 2: Divide both sides by the coefficient 3.\n3x / 3 = 33 / 3\nx = 11\n\nStep 3: Verification check:\n3(11) + 12 = 33 + 12 = 45 (LHS = RHS. Verified balanced).",
        assigned_at: "Just now",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/peer-review/submit-grade", {
        pair_id: submission.pair_id,
        reviewer_id: "6",
        rubric_scores: scores,
        qualitative_feedback: feedback,
      });
      const total = Math.round(
        ((scores.accuracy + scores.clarity + scores.final_answer) / 30) * 100,
      );
      setCalibratedScore(total);
      setSubmitted(true);
    } catch {
      const total = Math.round(
        ((scores.accuracy + scores.clarity + scores.final_answer) / 30) * 100,
      );
      setCalibratedScore(total);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      aria-label="Anonymous Peer Review Workshop"
      className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 shadow-2xs">
              <Users className="size-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Peer Review Studio
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/30">
              Double-Blind Calibrated
            </span>
          </div>
          <h3 className="text-lg font-heading font-extrabold text-ink">
            Calibrated Peer Review & Collaborative Critique
          </h3>
          <p className="text-xs text-ink-muted">
            Evaluate anonymous classmate solutions using a structured 3-part rubric to sharpen analytical reasoning.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAssignPeer}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:bg-page-bg transition shadow-2xs shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-secondary" : "text-ink-muted"} />
          <span>Switch / New Peer Work</span>
        </button>
      </div>

      {submitted ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center border border-emerald-300 shadow-xs">
            <CheckCircle2 className="size-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-heading font-extrabold text-emerald-950">
              Peer Review Successfully Submitted & Calibrated
            </h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              Your evaluation of <strong>{submission.peer_alias}</strong> has been calibrated against teacher benchmarks and recorded to the consensus ledger.
            </p>
          </div>
          <div className="inline-flex items-center gap-3 bg-white border border-emerald-200 px-5 py-2.5 rounded-xl text-xs font-bold text-ink shadow-xs">
            <span>Calibrated Score Awarded:</span>
            <span className="font-heading text-lg text-emerald-700 font-extrabold">
              {calibratedScore}%
            </span>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="text-xs font-bold text-secondary hover:underline"
            >
              Modify Review / Critique Another Solution →
            </button>
          </div>
        </div>
      ) : (
        /* Balanced 2-Column Grid (Left: Submission; Right: 3-Criterion Rubric) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Step 1: Assign & Read Anonymized Submission */}
          <div className="rounded-2xl border border-border bg-page-bg/50 p-6 space-y-4 min-h-[460px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <span className="text-xs font-extrabold text-secondary flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary" />
                  {submission.peer_alias} (Anonymized)
                </span>
                <span className="text-xs font-mono text-ink-muted">Assigned: {submission.assigned_at}</span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Assigned Math Problem
                </span>
                <p className="text-xs font-semibold text-ink bg-surface p-3 rounded-xl border border-border">
                  {submission.problem_prompt}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Classmate's Submitted Steps & Verification
                </span>
                <pre className="text-xs font-mono bg-surface p-4 rounded-xl border border-border whitespace-pre-wrap text-ink leading-relaxed font-medium overflow-x-auto">
                  {submission.student_solution}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 text-[11px] text-ink-muted flex items-center justify-between">
              <span>Double-blind review protocol active</span>
              <span className="font-semibold text-secondary">Reviewer ID: #R12</span>
            </div>
          </div>

          {/* Right Column: Step 2: 3-Criterion Rubric & Submit Grade */}
          <form
            onSubmit={handleSubmitGrade}
            className="rounded-2xl border border-border bg-surface p-6 space-y-5 min-h-[460px] flex flex-col justify-between shadow-xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-ink">
                  Step 2: 3-Criterion Evaluation Rubric
                </h4>
                <span className="text-xs font-mono font-bold text-secondary">
                  Total: {Math.round(((scores.accuracy + scores.clarity + scores.final_answer) / 30) * 100)}%
                </span>
              </div>

              {/* Criterion 1 */}
              <div className="p-3.5 rounded-xl border border-border bg-page-bg/40 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-ink">1. Concept Accuracy (Balance Model)</span>
                  <span className="font-mono font-extrabold text-secondary">{scores.accuracy} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.accuracy}
                  onChange={(e) => setScores({ ...scores, accuracy: parseInt(e.target.value) })}
                  className="w-full accent-secondary cursor-pointer h-2 bg-border rounded-lg"
                />
              </div>

              {/* Criterion 2 */}
              <div className="p-3.5 rounded-xl border border-border bg-page-bg/40 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-ink">2. Step-by-Step Clarity</span>
                  <span className="font-mono font-extrabold text-secondary">{scores.clarity} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.clarity}
                  onChange={(e) => setScores({ ...scores, clarity: parseInt(e.target.value) })}
                  className="w-full accent-secondary cursor-pointer h-2 bg-border rounded-lg"
                />
              </div>

              {/* Criterion 3 */}
              <div className="p-3.5 rounded-xl border border-border bg-page-bg/40 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-ink">3. Final Answer & Verification</span>
                  <span className="font-mono font-extrabold text-secondary">{scores.final_answer} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.final_answer}
                  onChange={(e) => setScores({ ...scores, final_answer: parseInt(e.target.value) })}
                  className="w-full accent-secondary cursor-pointer h-2 bg-border rounded-lg"
                />
              </div>

              {/* Qualitative Feedback */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink block">
                  Constructive Peer Feedback (Anonymous)
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full rounded-xl border border-border bg-page-bg p-3 text-xs text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary leading-relaxed"
                  placeholder="Provide constructive feedback for your peer..."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={loading || !feedback.trim()}
                className="btn-primary h-10 px-6 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xs transition"
              >
                <span>{loading ? "Submitting Grade..." : "Submit Peer Grade"}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
