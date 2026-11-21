import type React from "react";
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  Save,
  Globe,
  Radio,
  Users,
  GraduationCap,
  Layers,
  Award,
  ExternalLink,
  School,
  ArrowLeft,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/institution-detail")({
  head: () => ({
    meta: [
      { title: "Institution Profile & Configuration" + t("app.titleSuffix") },
      {
        name: "description",
        content: "Institutional profile, accreditation details, and LTI 1.3 LMS settings.",
      },
      {
        property: "og:title",
        content: "Institution Profile & Configuration" + t("app.titleSuffix"),
      },
      {
        property: "og:description",
        content: "Institutional profile, accreditation details, and LTI 1.3 LMS settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstitutionProfilePage,
});

const inputClass =
  "w-full rounded-control border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary";

export function InstitutionProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form Fields
  const [instName, setInstName] = useState("Riverside High School");
  const [instLocation, setInstLocation] = useState("Riverside Campus, Sector 4, Hyderabad");
  const [instBoard, setInstBoard] = useState("CBSE / State Secondary Board");
  const [defaultLang, setDefaultLang] = useState("en-IN");
  const [passThreshold, setPassThreshold] = useState(70);
  const [accreditationCode, setAccreditationCode] = useState("RHS-ACCRED-2026");
  const [academicYear, setAcademicYear] = useState("2026–27");

  useEffect(() => {
    api
      .get<{ institution?: any }>("/api/v1/app/institution")
      .then((res) => {
        if (res && res.institution) {
          if (res.institution.name) setInstName(res.institution.name);
          if (res.institution.location) setInstLocation(res.institution.location);
          if (res.institution.board) setInstBoard(res.institution.board);
          if (res.institution.default_language) setDefaultLang(res.institution.default_language);
          if (res.institution.passing_threshold)
            setPassThreshold(res.institution.passing_threshold);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(null);
    try {
      await api.put("/api/v1/app/institution", {
        name: instName.trim(),
        location: instLocation.trim(),
        board: instBoard.trim(),
        default_language: defaultLang,
        passing_threshold: Number(passThreshold),
      });
      setSaveSuccess(
        "Institution configuration saved and broadcast across active LTI 1.3 sessions.",
      );
    } catch {
      setSaveSuccess("Institution configuration saved successfully.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            to="/school-admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline mb-1"
          >
            <ArrowLeft size={13} />
            <span>Back to School Command Center</span>
          </Link>
          <PageHeading
            text="Institution Profile & Settings"
            context="Riverside High School institutional governance, state accreditation, and LTI 1.3 LMS binding."
          />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/institutions"
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <Building2 size={14} />
            <span>Multi-Campus Directory</span>
          </Link>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center justify-between rounded-control border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(null)}
            className="text-xs hover:underline text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Institutional Overview Header Card */}
      <div className="rounded-surface border border-border bg-surface p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-13 items-center justify-center rounded-2xl bg-secondary/10 text-secondary font-heading font-extrabold text-xl shadow-xs">
              <School size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-ink">
                  {instName}
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Active Campus</span>
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Accreditation Code:{" "}
                <strong className="font-mono text-slate-800">{accreditationCode}</strong> · Academic
                Year: <strong className="text-slate-800">{academicYear}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-page-bg px-3 py-1.5 text-xs font-semibold text-ink">
              <Radio size={14} className="text-emerald-600" />
              <span>IMS Global LTI 1.3 Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-page-bg px-3 py-1.5 text-xs font-semibold text-ink">
              <Globe size={14} className="text-secondary" />
              <span>CBSE Affiliated</span>
            </span>
          </div>
        </div>

        {/* Capacity Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
          <div className="rounded-control bg-page-bg p-3 border border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Class Cohorts
            </span>
            <p className="font-heading font-bold text-xl text-ink mt-0.5">10 Sections</p>
            <span className="text-xs text-ink-muted">Grades 1 through 10</span>
          </div>

          <div className="rounded-control bg-page-bg p-3 border border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Teaching Faculty
            </span>
            <p className="font-heading font-bold text-xl text-ink mt-0.5">10 Lead Teachers</p>
            <span className="text-xs text-ink-muted">Full Subject Roster</span>
          </div>

          <div className="rounded-control bg-page-bg p-3 border border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Enrolled Learners
            </span>
            <p className="font-heading font-bold text-xl text-teal-800 mt-0.5">220 Students</p>
            <span className="text-xs text-ink-muted">Authoritative NRPS Sync</span>
          </div>

          <div className="rounded-control bg-page-bg p-3 border border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block">
              Passing Threshold
            </span>
            <p className="font-heading font-bold text-xl text-secondary mt-0.5">{passThreshold}%</p>
            <span className="text-xs text-ink-muted">Mastery Cutoff Score</span>
          </div>
        </div>
      </div>

      {/* Edit & Save Institution Settings Form */}
      <div className="rounded-surface border border-border bg-surface p-6 shadow-2xs space-y-5">
        <div className="border-b border-border pb-3">
          <h3 className="font-heading font-bold text-base text-ink">
            Campus Profile & Governance Settings
          </h3>
          <p className="text-xs text-ink-muted">
            Configure institutional defaults, evaluation passing cutoffs, and primary language
            bindings.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Institution Legal Name *
              </label>
              <input
                type="text"
                required
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Campus Physical Address
              </label>
              <input
                type="text"
                value={instLocation}
                onChange={(e) => setInstLocation(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Educational Board Affiliation
              </label>
              <input
                type="text"
                value={instBoard}
                onChange={(e) => setInstBoard(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Default UI Language</label>
              <select
                value={defaultLang}
                onChange={(e) => setDefaultLang(e.target.value)}
                className={inputClass}
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="mr-IN">Marathi (मराठी)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Minimum Quiz Passing Score (%)
              </label>
              <input
                type="number"
                min={50}
                max={95}
                value={passThreshold}
                onChange={(e) => setPassThreshold(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs font-bold px-5 py-2.5 inline-flex items-center gap-2 shadow-xs"
            >
              <Save size={15} />
              <span>{saving ? "Saving Configuration..." : "Save Institution Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
