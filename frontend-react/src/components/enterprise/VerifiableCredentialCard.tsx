import { useState } from "react";
import { api } from "../../lib/api";

interface Credential {
  credential_id: string;
  recipient_name: string;
  course_name: string;
  skills: string[];
  mastery_level: number;
  cryptographic_hash?: string;
  issued_at?: string;
}

export function VerifiableCredentialCard({
  userId = "6",
  studentName = "Alice Nguyen",
  courseName = "Class 8 Mathematics",
}: {
  userId?: string;
  studentName?: string;
  courseName?: string;
}) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMint = async () => {
    setMinting(true);
    setError(null);
    try {
      const res = await api.post<{ ok: boolean; credential: Credential }>(
        "/api/v1/credentials/mint",
        {
          recipient_id: userId,
          recipient_name: studentName,
          course_name: courseName,
          skills: ["Linear Equations", "Industrial Conservation", "Algorithmic Problem Solving"],
          mastery_level: 5,
        },
      );
      if (res && res.credential) {
        setCredential(res.credential);
      }
    } catch {
      setError("Could not mint cryptographic credential.");
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mb-1">
            Tamper-Proof Verification
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-sans">
            Verifiable Digital Credential
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Cryptographically sealed certificates of achievement verifiable anywhere via secure
            hash.
          </p>
        </div>
        {!credential && (
          <button
            onClick={handleMint}
            disabled={minting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 text-xs font-semibold transition"
          >
            {minting ? "Generating Seal..." : "Issue Credential"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {credential ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                Official EdVidura Certificate
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {credential.course_name}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Awarded to:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {credential.recipient_name}
                </span>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                Tier {credential.mastery_level} Mastery
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {credential.skills?.map((sk, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {sk}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-xs">
            <span className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
              ID: {credential.credential_id}
            </span>
            <a
              href={`/receipts/verify?id=${credential.credential_id}`}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Verify Public Receipt &rarr;
            </a>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-500 py-2">
          No credential has been minted for this course milestone yet. Click above to issue a
          cryptographic certificate.
        </div>
      )}
    </div>
  );
}
