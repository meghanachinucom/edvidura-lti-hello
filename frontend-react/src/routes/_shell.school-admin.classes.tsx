import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, PlusCircle, Users, XCircle, RefreshCw } from "lucide-react";
import { PageHeading } from "@/components/shared/PageHeading";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { useRole } from "@/components/shell/RoleContext";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/school-admin/classes")({ component: Page });

interface BackendClass {
  id?: string;
  class_code?: string;
  class_name?: string;
  name?: string;
  code?: string;
  subject?: string;
  term?: string;
  students?: Array<{ student_code?: string; name: string }>;
  enrolled?: number;
}

const defaultClasses = [
  {
    name: "Electrician, Batch A",
    code: "ELE-A",
    room: "Workshop 1",
    teacher: "Suresh Iyer",
    time: "09:00–10:30",
    enrolled: 28,
    capacity: 30,
    period: "Period 1",
    synced: true,
  },
  {
    name: "Electrician, Batch B",
    code: "ELE-B",
    room: "Workshop 2",
    teacher: "Farhan Qureshi",
    time: "11:00–12:30",
    enrolled: 24,
    capacity: 30,
    period: "Period 2",
    synced: true,
  },
  {
    name: "STEM Foundations",
    code: "STEM-01",
    room: "Lab 3",
    teacher: "Suresh Iyer",
    time: "13:00–14:30",
    enrolled: 22,
    capacity: 28,
    period: "Period 3",
    synced: true,
  },
];

function Page() {
  const { session } = useRole();
  const token = session?.token || "";
  const instUrl = token ? `/institution-detail?token=${encodeURIComponent(token)}` : "/institution-detail";

  const [remoteClasses, setRemoteClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [className, setClassName] = useState("");
  const [classSubject, setClassSubject] = useState("");
  const [classTerm, setClassTerm] = useState("Semester 1");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Roster view state
  const [viewingRoster, setViewingRoster] = useState<any | null>(null);

  const loadClasses = () => {
    setLoading(true);
    api
      .get<any[]>("/api/v1/app/classes")
      .then((res) => {
        if (Array.isArray(res)) {
          setRemoteClasses(res);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim() || !className.trim()) return;
    setSubmitting(true);
    setSuccessMsg(null);
    try {
      await api.post("/api/v1/app/classes", {
        class_code: classCode.trim(),
        class_name: className.trim(),
        subject: classSubject.trim(),
        term: classTerm.trim(),
      });
      setSuccessMsg(`Section "${className.trim()}" (${classCode.trim()}) registered successfully.`);
      setClassCode("");
      setClassName("");
      setClassSubject("");
      setShowAddModal(false);
      loadClasses();
    } catch (err: any) {
      console.error("Create class failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayClasses = remoteClasses.length > 0
    ? remoteClasses.map((c: any) => ({
        id: c.id,
        name: c.class_name || c.name || "Vocational Section",
        code: c.class_code || c.code || "SEC-01",
        room: c.room || "Workshop Lab",
        teacher: c.teacher_name || "Assigned Faculty",
        time: c.schedule || "09:00–11:00",
        enrolled: Array.isArray(c.students) ? c.students.length : (c.enrolled ?? 25),
        capacity: c.capacity ?? 30,
        period: c.term || "Semester 1",
        synced: true,
        students: c.students || [],
      }))
    : defaultClasses;

  const totalCapacity = displayClasses.reduce((sum, c) => sum + (c.capacity || 30), 0);
  const totalEnrolled = displayClasses.reduce((sum, c) => sum + c.enrolled, 0);
  const avgClassSize = displayClasses.length ? Math.round(totalEnrolled / displayClasses.length) : 0;

  const stats = [
    ["Active sections", String(displayClasses.length)],
    ["Total capacity", String(totalCapacity)],
    ["Average class size", String(avgClassSize)],
    ["Courseware sync status", "All synced"],
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text="Classes & Sections" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadClasses}
            disabled={loading}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <a
            href={instUrl}
            rel="noreferrer"
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            <ExternalLink size={16} />
            Open Institution Classes Console
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          Add Section / Class
        </button>
      </div>

      {successMsg && <StatusBanner variant="success">{successMsg}</StatusBanner>}

      {showAddModal && (
        <form
          onSubmit={handleCreateClass}
          className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-ink">Register New Class Section</h2>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-ink-muted hover:text-ink"
            >
              <XCircle size={18} />
            </button>
          </div>
          <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
            <div>
              <label className="block text-sm font-semibold text-ink">Section Code</label>
              <input
                type="text"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="e.g. ELE-C"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Section Name</label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Electrician, Batch C"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Trade / Subject</label>
              <input
                type="text"
                value={classSubject}
                onChange={(e) => setClassSubject(e.target.value)}
                placeholder="e.g. Electrical Engineering"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Academic Term</label>
              <input
                type="text"
                value={classTerm}
                onChange={(e) => setClassTerm(e.target.value)}
                placeholder="Semester 1"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-sm"
            >
              {submitting ? "Registering..." : "Create Class Section"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {stats.map(([label, value]) => (
          <article key={label} className="rounded-surface border border-border bg-surface p-4 shadow-sm">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className="mt-2 font-heading text-xl font-bold text-ink">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {displayClasses.map((c) => (
          <article
            key={c.code}
            className="space-y-4 rounded-surface border border-border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-ink">
                {c.period}
              </span>
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success font-semibold">
                Synced
              </span>
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-ink">{c.name}</h2>
              <p className="text-sm text-secondary font-mono">{c.code}</p>
            </div>
            <div className="space-y-1 text-sm text-ink">
              <p>{c.room}</p>
              <p className="text-ink-muted">
                {c.teacher} · {c.time}
              </p>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm text-ink">
                <span>Enrolment</span>
                <span>
                  {c.enrolled} / {c.capacity}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${c.name} enrolment`}
                aria-valuenow={c.enrolled}
                aria-valuemin={0}
                aria-valuemax={c.capacity}
                className="h-2 overflow-hidden rounded-full bg-surface-raised"
              >
                <div
                  className="h-full rounded-full bg-coral"
                  style={{ width: `${Math.min(100, (c.enrolled / c.capacity) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setViewingRoster(c)}
                className="btn-secondary flex-1 text-xs"
              >
                Roster ({c.enrolled})
              </button>
            </div>
          </article>
        ))}
      </div>

      {viewingRoster && (
        <div className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-ink">
                Enrolled Students: {viewingRoster.name} ({viewingRoster.code})
              </h3>
              <p className="text-xs text-ink-muted">Section Capacity: {viewingRoster.capacity} learners</p>
            </div>
            <button
              type="button"
              onClick={() => setViewingRoster(null)}
              className="text-ink-muted hover:text-ink"
            >
              <XCircle size={18} />
            </button>
          </div>
          {Array.isArray(viewingRoster.students) && viewingRoster.students.length > 0 ? (
            <ul className="divide-y divide-border">
              {viewingRoster.students.map((st: any, idx: number) => (
                <li key={idx} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{st.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{st.student_code || `STU-${idx + 1}`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted py-4 text-center">
              No students enrolled in this section yet. Enrolment is federated via LMS course linkage.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
