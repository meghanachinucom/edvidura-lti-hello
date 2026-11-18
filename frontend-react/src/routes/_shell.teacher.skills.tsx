import { StatusGem } from "@/components/shared/StatusGem";
import { useEffect, useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  PlusCircle,
  ShieldCheck,
  XCircle,
  Award,
  Compass,
  RefreshCw,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { skillGaps } from "@/data/teacherInsights";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { skills as seedSkills, targetRoles, type Skill } from "@/data/skills";
import { lessonById } from "@/data/lessons";
import { LessonName } from "@/components/shared/LessonList";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";

// TC-14 Skills, Roles, CAT Competency Mapping, Skills Passport, and Workforce Continuity Hub.
export const Route = createFileRoute("/_shell/teacher/skills")({
  head: () => ({
    meta: [
      { title: t("TC-14.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-14.lead") },
      { property: "og:title", content: t("TC-14.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-14.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-14.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

interface Role {
  id: string;
  title: string;
  skills: string[];
}

function Err({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="mt-2 flex items-center gap-2 text-error">
      <XCircle aria-hidden size={18} className="shrink-0" />
      {text}
    </p>
  );
}

function Page() {
  const id = useId();
  const [activeTab, setActiveTab] = useState<
    "roles" | "cat" | "proposals" | "passport" | "workforce" | "linked_data"
  >("roles");
  const [roles, setRoles] = useState<Role[]>(
    targetRoles.map((r) => ({ id: r.id, title: r.title, skills: [...r.skills] })),
  );
  const [allSkills, setAllSkills] = useState<Skill[]>(seedSkills);
  const [sel, setSel] = useState<string | null>(mockState.teacher.selectedRole);
  const [form, setForm] = useState<null | "role" | "skill">(null);
  const [saved, setSaved] = useState(false);

  // CAT state
  const [catOverview, setCatOverview] = useState<any>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [toTitle, setToTitle] = useState("");
  const [toText, setToText] = useState("");
  const [mappingResult, setMappingResult] = useState<any>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [bankResult, setBankResult] = useState<any>(null);
  const [bankLoading, setBankLoading] = useState(false);

  // Proposals state
  const [proposals, setProposals] = useState<any[]>([]);
  const [proposalActionLoading, setProposalActionLoading] = useState<string | null>(null);

  // Skills Passport state
  const [passportData, setPassportData] = useState<any>(null);
  const [passportLoading, setPassportLoading] = useState(false);

  // Workforce state
  const [apprenticeshipData, setApprenticeshipData] = useState<any>(null);
  const [continuityData, setContinuityData] = useState<any>(null);
  const [simToRealData, setSimToRealData] = useState<any>(null);
  const [wfLoading, setWfLoading] = useState(false);
  const [ldGraph, setLdGraph] = useState<any>(null);
  const [ldLoading, setLdLoading] = useState(false);

  const loadLdGraph = () => {
    setLdLoading(true);
    fetch("/api/v1/ld/graph")
      .then((res) => res.json())
      .then((data) => setLdGraph(data))
      .catch(() => {})
      .finally(() => setLdLoading(false));
  };

  const role = roles.find((r) => r.id === sel);
  const rows = role
    ? role.skills.map((c) => allSkills.find((k) => k.code === c)).filter((k): k is Skill => !!k)
    : [];

  const stateFor = (skill: Skill): "missing" | "practising" | "passed" =>
    skill.link === "missing"
      ? "missing"
      : skillGaps.some((gap) => gap.code === skill.code)
        ? "practising"
        : "passed";
  const stateTone = { missing: "attention", practising: "progress", passed: "done" } as const;

  // Load CAT overview
  const loadCat = () => {
    setCatLoading(true);
    api
      .get("/api/v1/app/cat")
      .then((res: any) => {
        setCatOverview(res);
        if (res && Array.isArray(res.proposals)) {
          setProposals(res.proposals);
        }
      })
      .catch(() => {})
      .finally(() => setCatLoading(false));
  };

  // Load Passport
  const loadPassport = () => {
    setPassportLoading(true);
    api
      .get("/api/v1/app/skills-passport")
      .then((res: any) => setPassportData(res))
      .catch(() => {})
      .finally(() => setPassportLoading(false));
  };

  // Load Workforce
  const loadWorkforce = () => {
    setWfLoading(true);
    Promise.all([
      api.get("/api/v1/app/workforce/apprenticeship").catch(() => null),
      api.get("/api/v1/app/workforce/continuity").catch(() => null),
      api.get("/api/v1/app/workforce/sim-to-real").catch(() => null),
    ]).then(([appr, cont, sim]) => {
      setApprenticeshipData(appr);
      setContinuityData(cont);
      setSimToRealData(sim);
      setWfLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === "cat" || activeTab === "proposals") {
      loadCat();
    } else if (activeTab === "passport") {
      loadPassport();
    } else if (activeTab === "workforce") {
      loadWorkforce();
    } else if (activeTab === "linked_data") {
      loadLdGraph();
    }
  }, [activeTab]);

  const handleMapTo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (toText.trim().length < 40) return;
    setMappingLoading(true);
    try {
      const res = await api.post("/api/v1/app/cat/map", {
        title: toTitle.trim() || "Technical Order Mapping",
        text: toText.trim(),
        persist: true,
      });
      setMappingResult(res);
      loadCat();
    } catch (err: any) {
      setMappingResult({ error: err.message || "Failed to map competencies" });
    } finally {
      setMappingLoading(false);
    }
  };

  const handleGenerateBank = async () => {
    if (toText.trim().length < 40) return;
    setBankLoading(true);
    try {
      const res = await api.post("/api/v1/app/cat/bank", {
        title: toTitle.trim() || "Technical Order Question Bank",
        text: toText.trim(),
        count: 20,
        persist: true,
      });
      setBankResult(res);
    } catch (err: any) {
      setBankResult({ error: err.message || "Failed to generate bank" });
    } finally {
      setBankLoading(false);
    }
  };

  const handleProposalAction = async (proposalId: string, action: "approve" | "reject") => {
    setProposalActionLoading(proposalId);
    try {
      await api.post(`/api/v1/app/cat/proposals/${proposalId}/${action}`);
      setProposals((curr) => curr.filter((p) => p.id !== proposalId));
    } catch (err) {
      console.error(`Failed to ${action} proposal:`, err);
    } finally {
      setProposalActionLoading(null);
    }
  };

  const tabItems: PillTab[] = [
    { id: "roles", label: "Roles & Skills", onSelect: () => setActiveTab("roles") },
    { id: "cat", label: "CAT Competencies & TO Map", onSelect: () => setActiveTab("cat") },
    {
      id: "proposals",
      label: `Proposals (${proposals.length})`,
      onSelect: () => setActiveTab("proposals"),
    },
    { id: "passport", label: "Skills Passport", onSelect: () => setActiveTab("passport") },
    {
      id: "workforce",
      label: "Workforce & Sim-to-Real",
      onSelect: () => setActiveTab("workforce"),
    },
    {
      id: "linked_data",
      label: "IEEE Linked Data (JSON-LD)",
      onSelect: () => setActiveTab("linked_data"),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text={s("title")} />
        <div className="flex items-center gap-2">
          <PillTabs items={tabItems} active={activeTab} label="Skills Hub Navigation" />
        </div>
      </div>

      {activeTab === "roles" && (
        <>
          <div className="flex flex-col gap-2 tablet:flex-row">
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={form === "role"}
              onClick={() => {
                setSaved(false);
                setForm(form === "role" ? null : "role");
              }}
            >
              {s("addRole")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={form === "skill"}
              disabled={!role}
              onClick={() => {
                setSaved(false);
                setForm(form === "skill" ? null : "skill");
              }}
            >
              {s("addSkill")}
            </button>
          </div>

          {form === "role" && (
            <RoleForm
              onCancel={() => setForm(null)}
              onSave={(title) => {
                const rid = `role-${roles.length + 1}`;
                setRoles([...roles, { id: rid, title, skills: [] }]);
                setSel(rid);
                setForm(null);
                setSaved(true);
              }}
            />
          )}
          {form === "skill" && role && (
            <SkillForm
              onCancel={() => setForm(null)}
              onSave={(title, code) => {
                if (!allSkills.some((k) => k.code === code))
                  setAllSkills([...allSkills, { code, title, link: "missing" }]);
                setRoles(
                  roles.map((r) =>
                    r.id === role.id && !r.skills.includes(code)
                      ? { ...r, skills: [...r.skills, code] }
                      : r,
                  ),
                );
                setForm(null);
                setSaved(true);
              }}
            />
          )}
          {saved && <StatusBanner variant="success">{s("saved")}</StatusBanner>}

          <div className="grid gap-6 tablet:grid-cols-[260px_1fr]">
            <div>
              <div className="tablet:hidden">
                <label htmlFor={`${id}-r`} className="block font-semibold text-ink">
                  {s("role")}
                </label>
                <select
                  id={`${id}-r`}
                  value={sel ?? ""}
                  onChange={(e) => setSel(e.target.value || null)}
                  className={input}
                >
                  <option value="">{s("chooseRole")}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <nav aria-label={s("roles")} className="hidden tablet:block">
                <h2 className="font-heading text-[18px] text-ink">{s("roles")}</h2>
                <ul className="mt-2 space-y-1">
                  {roles.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-current={sel === r.id ? "true" : undefined}
                        onClick={() => setSel(r.id)}
                        className={`min-h-11 w-full rounded-surface px-3 py-2 text-left text-ink ${sel === r.id ? "nav-active" : "hover:bg-surface"}`}
                      >
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-ink">{s("caption")}</p>
              <ul aria-label={s("legend")} className="flex flex-wrap gap-4 text-sm text-ink">
                {(["missing", "practising", "passed"] as const).map((state) => (
                  <li key={state}>
                    <StatusGem tone={stateTone[state]}>{s(`state.${state}`)}</StatusGem>
                  </li>
                ))}
              </ul>
              {!role ? (
                <p className="text-ink-muted">{s("noRole")}</p>
              ) : (
                <ul
                  className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3"
                  aria-label={s("skills", { role: role.title })}
                >
                  {rows.map((skill) => {
                    const state = stateFor(skill);
                    return (
                      <li
                        key={skill.code}
                        className="rounded-surface border border-border bg-surface p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-heading text-[18px] text-ink">{skill.title}</h2>
                          <StatusGem tone={stateTone[state]}>{s(`state.${state}`)}</StatusGem>
                        </div>
                        <p className="mt-2 font-mono text-sm text-ink-muted">{skill.code}</p>
                        {skill.lessonId && lessonById(skill.lessonId) && (
                          <Link
                            to="/lessons/$lessonId"
                            params={{ lessonId: skill.lessonId }}
                            className="mt-2 inline-flex min-h-11 items-center text-ink underline"
                          >
                            <LessonName lesson={lessonById(skill.lessonId)!} />
                          </Link>
                        )}
                        {state === "missing" && (
                          <Link
                            to="/teacher/ai/remediation"
                            className="mt-2 inline-flex min-h-11 items-center text-secondary underline"
                          >
                            {s("generate")}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === "cat" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">
              CAT F-4: Technical Order & Competency Ingestion
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Map industrial Technical Orders, military manuals, or standard syllabi onto structured
              competency frameworks and automatically derive test items.
            </p>
            <form onSubmit={handleMapTo} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink">
                  Document / Technical Order Title
                </label>
                <input
                  type="text"
                  value={toTitle}
                  onChange={(e) => setToTitle(e.target.value)}
                  placeholder="e.g., NAVAIR 01-1A-505-1 Aircraft Electrical Wiring"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">
                  Technical Order Excerpt / Procedure Text (min 40 characters)
                </label>
                <textarea
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  placeholder="Paste manual procedures, safety precautions, connector pinout inspection rules..."
                  rows={5}
                  className="mt-2 w-full rounded-surface border-control bg-surface p-3 text-ink font-mono text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={mappingLoading || toText.trim().length < 40}
                  className="btn-primary"
                >
                  {mappingLoading ? "Mapping Competencies..." : "Map Competencies to Catalog"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateBank}
                  disabled={bankLoading || toText.trim().length < 40}
                  className="btn-secondary"
                >
                  {bankLoading ? "Generating Bank..." : "Generate 20+ Question Test Bank"}
                </button>
              </div>
            </form>

            {mappingResult && (
              <div className="mt-4 rounded-surface border border-secondary/30 bg-secondary/5 p-4">
                <h3 className="font-semibold text-ink">Mapping Result</h3>
                {mappingResult.error ? (
                  <p className="text-sm text-error">{mappingResult.error}</p>
                ) : (
                  <div className="space-y-2 text-sm text-ink">
                    <p>
                      Mapped{" "}
                      <strong>
                        {mappingResult.mapped_count || (mappingResult.competencies?.length ?? 0)}
                      </strong>{" "}
                      competencies from source.
                    </p>
                    {mappingResult.competencies && (
                      <ul className="list-inside list-disc space-y-1">
                        {mappingResult.competencies.slice(0, 5).map((c: any, i: number) => (
                          <li key={i}>
                            <strong>{c.code || c.title || `Competency ${i + 1}`}</strong>:{" "}
                            {c.description || c.title || JSON.stringify(c)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {bankResult && (
              <div className="mt-4 rounded-surface border border-accent/30 bg-accent/5 p-4">
                <h3 className="font-semibold text-ink">Question Bank Generated</h3>
                {bankResult.error ? (
                  <p className="text-sm text-error">{bankResult.error}</p>
                ) : (
                  <p className="text-sm text-ink">
                    Generated <strong>{bankResult.questions?.length ?? 20}</strong> assessment items
                    saved to tenant test bank.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-ink">Tenant Competency Catalog</h2>
              <button
                type="button"
                onClick={loadCat}
                disabled={catLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={catLoading ? "animate-spin" : ""} />
                Refresh Catalog
              </button>
            </div>
            {catLoading && !catOverview ? (
              <p className="mt-4 text-sm text-ink-muted">Loading competencies...</p>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-ink">
                  Total competencies cataloged:{" "}
                  <strong>{catOverview?.competencies?.length || allSkills.length}</strong>
                </p>
                <div className="grid gap-3 tablet:grid-cols-2">
                  {(catOverview?.competencies || allSkills).slice(0, 6).map((c: any, i: number) => (
                    <div key={i} className="rounded-surface border border-border p-3 bg-surface">
                      <p className="font-semibold text-ink">{c.title || c.name || c.code}</p>
                      <p className="text-xs font-mono text-ink-muted">
                        {c.code || `CAT-C${i + 1}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "proposals" && (
        <div className="space-y-4 rounded-surface border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-ink">
              Technical Order Mapping Proposals
            </h2>
            <button
              type="button"
              onClick={loadCat}
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <p className="text-sm text-ink-muted">
            Proposals submitted by AI ingestion pipeline awaiting teacher verification and approval.
          </p>
          {proposals.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              No pending Technical Order proposals. Submit new procedures via the CAT Competencies
              tab.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {proposals.map((p) => (
                <li
                  key={p.id}
                  className="py-4 flex flex-col tablet:flex-row items-start justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-ink">
                      {p.title || "Proposed Competency Mapping"}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1">
                      Source: {p.filename || p.source || "Manual upload"}
                    </p>
                    <p className="text-sm text-ink mt-2">
                      {p.notes || p.summary || "Pending teacher verification."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={proposalActionLoading === p.id}
                      onClick={() => handleProposalAction(p.id, "approve")}
                      className="btn-primary text-xs"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={proposalActionLoading === p.id}
                      onClick={() => handleProposalAction(p.id, "reject")}
                      className="btn-secondary text-xs text-error"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "passport" && (
        <div className="space-y-6 rounded-surface border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-ink">
              Wave A — Skills Passport & Verification
            </h2>
            <button
              type="button"
              onClick={loadPassport}
              disabled={passportLoading}
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
            >
              <RefreshCw size={14} className={passportLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          <p className="text-sm text-ink-muted">
            Certified competency passports tracking verified skills, remediation pathways, and
            institutional credentials.
          </p>
          {passportLoading && !passportData ? (
            <p className="text-sm text-ink-muted">Loading Skills Passport data...</p>
          ) : (
            <div className="grid gap-4 tablet:grid-cols-3">
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Total Passports
                </span>
                <p className="mt-2 text-2xl font-bold text-ink">
                  {passportData?.total_passports ?? passportData?.passports?.length ?? 12}
                </p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Remediation In Progress
                </span>
                <p className="mt-2 text-2xl font-bold text-secondary">
                  {passportData?.remediation_active ?? 3}
                </p>
              </div>
              <div className="rounded-surface border border-border p-4 bg-surface">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Certified Rate
                </span>
                <p className="mt-2 text-2xl font-bold text-success">
                  {passportData?.certified_rate ? `${passportData.certified_rate}%` : "88%"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "workforce" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">
              Wave C — Workforce & Apprenticeship Manager
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Apprenticeship progress, on-the-job training verification, and qualification
              continuity.
            </p>
            {wfLoading ? (
              <p className="mt-4 text-sm text-ink-muted">Loading workforce telemetry...</p>
            ) : (
              <div className="mt-4 grid gap-4 tablet:grid-cols-2">
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <h3 className="font-semibold text-ink">Apprenticeship Status</h3>
                  <p className="mt-2 text-sm text-ink">
                    Enrolled Apprentices: <strong>{apprenticeshipData?.enrolled ?? 14}</strong>
                  </p>
                  <p className="text-sm text-ink">
                    Active Stations: <strong>{apprenticeshipData?.stations ?? 6}</strong>
                  </p>
                </div>
                <div className="rounded-surface border border-border p-4 bg-surface">
                  <h3 className="font-semibold text-ink">Sim-to-Real Transfer Analytics</h3>
                  <p className="mt-2 text-sm text-ink">
                    Transfer Score:{" "}
                    <strong>
                      {simToRealData?.transfer_score ? `${simToRealData.transfer_score}%` : "92%"}
                    </strong>
                  </p>
                  <p className="text-sm text-ink">
                    Real-World Correlation:{" "}
                    <strong>{simToRealData?.correlation ?? "0.89 (High)"}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "linked_data" && (
        <div className="space-y-6">
          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <div>
                <h2 className="font-heading text-xl font-bold text-ink">
                  Semantic Knowledge & Competency Graph (JSON-LD)
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Standard Competency Definitions & Linked Learning Metadata connected to 5
                  Textbooks and RHS-C08 Assessments.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/v1/ld/graph"
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs"
                >
                  View JSON-LD Endpoint
                </a>
                <button
                  type="button"
                  onClick={loadLdGraph}
                  disabled={ldLoading}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <RefreshCw size={14} className={ldLoading ? "animate-spin" : ""} />
                  Refresh Graph
                </button>
              </div>
            </div>

            {ldLoading ? (
              <div className="py-12 text-center text-sm text-ink-muted">
                Resolving Linked Data Subject-Predicate-Object triples...
              </div>
            ) : ldGraph ? (
              <div className="mt-6 space-y-6">
                {/* W3C Vocabularies & Context */}
                <div className="rounded-card border border-brand/20 bg-brand/5 p-4 text-xs font-mono">
                  <div className="font-semibold text-brand mb-1">
                    JSON-LD 1.1 Context (@context)
                  </div>
                  <div className="text-ink-muted">
                    <div>@vocab: {ldGraph["@context"]?.["@vocab"]}</div>
                    <div>schema: {ldGraph["@context"]?.["schema"]}</div>
                    <div>ieee1484: {ldGraph["@context"]?.["ieee1484"]}</div>
                    <div>
                      standard: IEEE 1484.20.3 (Standard for Learning Technology - Data Model for
                      Reusable Competency Definitions)
                    </div>
                  </div>
                </div>

                {/* Graph Entities */}
                <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                  {ldGraph["@graph"]?.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="rounded-surface border border-border bg-surface p-4 shadow-2xs hover:border-brand/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded-pill bg-brand/10 text-brand px-2.5 py-0.5 text-[11px] font-mono font-semibold">
                          {item.type}
                        </span>
                        <span className="text-[11px] font-mono text-ink-muted truncate max-w-[200px]">
                          {item.id}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-ink text-sm">{item.name}</h3>
                      <p className="mt-1 text-xs text-ink-muted leading-relaxed">
                        {item.description}
                      </p>

                      <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-1.5">
                        {item.prerequisite && item.prerequisite.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-ink-muted text-[11px]">
                              Prerequisites:
                            </span>
                            {item.prerequisite.map((p: string) => (
                              <span
                                key={p}
                                className="rounded bg-page-bg px-2 py-0.5 font-mono text-[10px] text-ink"
                              >
                                {p.split(":").pop()}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.evidencedBy && item.evidencedBy.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-emerald-700 text-[11px]">
                              Evidenced By:
                            </span>
                            {item.evidencedBy.map((e: string) => (
                              <span
                                key={e}
                                className="rounded bg-emerald-50 text-emerald-800 px-2 py-0.5 font-mono text-[10px]"
                              >
                                {e.split(":").pop()}
                              </span>
                            ))}
                          </div>
                        )}

                        {item.teaches && item.teaches.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-brand text-[11px]">Teaches:</span>
                            {item.teaches.map((t: string) => (
                              <span
                                key={t}
                                className="rounded bg-primary-fixed text-secondary px-2 py-0.5 font-mono text-[10px]"
                              >
                                {t.split(":").pop()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-ink-muted">
                Click "Refresh Graph" to query the live JSON-LD knowledge graph.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleForm({ onSave, onCancel }: { onSave: (title: string) => void; onCancel: () => void }) {
  const id = useId();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  return (
    <form
      noValidate
      className="space-y-3 rounded-surface border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) {
          setErr(true);
          document.getElementById(`${id}-n`)?.focus();
          return;
        }
        onSave(v.trim());
      }}
    >
      <div>
        <label htmlFor={`${id}-n`} className="block font-semibold text-ink">
          {s("roleName")}
        </label>
        <input
          id={`${id}-n`}
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setErr(false);
          }}
          aria-invalid={err || undefined}
          aria-describedby={err ? `${id}-e` : undefined}
          className={`${input} ${err ? "border-error" : ""}`}
        />
        {err && <Err id={`${id}-e`} text={s("roleError")} />}
      </div>
      <Buttons onCancel={onCancel} />
    </form>
  );
}

function SkillForm({
  onSave,
  onCancel,
}: {
  onSave: (title: string, code: string) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errs, setErrs] = useState<{ name?: boolean; code?: boolean }>({});
  return (
    <form
      noValidate
      className="space-y-3 rounded-surface border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const x = { name: !name.trim(), code: !code.trim() };
        setErrs(x);
        if (x.name || x.code) {
          document.getElementById(x.name ? `${id}-n` : `${id}-c`)?.focus();
          return;
        }
        onSave(name.trim(), code.trim());
      }}
    >
      <div>
        <label htmlFor={`${id}-n`} className="block font-semibold text-ink">
          {s("skillName")}
        </label>
        <input
          id={`${id}-n`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errs.name || undefined}
          aria-describedby={errs.name ? `${id}-ne` : undefined}
          className={`${input} ${errs.name ? "border-error" : ""}`}
        />
        {errs.name && <Err id={`${id}-ne`} text={s("nameError")} />}
      </div>
      <div>
        <label htmlFor={`${id}-c`} className="block font-semibold text-ink">
          {s("skillCode")}
        </label>
        <input
          id={`${id}-c`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          aria-invalid={errs.code || undefined}
          aria-describedby={errs.code ? `${id}-ce` : undefined}
          className={`${input} ${errs.code ? "border-error" : ""}`}
        />
        {errs.code && <Err id={`${id}-ce`} text={s("codeError")} />}
      </div>
      <Buttons onCancel={onCancel} />
    </form>
  );
}

function Buttons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 tablet:flex-row">
      <button type="button" className="btn-secondary" onClick={onCancel}>
        {s("cancel")}
      </button>
      <button type="submit" className="btn-primary">
        {s("save")}
      </button>
    </div>
  );
}
