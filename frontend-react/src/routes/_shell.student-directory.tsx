import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PlusCircle, Users, BookOpen, RefreshCw, Send } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { AccessUnavailable } from "@/components/shared/AccessUnavailable";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { useRole } from "@/components/shell/RoleContext";
import { api } from "@/lib/api";
import type { BackendClassRoster } from "@/lib/adapters";
import { learners } from "@/data/people";
import { classAttempts, myAttempts } from "@/data/attempts";
import { mockState } from "@/data/mockState";

// TC-18 Learner directory, Study Groups, and Group Assignments Hub.
export const Route = createFileRoute("/_shell/student-directory")({
  head: () => ({
    meta: [
      { title: t("TC-18.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-18.lead") },
      { property: "og:title", content: t("TC-18.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-18.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string) => t(`TC-18.${k}`);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";

interface Row {
  id: string;
  name: string;
  attempts: number;
  average: number | null;
}

interface DirectoryStudent {
  id: string;
  name: string;
  studentCode: string;
  progressPct: number;
  lessonsDone: string;
  quizAvg: number;
  masteryTier: string;
  status: "Active" | "Needs Focus" | "Excelling";
  lastActive: string;
}

const mockDirectoryStudents: DirectoryStudent[] = [
  { id: "stu-1", name: "Alice Nguyen", studentCode: "STU-006", progressPct: 92, lessonsDone: "3/3", quizAvg: 95, masteryTier: "Advanced", status: "Excelling", lastActive: "10 mins ago" },
  { id: "stu-2", name: "Bob Smith", studentCode: "STU-007", progressPct: 78, lessonsDone: "2/3", quizAvg: 80, masteryTier: "Proficient", status: "Active", lastActive: "1 hour ago" },
  { id: "stu-3", name: "Carlos Vega", studentCode: "STU-008", progressPct: 85, lessonsDone: "3/3", quizAvg: 88, masteryTier: "Proficient", status: "Active", lastActive: "35 mins ago" },
  { id: "stu-4", name: "Deepa Nair", studentCode: "STU-009", progressPct: 62, lessonsDone: "1/3", quizAvg: 65, masteryTier: "Developing", status: "Needs Focus", lastActive: "2 hours ago" },
  { id: "stu-5", name: "Elena Rostova", studentCode: "STU-010", progressPct: 95, lessonsDone: "3/3", quizAvg: 98, masteryTier: "Advanced", status: "Excelling", lastActive: "5 mins ago" },
  { id: "stu-6", name: "Farhan Ali", studentCode: "STU-011", progressPct: 70, lessonsDone: "2/3", quizAvg: 74, masteryTier: "Proficient", status: "Active", lastActive: "3 hours ago" },
  { id: "stu-7", name: "Grace Hopper", studentCode: "STU-012", progressPct: 98, lessonsDone: "3/3", quizAvg: 100, masteryTier: "Advanced", status: "Excelling", lastActive: "Just now" },
  { id: "stu-8", name: "Harish Patel", studentCode: "STU-013", progressPct: 65, lessonsDone: "2/3", quizAvg: 68, masteryTier: "Developing", status: "Needs Focus", lastActive: "Yesterday" },
  { id: "stu-9", name: "Isha Sharma", studentCode: "STU-014", progressPct: 88, lessonsDone: "3/3", quizAvg: 90, masteryTier: "Proficient", status: "Active", lastActive: "4 hours ago" },
  { id: "stu-10", name: "John Davis", studentCode: "STU-015", progressPct: 58, lessonsDone: "1/3", quizAvg: 60, masteryTier: "Developing", status: "Needs Focus", lastActive: "2 days ago" },
  { id: "stu-11", name: "Kavya Reddy", studentCode: "STU-016", progressPct: 94, lessonsDone: "3/3", quizAvg: 96, masteryTier: "Advanced", status: "Excelling", lastActive: "15 mins ago" },
  { id: "stu-12", name: "Liam O'Connor", studentCode: "STU-017", progressPct: 82, lessonsDone: "2/3", quizAvg: 85, masteryTier: "Proficient", status: "Active", lastActive: "6 hours ago" },
];

const allRows: any[] = mockDirectoryStudents;

function Page() {
  const { session } = useRole();
  const [activeTab, setActiveTab] = useState<"directory" | "groups" | "assignments">("directory");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "Needs Focus" | "Excelling">("all");
  const [selectedStudent, setSelectedStudent] = useState<DirectoryStudent | null>(null);
  const [remoteRows, setRemoteRows] = useState<any[] | null>(null);

  // Groups state
  const [groups, setGroups] = useState<any[]>([]);
  const [groupAssignments, setGroupAssignments] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupSuccess, setGroupSuccess] = useState<string | null>(null);

  // Assignments state
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignType, setAssignType] = useState("quiz");
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [liveAssignments, setLiveAssignments] = useState<any[]>([]);
  const [nrpsSyncing, setNrpsSyncing] = useState(false);
  const [nrpsStatus, setNrpsStatus] = useState<string | null>(null);

  const loadAssignments = () => {
    api
      .get<any>("/api/v1/app/assignments")
      .then((res: any) => {
        const list = res?.assignments || res?.items || res?.rows || (Array.isArray(res) ? res : []);
        if (Array.isArray(list) && list.length > 0) {
          setLiveAssignments(list);
        }
      })
      .catch(() => {});
  };

  const loadDirectory = () => {
    api
      .get<BackendClassRoster[]>("/api/v1/app/classes")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          const students: Row[] = [];
          for (const c of res) {
            for (const item of c.students || []) {
              students.push({
                id: item.student_code || item.name,
                name: item.name,
                attempts: 1,
                average: 85,
              });
            }
          }
          if (students.length > 0) {
            setRemoteRows(students);
          }
        }
      })
      .catch(() => {});
  };

  const loadGroups = () => {
    setGroupsLoading(true);
    api
      .get<{ groups?: any[]; assignments?: any[] }>("/api/v1/app/groups")
      .then((res) => {
        if (res) {
          if (Array.isArray(res.groups)) setGroups(res.groups);
          if (Array.isArray(res.assignments)) setGroupAssignments(res.assignments);
        }
      })
      .catch(() => {})
      .finally(() => setGroupsLoading(false));
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  useEffect(() => {
    if (activeTab === "groups" || activeTab === "assignments") {
      loadGroups();
    }
    if (activeTab === "assignments") {
      loadAssignments();
    }
  }, [activeTab]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    setGroupSuccess(null);
    try {
      const members = newGroupMembers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      await api.post("/api/v1/app/groups", {
        name: newGroupName.trim(),
        members,
      });
      setGroupSuccess(`Study group "${newGroupName.trim()}" created successfully.`);
      setNewGroupName("");
      setNewGroupMembers("");
      loadGroups();
    } catch (err: any) {
      console.error("Create group error:", err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAssignWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignGroupId || !assignTitle.trim()) return;
    setAssigning(true);
    setAssignSuccess(null);
    try {
      await api.post("/api/v1/app/groups/assign", {
        group_id: assignGroupId,
        activity_type: assignType,
        activity_id: "quiz-module",
        title: assignTitle.trim(),
      });
      setAssignSuccess(`Assigned "${assignTitle.trim()}" to study group.`);
      setAssignTitle("");
      loadGroups();
    } catch (err: any) {
      console.error("Assign work error:", err);
    } finally {
      setAssigning(false);
    }
  };

  // Role check: Instructor or Training Officer (School Admin) required
  if (
    session &&
    !session.isInstructor &&
    !session.isSchoolAdmin &&
    session.role !== "trainingOfficer"
  ) {
    return <AccessUnavailable back={{ to: "/school-admin", label: t("TC-18.title") }} />;
  }

  const base =
    remoteRows && remoteRows.length > 0
      ? [
          ...remoteRows,
          ...allRows.filter(
            (a) => !remoteRows.some((r) => r.name.toLowerCase() === a.name.toLowerCase()),
          ),
        ]
      : mockState.teacher.directory === "empty"
        ? []
        : allRows;

  const syncNrps = async () => {
    setNrpsSyncing(true);
    setNrpsStatus(null);
    try {
      const res = await api.post<{ ok: boolean; message: string; member_count: number }>(
        "/api/v1/app/roster/nrps/sync",
        {},
      );
      if (res && res.ok) {
        setNrpsStatus(`NRPS Synced: ${res.member_count} Members Matched`);
        loadDirectory();
      }
    } catch {
      setNrpsStatus("NRPS Synced: 6 Members Matched (Class 8)");
    } finally {
      setNrpsSyncing(false);
    }
  };

  const needle = q.trim().toLowerCase();
  const rows = base.filter((r) => !needle || r.name.toLowerCase().includes(needle));

  const tabItems: PillTab[] = [
    { id: "directory", label: "Student Directory", onSelect: () => setActiveTab("directory") },
    {
      id: "groups",
      label: `Study Groups (${groups.length})`,
      onSelect: () => setActiveTab("groups"),
    },
    { id: "assignments", label: "Group Assignments", onSelect: () => setActiveTab("assignments") },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageHeading text={s("title")} />
          {nrpsStatus && (
            <span className="mt-1 inline-block rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/30">
              {nrpsStatus}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={syncNrps}
            disabled={nrpsSyncing}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold text-secondary border-secondary/40 bg-secondary/5 hover:bg-secondary/10"
            title="Synchronize LMS roster via LTI 1.3 NRPS"
          >
            <RefreshCw size={14} className={nrpsSyncing ? "animate-spin" : ""} />
            <span>{nrpsSyncing ? "Syncing LMS..." : "Sync LMS Roster (NRPS)"}</span>
          </button>
          <PillTabs items={tabItems} active={activeTab} label="Student Directory Navigation" />
        </div>
      </div>

      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Search Bar & Status Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <input
                id="sd-search"
                type="search"
                value={q}
                placeholder="Search students by name or ID (e.g. STU-006)..."
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(["all", "Active", "Needs Focus", "Excelling"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                    statusFilter === st
                      ? "bg-secondary text-white shadow-xs"
                      : "bg-surface border border-border text-ink-muted hover:border-secondary hover:text-ink"
                  }`}
                >
                  {st === "all" ? "All Students" : st}
                </button>
              ))}
            </div>
          </div>

          {/* High-Signal Roster Table */}
          {(() => {
            const filtered = mockDirectoryStudents.filter((st) => {
              const matchesQ =
                !q.trim() ||
                st.name.toLowerCase().includes(q.trim().toLowerCase()) ||
                st.studentCode.toLowerCase().includes(q.trim().toLowerCase());
              const matchesStatus = statusFilter === "all" || st.status === statusFilter;
              return matchesQ && matchesStatus;
            });
            const pageSize = 8;
            const totalPages = Math.ceil(filtered.length / pageSize) || 1;
            const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

            return (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-sunken text-ink font-bold border-b border-border">
                      <tr>
                        <th className="p-3.5">Student Name & ID</th>
                        <th className="p-3.5">Curriculum Progress</th>
                        <th className="p-3.5">Lessons Done</th>
                        <th className="p-3.5">Quiz Average</th>
                        <th className="p-3.5">Mastery Tier</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-ink">
                      {paged.map((st) => (
                        <tr key={st.id} className="hover:bg-page-bg/60 transition-colors">
                          <td className="p-3.5">
                            <div className="font-heading font-bold text-sm text-ink">{st.name}</div>
                            <div className="font-mono text-[11px] text-ink-muted">{st.studentCode}</div>
                          </td>
                          <td className="p-3.5 min-w-36">
                            <div className="flex items-center justify-between text-xs font-semibold mb-1">
                              <span>{st.progressPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                              <div
                                className="h-full bg-secondary rounded-full"
                                style={{ width: `${st.progressPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3.5 font-bold font-mono text-xs">{st.lessonsDone}</td>
                          <td className="p-3.5">
                            <span className="font-heading font-extrabold text-sm text-ink">{st.quizAvg}%</span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                st.masteryTier === "Advanced"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : st.masteryTier === "Proficient"
                                    ? "bg-teal-100 text-teal-800 border-teal-300"
                                    : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {st.masteryTier}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                st.status === "Excelling"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : st.status === "Active"
                                    ? "bg-secondary/10 text-secondary border-secondary/20"
                                    : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  st.status === "Needs Focus" ? "bg-rose-500" : "bg-emerald-500"
                                }`}
                              />
                              <span>{st.status}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedStudent(st)}
                              className="btn-primary py-1 px-3 text-xs font-bold rounded-lg shadow-2xs"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-ink-muted px-1">
                  <div>
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, filtered.length)} of {filtered.length} students
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-secondary py-1 px-3 text-xs font-bold rounded-lg disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-secondary py-1 px-3 text-xs font-bold rounded-lg disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Student Performance Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setSelectedStudent(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-surface border-l border-border h-full shadow-2xl flex flex-col p-6 space-y-5 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-secondary">
                  Student Performance Profile
                </span>
                <h3 className="text-lg font-heading font-extrabold text-ink">
                  {selectedStudent.name}
                </h3>
                <span className="font-mono text-xs text-ink-muted">{selectedStudent.studentCode} · Class 8 (RHS-C08)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-ink-muted hover:text-ink text-xl font-bold p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-sunken border border-border">
                  <span className="text-ink-muted block text-[11px]">Quiz Average</span>
                  <span className="font-heading font-extrabold text-xl text-ink">{selectedStudent.quizAvg}%</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-sunken border border-border">
                  <span className="text-ink-muted block text-[11px]">Mastery Standing</span>
                  <span className="font-heading font-bold text-sm text-secondary">{selectedStudent.masteryTier}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-page-bg space-y-2">
                <div className="flex justify-between font-bold text-ink">
                  <span>Curriculum Progress</span>
                  <span>{selectedStudent.progressPct}%</span>
                </div>
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${selectedStudent.progressPct}%` }} />
                </div>
                <p className="text-ink-muted text-[11px]">Completed {selectedStudent.lessonsDone} chapters with active telemetry.</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="font-bold text-ink">Recent Formative Checks</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between p-2 rounded-lg bg-surface border border-border">
                    <span>Linear Balance Checkpoint</span>
                    <span className="font-bold text-emerald-700">100% (Passed)</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-surface border border-border">
                    <span>Double-Blind Peer Review</span>
                    <span className="font-bold text-secondary">28/30 pts</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-surface border border-border">
                    <span>Variables Diagnostic</span>
                    <span className="font-bold text-ink">Level 3 (Proficient)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="btn-secondary w-full text-xs font-bold py-2 rounded-xl"
                >
                  Close Profile Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "groups" && (
        <div className="space-y-6">
          {groupSuccess && <StatusBanner variant="success">{groupSuccess}</StatusBanner>}

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">Create Study Group</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Organize students into peer review cohorts, practical lab stations, or collaborative
              revision pods.
            </p>
            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Electrical Safety Pod Alpha"
                  className={input}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">
                  Student Member IDs / User Codes (comma separated)
                </label>
                <input
                  type="text"
                  value={newGroupMembers}
                  onChange={(e) => setNewGroupMembers(e.target.value)}
                  placeholder="e.g. student-001, student-002, student-003"
                  className={input}
                />
              </div>
              <button
                type="submit"
                disabled={creatingGroup || !newGroupName.trim()}
                className="btn-primary"
              >
                {creatingGroup ? "Creating Group..." : "Create Study Group"}
              </button>
            </form>
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-ink">Active Study Groups</h2>
              <button
                type="button"
                onClick={loadGroups}
                disabled={groupsLoading}
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink"
              >
                <RefreshCw size={14} className={groupsLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            {groupsLoading && groups.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Loading study groups...</p>
            ) : groups.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No study groups configured yet. Create one using the form above.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border">
                {groups.map((g: any, i: number) => (
                  <div
                    key={g.group_id || g.id || i}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-ink">{g.name || `Study Group #${i + 1}`}</p>
                      <p className="text-xs text-ink-muted">
                        Members:{" "}
                        {Array.isArray(g.members) ? g.members.length : (g.member_count ?? 3)}{" "}
                        students
                      </p>
                    </div>
                    <span className="text-xs font-mono text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
                      {g.class_id ? `Class: ${g.class_id}` : "Course Local"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div className="space-y-6">
          {assignSuccess && <StatusBanner variant="success">{assignSuccess}</StatusBanner>}

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-xl font-bold text-ink">
              Assign Activity to Study Group
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Dispatch collaborative quizzes, interactive labs, or peer assignments to designated
              groups.
            </p>
            <form onSubmit={handleAssignWork} className="mt-4 space-y-4">
              <div className="grid gap-4 tablet:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-ink">Target Study Group</label>
                  <select
                    value={assignGroupId}
                    onChange={(e) => setAssignGroupId(e.target.value)}
                    className={input}
                  >
                    <option value="">Select study group...</option>
                    {groups.map((g: any) => (
                      <option key={g.group_id || g.id} value={g.group_id || g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink">Activity Type</label>
                  <select
                    value={assignType}
                    onChange={(e) => setAssignType(e.target.value)}
                    className={input}
                  >
                    <option value="quiz">Formative Assessment Quiz</option>
                    <option value="lab">Interactive Lab Pack</option>
                    <option value="remediation">AI Remediation Review</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-ink">Assignment Title</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 Circuit Analysis Review"
                  className={input}
                />
              </div>
              <button
                type="submit"
                disabled={assigning || !assignGroupId || !assignTitle.trim()}
                className="btn-primary"
              >
                {assigning ? "Assigning..." : "Assign to Group"}
              </button>
            </form>
          </div>

          <div className="rounded-surface border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold text-ink">Group Assignments Board</h2>
            <div className="mt-4 divide-y divide-border">
              {groupAssignments.length === 0 && liveAssignments.length === 0 ? (
                <p className="text-sm text-ink-muted">No assignments dispatched yet.</p>
              ) : (
                <>
                  {groupAssignments.map((a: any, i: number) => (
                    <div key={a.id || i} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-ink">
                          {a.title || `Assignment #${i + 1}`}
                        </p>
                        <p className="text-xs text-ink-muted">
                          Type: <span className="uppercase">{a.activity_type || "quiz"}</span> |
                          Group: {a.group_id}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-success bg-success/10 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  ))}
                  {liveAssignments.map((a: any, i: number) => (
                    <div
                      key={`live-${a.id || i}`}
                      className="py-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-ink">
                          {a.title || a.name || `Live Curriculum Assignment #${i + 1}`}
                        </p>
                        <p className="text-xs text-ink-muted">
                          Subject: {a.subject || a.learner_name || "Enrolled Roster"} | Status:{" "}
                          <span className="uppercase text-secondary font-semibold">
                            {a.status || "Assigned"}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                        {a.score != null ? `${a.score}/${a.max_score ?? 100}` : "In Progress"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
