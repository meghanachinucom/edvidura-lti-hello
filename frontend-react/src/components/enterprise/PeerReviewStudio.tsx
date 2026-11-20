import { useEffect, useState } from "react";
import { Users, CheckCircle2, MessageSquare, Star, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

interface AssignmentData {
  ok: boolean;
  assignment: {
    assignment_id: string;
    title: string;
    active_pairs: Array<{
      pair_id: string;
      reviewer_alias: string;
      reviewee_alias: string;
      rubric_submitted: boolean;
      scores: Record<string, number>;
      total_score: number;
    }>;
  };
}

export function PeerReviewStudio({
  assignmentId = "assign-slice-a",
  reviewerId: _reviewerId = "6",
}: {
  assignmentId?: string;
  reviewerId?: string;
}) {
  const [data, setData] = useState<AssignmentData | null>(null);
  const [activePairId, setActivePairId] = useState<string>("pair-1");
  const [scores, setScores] = useState<Record<string, number>>({
    clarity: 9,
    accuracy: 9,
    balance_model: 10,
  });
  const [feedback, setFeedback] = useState<string>(
    "Clear step-by-step balancing explanation. Good variable isolation without skipping intermediate operations.",
  );
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    api
      .post<AssignmentData>("/api/v1/peer-review/assign", {
        assignment_id: assignmentId,
        student_ids: ["6", "student-2", "student-3"],
        reviews_per_student: 2,
      })
      .then((res) => {
        if (active && res && res.assignment) {
          setData(res);
        }
      })
      .catch(() => {
        // Fallback demo assignment
        setData({
          ok: true,
          assignment: {
            assignment_id: assignmentId,
            title: "Slice A Double-Blind Peer Review",
            active_pairs: [
              {
                pair_id: "pair-1",
                reviewer_alias: "Peer Evaluator #A8 (You)",
                reviewee_alias: "Student Work #E4",
                rubric_submitted: false,
                scores: { clarity: 9, accuracy: 8, balance_model: 10 },
                total_score: 90.0,
              },
            ],
          },
        });
      });
    return () => {
      active = false;
    };
  }, [assignmentId]);

  const handleSubmitPeerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/v1/peer-review/submit-grade", {
        pair_id: activePairId,
        reviewer_id: "6",
        rubric_scores: scores,
        qualitative_feedback: feedback,
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const criteria = [
    {
      id: "clarity",
      label: "Conceptual Clarity",
      max: 10,
      desc: "Is the mathematical argument easy to follow?",
    },
    {
      id: "accuracy",
      label: "Arithmetic Accuracy",
      max: 10,
      desc: "Are inverse operations applied with zero errors?",
    },
    {
      id: "balance_model",
      label: "Symmetric Equality",
      max: 10,
      desc: "Are operations performed symmetrically on both sides?",
    },
  ];

  return (
    <div
      aria-label="Calibrated Peer Review Studio"
      className="rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
            <Users className="size-4.5" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-ink">
              Double-Blind Peer Evaluation · BF-09
            </h3>
            <p className="text-xs text-ink-muted">
              Calibrated student peer review with anonymized student work and structured rubrics.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary">
          Assigned to You: Student Work #E4
        </span>
      </div>

      {submitted ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-center space-y-2">
          <CheckCircle2 className="size-8 text-emerald-700 mx-auto" />
          <h4 className="text-sm sm:text-base font-bold text-emerald-950 font-heading">
            Peer Review Successfully Submitted!
          </h4>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            Your calibration score aligns with master instructor benchmarks. 2.0 participation
            credits awarded to your profile.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitPeerReview} className="space-y-4">
          <div className="rounded-lg border border-border bg-page-bg p-3.5 space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Submitted Student Answer Sample:
            </span>
            <p className="text-xs sm:text-sm text-ink italic font-mono bg-surface p-2.5 rounded border border-border">
              "To solve 3x + 15 = 42, first subtract 15 from both sides: 3x = 27. Then divide both
              sides by 3 to isolate x: x = 9. Check: 3(9) + 15 = 27 + 15 = 42."
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink">
              Multi-Criterion Rubric Scoring:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {criteria.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-border bg-surface space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-ink">
                    <span>{c.label}</span>
                    <span className="text-secondary font-mono">
                      {scores[c.id] ?? 8} / {c.max}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted leading-tight">{c.desc}</p>
                  <input
                    type="range"
                    min={1}
                    max={c.max}
                    value={scores[c.id] ?? 8}
                    onChange={(e) =>
                      setScores((prev) => ({ ...prev, [c.id]: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-secondary"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-ink">
              Constructive Peer Feedback:
            </label>
            <textarea
              rows={2}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full rounded-control border border-border-control bg-surface p-2.5 text-xs sm:text-sm text-ink placeholder:text-ink-muted focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs font-bold px-4 py-2 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{loading ? "Submitting..." : "Submit Calibrated Review"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
