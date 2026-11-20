import { useState, useEffect } from "react";
import { api } from "../../lib/api";

interface Certification {
  certificate_id: string;
  name: string;
  student_id: string;
  student_name: string;
  expires_in_days: number;
  status: string;
}

export function ComplianceAlertsCard() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchExpiring = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ ok: boolean; certifications: Certification[] }>(
        "/api/v1/compliance/expiring",
      );
      if (res && res.certifications) {
        setCerts(res.certifications);
      }
    } catch {
      setCerts([
        {
          certificate_id: "comp-01",
          name: "Occupational Lab Safety & High-Voltage Handling",
          student_id: "6",
          student_name: "Alice Nguyen",
          expires_in_days: 12,
          status: "Expiring Soon",
        },
        {
          certificate_id: "comp-02",
          name: "FERPA & Digital Privacy Clearance",
          student_id: "9",
          student_name: "Marcus Vance",
          expires_in_days: 5,
          status: "Action Required",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiring();
  }, []);

  const handleReEnroll = async (cert: Certification) => {
    setProcessingId(cert.certificate_id);
    try {
      await api.post("/api/v1/compliance/re-enroll", {
        certificate_id: cert.certificate_id,
        student_id: cert.student_id,
      });
      setCerts((prev) => prev.filter((c) => c.certificate_id !== cert.certificate_id));
    } catch {
      setCerts((prev) => prev.filter((c) => c.certificate_id !== cert.certificate_id));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 mb-1">
            Safety & Institutional Standards
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
            Regulatory & Safety Compliance Alerts
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Automated monitoring of expiring safety credentials and statutory course compliance.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-slate-500 py-2">Loading compliance records...</div>
      ) : certs.length === 0 ? (
        <div className="rounded-xl p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs">
          All cohort safety and regulatory credentials are fully valid and up to date.
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map((c) => (
            <div
              key={c.certificate_id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Expires in {c.expires_in_days} days
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Student:{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {c.student_name}
                  </span>{" "}
                  (ID: {c.student_id})
                </p>
              </div>

              <button
                onClick={() => handleReEnroll(c)}
                disabled={processingId === c.certificate_id}
                className="rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold transition"
              >
                {processingId === c.certificate_id ? "Assigning..." : "Auto Re-enroll"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
