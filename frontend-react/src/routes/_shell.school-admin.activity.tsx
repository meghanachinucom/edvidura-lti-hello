import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ShieldCheck,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Radio,
  Layers,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { downloadBlob } from "@/lib/download";
import { formatIST } from "@/lib/time";

interface AuditEvent {
  id: string;
  category: "roster" | "grade" | "launch" | "security" | "blueprint";
  categoryLabel: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  status: "Verified" | "Logged" | "Action Required";
  hash: string;
  details: string;
}

const mockAuditEvents: AuditEvent[] = [
  {
    id: "aud-001",
    category: "roster",
    categoryLabel: "Roster Sync",
    action: "LTI 1.3 NRPS Full Roster Sync",
    actor: "LMS Service Worker (Moodle 4.x)",
    target: "Class 8 (RHS-C08) · 220 Active Learners",
    timestamp: "2026-11-21T09:15:00Z",
    status: "Verified",
    hash: "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    details: "Synchronized 220 active students across Grades 1–10. All user roles and section memberships matched.",
  },
  {
    id: "aud-002",
    category: "grade",
    categoryLabel: "Grade Passback",
    action: "LTI Assignment & Grade Service (AGS) Line Item Score Sync",
    actor: "EdVidura Evaluation Engine",
    target: "Alice Nguyen (STU-006) · Linear Balance Checkpoint",
    timestamp: "2026-11-21T08:45:00Z",
    status: "Verified",
    hash: "sha256-5f4dcc3b5aa765d61d8327deb882cf99",
    details: "Score 100/100 (5/5 pts) posted back to LMS gradebook with timestamp and telemetry audit proof.",
  },
  {
    id: "aud-003",
    category: "blueprint",
    categoryLabel: "Blueprint Sync",
    action: "Curriculum Blueprint & National Standards Re-indexing",
    actor: "Admin: S. Narayanan",
    target: "Class 8 Mathematics NEP Framework",
    timestamp: "2026-11-21T07:30:00Z",
    status: "Verified",
    hash: "sha256-7d4a2b91c8932ef1",
    details: "Mapped 12 core competencies to lesson modules, textbooks, and interactive concept checks.",
  },
  {
    id: "aud-004",
    category: "security",
    categoryLabel: "Security & Keys",
    action: "JWKS Public Keyset Periodic Rotation",
    actor: "Security Guardian Daemon",
    target: "LTI 1.3 Advantage Platform Binding",
    timestamp: "2026-11-20T23:00:00Z",
    status: "Verified",
    hash: "sha256-8a9b2c3d4e5f6071",
    details: "Generated new 2048-bit RSA keypair. Published keyset updated with zero downtime.",
  },
  {
    id: "aud-005",
    category: "launch",
    categoryLabel: "LTI Launch",
    action: "Deep-Linking Content Selection Launch",
    actor: "Instructor: Priya Sharma",
    target: "Algebra I: Foundations (Chapter 2)",
    timestamp: "2026-11-20T16:20:00Z",
    status: "Verified",
    hash: "sha256-1122334455667788",
    details: "Embedded chapter lesson into Moodle course section with authenticated JWT token.",
  },
  {
    id: "aud-006",
    category: "roster",
    categoryLabel: "Roster Sync",
    action: "Section Enrollment Provisioning",
    actor: "Registrar Sync Script",
    target: "Grade 9 & 10 Vocational Apprenticeship Section",
    timestamp: "2026-11-20T14:10:00Z",
    status: "Verified",
    hash: "sha256-aabbccddeeff0011",
    details: "Enrolled 45 learners into technical trade training tracks with verified OJT hours log.",
  },
];

export const Route = createFileRoute("/_shell/school-admin/activity")({
  head: () => ({
    meta: [
      { title: "Institutional Audit & Operations Console · Riverside High School" },
      { name: "description", content: "Audited institutional activity log, statutory compliance events, and LMS sync telemetry." },
    ],
  }),
  component: Page,
});

function Page() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = mockAuditEvents.filter((ev) => {
    const matchesCat = selectedCategory === "all" || ev.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      ev.action.toLowerCase().includes(search.toLowerCase()) ||
      ev.target.toLowerCase().includes(search.toLowerCase()) ||
      ev.actor.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const exportCsv = () => {
    const headers = ["Timestamp", "Category", "Action", "Actor", "Target", "Status", "Hash"];
    const lines = filtered.map((ev) => [
      `"${formatIST(ev.timestamp)}"`,
      `"${ev.categoryLabel}"`,
      `"${ev.action.replaceAll('"', '""')}"`,
      `"${ev.actor.replaceAll('"', '""')}"`,
      `"${ev.target.replaceAll('"', '""')}"`,
      `"${ev.status}"`,
      `"${ev.hash}"`,
    ]);
    const csv = [headers.join(","), ...lines.map((l) => l.join(","))].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "school-audit-trail.csv");
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-4">
        <Link
          to="/school-admin"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-ink underline"
        >
          <ChevronLeft aria-hidden size={16} />
          <span>Back to School Command Center</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <PageHeading
            text="Institutional Audit & Operations Console"
            context="Statutory compliance logs, LTI 1.3 Advantage telemetry, automated roster reconciliations, and sealed audit events."
          />
          <button
            type="button"
            onClick={exportCsv}
            className="btn-secondary inline-flex items-center gap-2 text-xs font-bold py-2.5 px-4 self-start sm:self-auto shadow-2xs"
          >
            <Download size={14} />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <section aria-label="Audit Console KPIs" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <article className="rounded-2xl border border-border border-l-4 border-l-secondary bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Audit Events (7d)</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-ink">1,280 Events</p>
          <p className="mt-1 text-xs text-ink-muted">Zero tamper or integrity violations</p>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Blueprint Syncs</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-800">42 Synced</p>
          <p className="mt-1 text-xs text-ink-muted">Curriculum standards & skill graphs</p>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-teal-600 bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Roster Syncs</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-teal-800">18 NRPS Runs</p>
          <p className="mt-1 text-xs text-ink-muted">220 active students reconciled</p>
        </article>

        <article className="rounded-2xl border border-border border-l-4 border-l-accent bg-surface p-4 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Compliance Actions</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-accent">100% Verified</p>
          <p className="mt-1 text-xs text-ink-muted">DPDP & statutory benchmarks met</p>
        </article>
      </section>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Operations" },
            { id: "roster", label: "Roster Sync" },
            { id: "grade", label: "Grade Passback" },
            { id: "blueprint", label: "Blueprint Sync" },
            { id: "security", label: "Security & Keys" },
            { id: "launch", label: "LTI Launch" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                selectedCategory === cat.id
                  ? "bg-secondary text-white shadow-xs"
                  : "bg-surface border border-border text-ink-muted hover:border-secondary hover:text-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-3 text-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2 text-xs text-ink outline-none focus:border-secondary shadow-2xs"
          />
        </div>
      </div>

      {/* Spacious Audit Timeline Cards with Verified Status */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-xs text-ink-muted">
            No audit events matched the filter.
          </div>
        ) : (
          filtered.map((ev) => (
            <div
              key={ev.id}
              className="rounded-2xl border border-border bg-surface p-5 space-y-3.5 shadow-xs hover:border-secondary/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                    {ev.categoryLabel}
                  </span>
                  <h3 className="font-heading font-extrabold text-base text-ink">
                    {ev.action}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={13} className="text-emerald-700" />
                    <span>{ev.status}</span>
                  </span>
                  <span className="text-xs font-mono text-ink-muted">{formatIST(ev.timestamp)}</span>
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed font-medium">
                {ev.details}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-page-bg border border-border">
                  <span className="text-[11px] text-ink-muted block">Initiator / Actor:</span>
                  <span className="font-semibold text-ink">{ev.actor}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-page-bg border border-border">
                  <span className="text-[11px] text-ink-muted block">Target Resource:</span>
                  <span className="font-semibold text-secondary">{ev.target}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/80 text-[11px] text-ink-muted font-mono">
                <span className="truncate max-w-md">Seal: {ev.hash}</span>
                <span className="font-semibold text-secondary">ID: {ev.id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
