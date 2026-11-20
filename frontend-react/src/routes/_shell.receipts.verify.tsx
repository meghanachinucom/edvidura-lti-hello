import { useId, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { findReceipt, type Receipt } from "@/data/receipts";
import { mockState } from "@/data/mockState";
import { formatIST } from "@/lib/time";
import { api } from "@/lib/api";

// SH-04 Receipt verify.
export const Route = createFileRoute("/_shell/receipts/verify")({
  head: () => ({
    meta: [
      { title: t("SH-04.title") + t("app.titleSuffix") },
      { name: "description", content: t("SH-04.lead") },
      { property: "og:title", content: t("SH-04.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("SH-04.lead") },
    ],
  }),
  component: ReceiptVerify,
});

const s = (k: string) => t(`SH-04.${k}`);

type Outcome =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "valid"; receipt: Receipt }
  | { kind: "invalid" };

function ReceiptVerify() {
  const id = useId();
  const [text, setText] = useState("");
  const [emptyError, setEmptyError] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  const verifyCode = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();
    if (!trimmed) {
      setEmptyError(true);
      setOutcome({ kind: "idle" });
      return;
    }
    setEmptyError(false);
    setOutcome({ kind: "checking" });

    // 1. Check Backend Enterprise Verifiable Credentials API
    try {
      const res = await api.get<{ valid: boolean; credential?: any }>(
        `/api/v1/credentials/verify/${trimmed}`,
      );
      if (res && res.valid) {
        const cred = res.credential || {};
        setOutcome({
          kind: "valid",
          receipt: {
            text: trimmed,
            learnerName: cred.recipient_name || "Alice Nguyen",
            quizTitle: cred.course_name || "Class 8 Mathematics (Mastery Level 5)",
            issuedAt: cred.issued_at || new Date().toISOString(),
            score: 5,
            kind: "graded",
            moodleStatus: "sent",
          },
        });
        return;
      }
    } catch {
      // Fall through to local receipt database check
    }

    // 2. Local receipt check
    const forced = mockState.receiptVerify.result;
    const match = findReceipt(trimmed);
    if (forced === "invalid" || (forced === "auto" && !match)) {
      setOutcome({ kind: "invalid" });
    } else {
      setOutcome({
        kind: "valid",
        receipt: match ?? findReceipt("EDV1.SITI.7Q4M-WARM-UP.SEAL-3F9A2C")!,
      });
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const paramId = sp.get("id") || sp.get("cid");
      if (paramId) {
        setText(paramId);
        verifyCode(paramId);
      }
    }
  }, []);

  const verify = () => {
    verifyCode(text);
  };

  const checking = outcome.kind === "checking";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="rounded-surface border border-border bg-surface p-5 tablet:p-6">
        <PageHeading text={s("title")} />
        <p className="mt-2 text-ink-muted">{s("lead")}</p>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
          noValidate
        >
          <label htmlFor={`${id}-r`} className="block font-semibold text-ink">
            {s("label")}
          </label>
          <textarea
            id={`${id}-r`}
            rows={7}
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              if (emptyError) setEmptyError(false);
            }}
            aria-invalid={emptyError || undefined}
            aria-describedby={emptyError ? `${id}-e` : undefined}
            className={`mt-2 w-full rounded-surface bg-surface p-3 font-mono text-ink border-control ${emptyError ? "border-error" : ""}`}
          />
          {emptyError && (
            <p id={`${id}-e`} role="alert" className="mt-2 flex items-center gap-2 text-error">
              <XCircle aria-hidden size={18} className="shrink-0" />
              {s("empty")}
            </p>
          )}
          <button
            type="submit"
            disabled={checking}
            className="btn-primary mt-4 disabled:opacity-60"
          >
            {checking ? s("checking") : s("verify")}
          </button>
        </form>

        <section aria-label={s("resultLabel")} aria-live="polite" className="mt-6">
          {checking && (
            <p role="status" className="text-ink-muted">
              {s("checking")}
            </p>
          )}
          {outcome.kind === "invalid" && (
            <p
              role="status"
              className="flex items-center gap-2 text-[18px] font-semibold text-error"
            >
              <XCircle aria-hidden className="shrink-0" />
              {s("invalid")}
            </p>
          )}
          {outcome.kind === "valid" && (
            <div role="status">
              <p className="flex items-center gap-2 text-[18px] font-semibold text-success">
                <CheckCircle2 aria-hidden className="shrink-0" />
                {s("valid")}
              </p>
              <dl className="mt-4 grid gap-x-6 gap-y-2 tablet:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="font-semibold text-ink-muted">{s("learner")}</dt>
                <dd className="text-ink">{outcome.receipt.learnerName}</dd>
                <dt className="font-semibold text-ink-muted">{s("quiz")}</dt>
                <dd className="text-ink">{outcome.receipt.quizTitle}</dd>
                <dt className="font-semibold text-ink-muted">{s("issued")}</dt>
                <dd className="text-ink">{formatIST(outcome.receipt.issuedAt)}</dd>
                <dt className="font-semibold text-ink-muted">{s("score")}</dt>
                <dd className="text-ink">{t("shared.scoreOf", { n: outcome.receipt.score })}</dd>
              </dl>
              <p className="mt-3 text-ink">
                {t(`shared.moodleStatus.${outcome.receipt.moodleStatus}`)}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
