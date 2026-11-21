import { useEffect, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  ExternalLink,
  PlusCircle,
  Search,
  Radio,
  Users,
  GraduationCap,
  CheckCircle2,
  Clock,
  ArrowRight,
  School,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/institutions")({
  head: () => ({
    meta: [
      { title: "Multi-Campus Institutions Directory" + t("app.titleSuffix") },
      {
        name: "description",
        content: "Directory of partner schools, campus deployments, and LTI 1.3 LMS bindings.",
      },
      {
        property: "og:title",
        content: "Multi-Campus Institutions Directory" + t("app.titleSuffix"),
      },
      {
        property: "og:description",
        content: "Directory of partner schools, campus deployments, and LTI 1.3 LMS bindings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MultiCampusDirectoryPage,
});

interface CampusItem {
  id: string;
  name: string;
  code: string;
  location: string;
  studentsCount: number;
  teachersCount: number;
  classesCount: number;
  moodleSite: string;
  blueprintSynced: boolean;
  status: "Active" | "Onboarding";
}

export function MultiCampusDirectoryPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Onboarding">("all");

  const [campuses, setCampuses] = useState<CampusItem[]>([
    {
      id: "inst-riverside",
      name: "Riverside High School (Main Campus)",
      code: "RIVERSIDE",
      location: "Sector 4, Hyderabad",
      studentsCount: 220,
      teachersCount: 10,
      classesCount: 10,
      moodleSite: "http://localhost:8085",
      blueprintSynced: true,
      status: "Active",
    },
    {
      id: "inst-west",
      name: "Riverside West High School",
      code: "RHS-WEST",
      location: "Gachibowli Campus, Hyderabad",
      studentsCount: 240,
      teachersCount: 12,
      classesCount: 12,
      moodleSite: "https://moodle.west.riverside.edu",
      blueprintSynced: true,
      status: "Active",
    },
    {
      id: "inst-greenvalley",
      name: "Green Valley Public School",
      code: "GVPS-01",
      location: "Bengaluru North Campus",
      studentsCount: 180,
      teachersCount: 8,
      classesCount: 8,
      moodleSite: "https://lms.greenvalley.edu.in",
      blueprintSynced: false,
      status: "Onboarding",
    },
  ]);

  useEffect(() => {
    api
      .get<{ institution?: any }>("/api/v1/app/school-admin/overview")
      .then((res) => {
        if (res && res.institution) {
          setCampuses((prev) =>
            prev.map((c) =>
              c.code === "RIVERSIDE"
                ? {
                    ...c,
                    name: res.institution.name || c.name,
                    code: res.institution.code || c.code,
                  }
                : c,
            ),
          );
        }
      })
      .catch(() => {});
  }, []);

  const filteredCampuses = useMemo(() => {
    return campuses.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.location.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campuses, search, statusFilter]);

  const totalCampuses = campuses.length;
  const totalLearners = campuses.reduce((sum, c) => sum + c.studentsCount, 0);
  const activeLtiCount = campuses.filter((c) => c.status === "Active").length;
  const syncedBlueprints = campuses.filter((c) => c.blueprintSynced).length;

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Multi-Campus Institutions Directory"
          context="Institutional network management, campus blueprint deployments, and LTI 1.3 LMS integration status."
        />
        <div className="flex items-center gap-2">
          <Link
            to="/onboard"
            className="btn-primary inline-flex items-center gap-1.5 text-xs font-bold shadow-xs"
          >
            <PlusCircle size={15} />
            <span>+ Onboard Institution</span>
          </Link>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Total Campuses
            </span>
            <Building2 size={18} className="text-secondary" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-ink">{totalCampuses}</p>
          <span className="text-xs text-ink-muted font-medium">Affiliated Partner Campuses</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Total Learners
            </span>
            <Users size={18} className="text-teal-700" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-teal-800">{totalLearners}</p>
          <span className="text-xs text-ink-muted font-medium">Across Network Classes</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Synced Blueprints
            </span>
            <CheckCircle2 size={18} className="text-emerald-700" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-emerald-800">
            {syncedBlueprints} / {totalCampuses}
          </p>
          <span className="text-xs text-ink-muted font-medium">Master Curriculum Synced</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Active LTI Connections
            </span>
            <Radio size={18} className="text-emerald-600" />
          </div>
          <p className="mt-1 font-heading text-2xl font-extrabold text-ink">{activeLtiCount}</p>
          <span className="text-xs text-ink-muted font-medium">IMS Global 1.3 Certified</span>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campuses by name, code, or city..."
              className="w-full min-h-10 rounded-control border border-border bg-page-bg pl-9 pr-3 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="flex items-center rounded-control border border-border bg-page-bg p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "all" ? "bg-surface font-bold text-ink shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              All ({campuses.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Active")}
              className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "Active" ? "bg-emerald-50 text-emerald-800 font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              Active ({activeLtiCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Onboarding")}
              className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "Onboarding" ? "bg-amber-50 text-amber-800 font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
            >
              Onboarding (1)
            </button>
          </div>
        </div>
      </div>

      {/* Campus Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCampuses.map((campus) => (
          <div
            key={campus.id}
            className="flex flex-col justify-between rounded-surface border border-border bg-surface p-5 shadow-2xs hover:border-secondary/40 hover:shadow-xs transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  {campus.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    campus.status === "Active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${campus.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                  <span>{campus.status}</span>
                </span>
              </div>

              <div>
                <h3 className="font-heading font-bold text-base text-ink">{campus.name}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{campus.location}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-border text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-muted block">
                    Classes
                  </span>
                  <span className="font-bold text-ink">{campus.classesCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-muted block">
                    Faculty
                  </span>
                  <span className="font-bold text-ink">{campus.teachersCount}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-ink-muted block">
                    Learners
                  </span>
                  <span className="font-bold text-secondary">{campus.studentsCount}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-ink-muted">
                <div className="flex items-center justify-between">
                  <span>Curriculum Blueprint:</span>
                  <span className="font-semibold text-ink">
                    {campus.blueprintSynced ? "Synced ✓" : "Pending Sync"}
                  </span>
                </div>
                <div className="flex items-center justify-between truncate">
                  <span>LMS Binding:</span>
                  <span className="font-mono text-[11px] truncate max-w-[140px] text-slate-700">
                    {campus.moodleSite.replace(/^https?:\/\//, "")}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-border flex items-center justify-between">
              <Link
                to="/institution-detail"
                className="btn-primary text-xs font-bold w-full justify-center inline-flex items-center gap-1.5 py-2"
              >
                <span>Inspect Campus Profile</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
