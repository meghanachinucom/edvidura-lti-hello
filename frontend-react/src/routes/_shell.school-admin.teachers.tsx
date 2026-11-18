import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Mail, Search, PlusCircle, XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { instructorAccess } from "@/data/schoolAdmin";
import { personById } from "@/data/people";
import { useRole } from "@/components/shell/RoleContext";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_shell/school-admin/teachers")({ component: Page });

interface BackendTeacher {
  id?: string;
  teacher_code: string;
  name: string;
  email: string;
  status?: string;
}

const faculty = instructorAccess.map((row, i) => ({
  ...row,
  name: personById(row.personId)?.name ?? "Faculty member",
  email: ["suresh.iyer@edvidura.edu", "farhan.qureshi@edvidura.edu"][i],
  phone: ["+91 98765 43210", "+91 98765 43211"][i],
  subject: ["Mathematics", "STEM and Sciences"][i],
  curricula: row.classes.map((x) => (x === "ELE-A" ? "Domestic Wiring" : "Electrical Safety")),
  learners: i ? 28 : 32,
}));

const filters = ["All", "Mathematics", "STEM and Sciences", "Computer Science"];

function Page() {
  const { session } = useRole();
  const token = session?.token || "";
  const instUrl = token
    ? `/institution-detail?token=${encodeURIComponent(token)}`
    : "/institution-detail";

  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [appointing, setAppointing] = useState(false);
  const [appointSuccess, setAppointSuccess] = useState<string | null>(null);

  const [remoteTeachers, setRemoteTeachers] = useState<any[]>([]);

  const loadTeachers = () => {
    api
      .get<{ teachers?: any[] }>("/api/v1/app/teachers")
      .then((res) => {
        if (res && Array.isArray(res.teachers)) {
          setRemoteTeachers(res.teachers);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAppoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim() || !newEmail.trim()) return;
    setAppointing(true);
    setAppointSuccess(null);
    try {
      await api.post("/api/v1/app/teachers", {
        teacher_code: newCode.trim(),
        name: newName.trim(),
        email: newEmail.trim(),
      });
      setAppointSuccess(`Appointed ${newName.trim()} to the institutional faculty roster.`);
      setNewCode("");
      setNewName("");
      setNewEmail("");
      setShowAddModal(false);
      loadTeachers();
    } catch (err: any) {
      console.error("Appoint teacher error:", err);
    } finally {
      setAppointing(false);
    }
  };

  const combinedFaculty = [
    ...faculty,
    ...remoteTeachers.map((rt, idx) => ({
      personId: rt.id || `remote-${idx}`,
      name: rt.name || "Appointed Teacher",
      email: rt.email || "faculty@edvidura.edu",
      phone: "+91 98765 00000",
      subject: "STEM and Sciences",
      curricula: ["Industrial Automation"],
      learners: 30,
      classes: ["AUT-1"],
    })),
  ];

  const rows = combinedFaculty.filter(
    (f) =>
      (filter === "All" || f.subject === filter) &&
      `${f.name} ${f.email} ${f.subject}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 pb-24 pt-8 tablet:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading text="Faculty" />
        <a href={instUrl} rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
          <ExternalLink size={16} />
          Open Institution Faculty Roster
        </a>
      </div>
      <p className="max-w-reading text-sm text-ink-muted">
        Appointing faculty registers their instructional profile and trade assignments on the
        institutional roster. Faculty credentials and authenticated identities are federated through
        the institution LMS / SSO provider.
      </p>

      {appointSuccess && <StatusBanner variant="success">{appointSuccess}</StatusBanner>}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary">
          Appoint faculty
        </button>
        <button className="btn-secondary" onClick={() => setConfirm(true)}>
          Sync SSO
        </button>
      </div>

      {showAddModal && (
        <form
          onSubmit={handleAppoint}
          className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-ink">Appoint New Faculty Member</h2>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-ink-muted hover:text-ink"
            >
              <XCircle size={18} />
            </button>
          </div>
          <div className="grid gap-4 tablet:grid-cols-3">
            <div>
              <label className="block text-sm font-semibold text-ink">Teacher Code</label>
              <input
                type="text"
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="e.g. TCH-04"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Dr. Ananya Sharma"
                className="mt-1 min-h-11 w-full rounded-surface border-control bg-surface px-3 text-ink"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Email Address</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ananya.sharma@edvidura.edu"
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
            <button type="submit" disabled={appointing} className="btn-primary text-sm">
              {appointing ? "Appointing..." : "Save Appointment"}
            </button>
          </div>
        </form>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-3.5 text-ink-muted" />
        <input
          aria-label="Search faculty"
          placeholder="Search faculty"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-11 w-full rounded-surface border-control bg-surface pl-10 pr-3 text-ink"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((x) => (
          <button
            key={x}
            onClick={() => setFilter(x)}
            className={`rounded-full border px-4 py-2 text-sm ${filter === x ? "border-coral bg-coral/10 text-ink font-semibold" : "border-border bg-surface text-ink"}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="grid gap-4 tablet:grid-cols-2 desktop:grid-cols-3">
        {rows.map((f) => (
          <article
            key={f.personId}
            className="space-y-4 rounded-surface border border-border bg-surface p-5 shadow-sm"
          >
            <header className="flex items-start gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-full bg-coral/10 font-heading text-coral font-bold">
                {f.name
                  .split(" ")
                  .map((x: string) => x[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-lg font-bold text-ink">{f.name}</h2>
                <p className="text-secondary text-sm">{f.subject}</p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-ink">
                SSO linked
              </span>
            </header>
            <div className="space-y-1.5 text-sm text-ink-muted">
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <a href={`mailto:${f.email}`} className="text-ink underline">
                  {f.email}
                </a>
              </div>
              <p>{f.phone}</p>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs uppercase tracking-wider text-ink-muted">Classes & Trades</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.curricula.map((c) => (
                  <span
                    key={c}
                    className="rounded bg-surface-contrast px-2 py-1 text-xs text-ink border border-border"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <footer className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-ink-muted">{f.learners} learners</span>
              <button className="text-secondary underline">Manage profile</button>
            </footer>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={confirm}
        title="Sync SSO Faculty Identities"
        body="Triggering institutional SSO directory synchronization will refresh faculty authorization tokens and course assignments from the federated identity provider."
        confirmLabel="Synchronize Directory"
        cancelLabel="Cancel"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
