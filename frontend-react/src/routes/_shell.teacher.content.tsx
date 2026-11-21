import { useEffect, useId, useState, useMemo, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ExternalLink,
  XCircle,
  Plus,
  Sparkles,
  Search,
  BookOpen,
  Video,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Edit3,
  FileCheck,
  Film,
  Layers,
  BarChart2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { t } from "@/i18n";
import { api } from "@/lib/api";
import { useRole } from "@/components/shell/RoleContext";
import { adaptLesson, type BackendLessonItem } from "@/lib/adapters";
import { PageHeading } from "@/components/shared/PageHeading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { lessons as seedLessons, type LessonKind } from "@/data/lessons";
import { checkpointQuiz, type OptionKey } from "@/data/quiz";
import { mockState } from "@/data/mockState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_shell/teacher/content")({
  head: () => ({
    meta: [
      { title: "Instructor Content Studio" + t("app.titleSuffix") },
      {
        name: "description",
        content: "Curriculum authoring, video checkpoint integration, and lesson publishing.",
      },
      { property: "og:title", content: "Instructor Content Studio" + t("app.titleSuffix") },
      {
        property: "og:description",
        content: "Curriculum authoring, video checkpoint integration, and lesson publishing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContentStudioPage,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-02.${k}`, v);
const inputClass =
  "min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-ink focus:border-secondary focus:ring-1 focus:ring-secondary outline-none";

interface StudioLesson {
  id: string;
  title: string;
  kind: LessonKind;
  published: boolean;
  courseCode: string;
  topic?: string;
  completionRate?: number;
  videoUrl?: string;
  checkpointTimestamp?: string;
  checkpointQuestion?: string;
  bodyMd?: string;
}

export function ContentStudioPage() {
  const { session } = useRole();
  const [lessons, setLessons] = useState<StudioLesson[]>(() =>
    seedLessons.map((l, idx) => ({
      id: l.id,
      title: l.title,
      kind: l.kind,
      published: idx !== 3, // 1 draft, rest published
      courseCode: l.courseCode,
      topic: idx < 3 ? "Linear Equations" : idx < 5 ? "Variables & Expressions" : "Safety & Tools",
      completionRate: 75 + ((idx * 4) % 25),
      videoUrl:
        (l as any).video ??
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      checkpointTimestamp: "01:45",
      checkpointQuestion: "Isolate x by subtracting 3 from both sides",
      bodyMd: `## ${l.title}\n\nStep-by-step curriculum module for Class 8 Algebra I.\n\n### Key Concept\nLinear equations maintain equality across both sides when equivalent operations are performed.\n\n- Step 1: Identify like terms\n- Step 2: Apply inverse operations\n- Step 3: Verify solution by substitution`,
    })),
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [topicFilter, setTopicFilter] = useState("all");

  // Modals state
  const [isNewOrEditOpen, setIsNewOrEditOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<StudioLesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonKind, setLessonKind] = useState<LessonKind>("reading");
  const [lessonCourseCode, setLessonCourseCode] = useState("ELE-A");
  const [lessonTopic, setLessonTopic] = useState("Linear Equations");
  const [lessonBody, setLessonBody] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");
  const [lessonPublished, setLessonPublished] = useState(true);

  // Checkpoint Modal
  const [checkpointLesson, setCheckpointLesson] = useState<StudioLesson | null>(null);
  const [checkpointTime, setCheckpointTime] = useState("01:30");
  const [checkpointQ, setCheckpointQ] = useState("");

  // Preview Modal
  const [previewLesson, setPreviewLesson] = useState<StudioLesson | null>(null);

  // Delete Confirm
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ lessons: BackendLessonItem[] }>("/api/v1/app/lessons")
      .then((res) => {
        if (active && res && Array.isArray(res.lessons) && res.lessons.length > 0) {
          const adaptedList: StudioLesson[] = res.lessons.map((b, idx) => {
            const adapted = adaptLesson(b);
            return {
              id: adapted.id,
              title: adapted.title,
              kind: adapted.kind,
              published: (b as any).status ? (b as any).status === "published" : true,
              courseCode: adapted.courseCode,
              topic: "Algebra Fundamentals",
              completionRate: 82,
              videoUrl:
                (b as any).video_url ||
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              checkpointTimestamp: "02:00",
              checkpointQuestion: "Check your understanding",
              bodyMd: (b as any).body_md || `# ${adapted.title}\n\nCore curriculum content.`,
            };
          });
          // Merge to prevent flicker
          setLessons((prev) => [
            ...adaptedList,
            ...prev.filter((p) => !adaptedList.some((a) => a.id === p.id)),
          ]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const openNewLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonKind("reading");
    setLessonCourseCode("ELE-A");
    setLessonTopic("Linear Equations");
    setLessonBody("# Lesson Overview\n\nExplain core principles with examples.");
    setLessonVideo("");
    setLessonPublished(true);
    setIsNewOrEditOpen(true);
  };

  const openEditLesson = (l: StudioLesson) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonKind(l.kind);
    setLessonCourseCode(l.courseCode);
    setLessonTopic(l.topic || "Linear Equations");
    setLessonBody(l.bodyMd || `# ${l.title}\n\nContent details.`);
    setLessonVideo(l.videoUrl || "");
    setLessonPublished(l.published);
    setIsNewOrEditOpen(true);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) return;
    setSaving(true);
    try {
      if (editingLesson) {
        // Backend PUT if possible
        try {
          await api.put(`/api/v1/app/lessons/${editingLesson.id}`, {
            title: lessonTitle.trim(),
            kind: lessonKind,
            video_url: lessonVideo.trim(),
            status: lessonPublished ? "published" : "draft",
            body_md: lessonBody,
          });
        } catch {}
        setLessons((ls) =>
          ls.map((item) =>
            item.id === editingLesson.id
              ? {
                  ...item,
                  title: lessonTitle.trim(),
                  kind: lessonKind,
                  courseCode: lessonCourseCode,
                  topic: lessonTopic,
                  videoUrl: lessonVideo.trim(),
                  published: lessonPublished,
                  bodyMd: lessonBody,
                }
              : item,
          ),
        );
        setStatusMsg(`Updated lesson "${lessonTitle.trim()}".`);
      } else {
        // Backend POST
        const newId = `les-${Date.now()}`;
        try {
          await api.post("/api/v1/app/lessons", {
            title: lessonTitle.trim(),
            kind: lessonKind,
            course_id: "RHS-C08",
            video_url: lessonVideo.trim(),
            status: lessonPublished ? "published" : "draft",
            body_md: lessonBody,
          });
        } catch {}
        setLessons((ls) => [
          {
            id: newId,
            title: lessonTitle.trim(),
            kind: lessonKind,
            published: lessonPublished,
            courseCode: lessonCourseCode,
            topic: lessonTopic,
            completionRate: 0,
            videoUrl: lessonVideo.trim(),
            checkpointTimestamp: "01:30",
            checkpointQuestion: "Concept check question",
            bodyMd: lessonBody,
          },
          ...ls,
        ]);
        setStatusMsg(`Created new lesson "${lessonTitle.trim()}".`);
      }
      setIsNewOrEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (l: StudioLesson) => {
    const nextStatus = !l.published;
    try {
      await api.post(`/api/v1/app/lessons/${l.id}/status`, {
        status: nextStatus ? "published" : "draft",
      });
    } catch {}
    setLessons((ls) =>
      ls.map((item) => (item.id === l.id ? { ...item, published: nextStatus } : item)),
    );
    setStatusMsg(`Lesson "${l.title}" marked as ${nextStatus ? "Published" : "Draft"}.`);
  };

  const handleSaveCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointLesson) return;
    setLessons((ls) =>
      ls.map((item) =>
        item.id === checkpointLesson.id
          ? {
              ...item,
              checkpointTimestamp: checkpointTime,
              checkpointQuestion: checkpointQ,
              videoUrl:
                item.videoUrl ||
                "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            }
          : item,
      ),
    );
    setStatusMsg(`Attached video checkpoint at ${checkpointTime} to "${checkpointLesson.title}".`);
    setCheckpointLesson(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`/api/v1/app/lessons/${toDelete}`);
    } catch {}
    setLessons((ls) => ls.filter((item) => item.id !== toDelete));
    setStatusMsg("Lesson deleted from curriculum.");
    setToDelete(null);
  };

  const filteredLessons = useMemo(() => {
    return lessons.filter((l) => {
      const matchSearch =
        !search.trim() ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.courseCode.toLowerCase().includes(search.toLowerCase()) ||
        (l.topic && l.topic.toLowerCase().includes(search.toLowerCase()));
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && l.published) ||
        (statusFilter === "draft" && !l.published);
      const matchTopic = topicFilter === "all" || l.topic === topicFilter;
      return matchSearch && matchStatus && matchTopic;
    });
  }, [lessons, search, statusFilter, topicFilter]);

  const publishedCount = lessons.filter((l) => l.published).length;
  const draftCount = lessons.filter((l) => !l.published).length;
  const avgCompletion = Math.round(
    lessons.reduce((acc, curr) => acc + (curr.completionRate || 0), 0) / (lessons.length || 1),
  );
  const withVideoCount = lessons.filter((l) => Boolean(l.videoUrl)).length;

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeading
          text="Instructor Content Studio"
          context="Curriculum authoring, video checkpoint integration, interactive exercises, and lesson publishing."
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openNewLesson}
            className="btn-primary inline-flex items-center gap-2 shadow-xs"
          >
            <Plus size={16} />
            <span>+ New Lesson</span>
          </button>
          <Link to="/teacher/ai" className="btn-secondary inline-flex items-center gap-2">
            <Sparkles size={16} className="text-secondary" />
            <span>AI Authoring Tools</span>
          </Link>
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center justify-between rounded-control border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-xs hover:underline text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Published Lessons
            </span>
            <FileCheck size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{publishedCount}</p>
          <span className="text-xs text-ink-muted font-medium">Live for Class 8 Students</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Draft Lessons
            </span>
            <Edit3 size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{draftCount}</p>
          <span className="text-xs text-ink-muted font-medium">In Development / Review</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Avg Student Completion
            </span>
            <BarChart2 size={18} className="text-secondary" />
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{avgCompletion}%</p>
          <span className="text-xs text-ink-muted font-medium">Across All Enrolled Learners</span>
        </div>

        <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Video Checkpoints
            </span>
            <Film size={18} className="text-teal-600" />
          </div>
          <p className="mt-2 font-heading text-2xl font-extrabold text-ink">{withVideoCount}</p>
          <span className="text-xs text-ink-muted font-medium">Interactive Checkpoints Active</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-surface border border-border bg-surface p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lessons by title, topic, or course code..."
              className="w-full min-h-10 rounded-control border border-border bg-page-bg pl-9 pr-3 text-xs sm:text-sm text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Pills */}
            <div className="flex items-center rounded-control border border-border bg-page-bg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "all" ? "bg-surface font-bold text-ink shadow-2xs" : "text-ink-muted hover:text-ink"}`}
              >
                All ({lessons.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "published" ? "bg-emerald-50 text-emerald-800 font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("draft")}
                className={`px-3 py-1.5 rounded-control transition-all ${statusFilter === "draft" ? "bg-amber-50 text-amber-800 font-bold shadow-2xs" : "text-ink-muted hover:text-ink"}`}
              >
                Draft ({draftCount})
              </button>
            </div>

            {/* Topic Filter */}
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="min-h-9 rounded-control border border-border bg-page-bg px-2.5 text-xs font-medium text-ink outline-none"
            >
              <option value="all">All Topics</option>
              <option value="Linear Equations">Linear Equations</option>
              <option value="Variables & Expressions">Variables & Expressions</option>
              <option value="Safety & Tools">Safety & Tools</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lessons Table */}
      <div className="rounded-surface border border-border bg-surface overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-border bg-page-bg/60 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th className="py-3 px-4">Lesson Details</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Topic / Scope</th>
                <th className="py-3 px-4">Video Checkpoint</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-muted">
                    No curriculum lessons matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLessons.map((l) => (
                  <tr key={l.id} className="hover:bg-page-bg/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-ink">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span>{l.title}</span>
                          <span className="font-mono text-xs px-1.5 py-0.2 rounded border border-border text-ink-muted">
                            {l.courseCode}
                          </span>
                        </div>
                        <div className="text-xs font-normal text-ink-muted flex items-center gap-2">
                          <span>Est. 15 mins</span>
                          <span>·</span>
                          <span>{l.completionRate}% completion</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full capitalize">
                        {l.kind}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-ink-muted font-medium text-xs">
                      {l.topic || "Algebra I"}
                    </td>
                    <td className="py-3.5 px-4">
                      {l.videoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCheckpointLesson(l);
                            setCheckpointTime(l.checkpointTimestamp || "01:30");
                            setCheckpointQ(l.checkpointQuestion || "");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-1 rounded-md hover:bg-teal-100 transition-colors"
                        >
                          <Film size={13} className="text-teal-700" />
                          <span>@{l.checkpointTimestamp || "01:30"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCheckpointLesson(l);
                            setCheckpointTime("01:30");
                            setCheckpointQ("");
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-secondary hover:underline"
                        >
                          <Plus size={13} />
                          <span>Attach Video</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(l)}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                          l.published
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500/20"
                        }`}
                        title="Click to toggle Published / Draft"
                      >
                        <span
                          className={`size-1.5 rounded-full ${l.published ? "bg-emerald-600" : "bg-amber-600"}`}
                        />
                        <span>{l.published ? "Published" : "Draft"}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewLesson(l)}
                          className="p-1.5 text-ink-muted hover:text-secondary rounded hover:bg-muted"
                          title="Preview Lesson"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditLesson(l)}
                          className="p-1.5 text-ink-muted hover:text-ink rounded hover:bg-muted"
                          title="Edit Lesson"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(l.id)}
                          className="p-1.5 text-ink-muted hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete Lesson"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New / Edit Lesson Modal */}
      <Dialog open={isNewOrEditOpen} onOpenChange={setIsNewOrEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">
              {editingLesson ? "Edit Curriculum Lesson" : "Create New Curriculum Lesson"}
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Define learning objectives, interactive video attachments, and student guidelines.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLesson} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">Lesson Title *</label>
              <input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g. Solving Multi-Step Linear Equations"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Lesson Type</label>
                <select
                  value={lessonKind}
                  onChange={(e) => setLessonKind(e.target.value as LessonKind)}
                  className={inputClass}
                >
                  <option value="reading">Interactive Reading</option>
                  <option value="practice">Step-by-Step Practice</option>
                  <option value="review">Review & Mastery</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Course Code</label>
                <input
                  type="text"
                  value={lessonCourseCode}
                  onChange={(e) => setLessonCourseCode(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">Curriculum Topic</label>
              <input
                type="text"
                value={lessonTopic}
                onChange={(e) => setLessonTopic(e.target.value)}
                placeholder="e.g. Linear Equations"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Interactive Video URL (Optional)
              </label>
              <input
                type="url"
                value={lessonVideo}
                onChange={(e) => setLessonVideo(e.target.value)}
                placeholder="https://commondatastorage.googleapis.com/... or MP4 link"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Lesson Content (Markdown)
              </label>
              <textarea
                rows={6}
                value={lessonBody}
                onChange={(e) => setLessonBody(e.target.value)}
                className="w-full rounded-control border border-border bg-surface p-2.5 font-mono text-xs text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="publish-toggle"
                checked={lessonPublished}
                onChange={(e) => setLessonPublished(e.target.checked)}
                className="rounded border-border text-secondary focus:ring-secondary"
              />
              <label htmlFor="publish-toggle" className="text-xs font-semibold text-ink">
                Publish immediately to Class 8 student portal
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsNewOrEditOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary text-xs font-bold">
                {saving ? "Saving..." : editingLesson ? "Update Lesson" : "Create Lesson"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attach Video Checkpoint Modal */}
      <Dialog open={checkpointLesson !== null} onOpenChange={() => setCheckpointLesson(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold flex items-center gap-2">
              <Film size={18} className="text-secondary" />
              <span>Attach Video Checkpoint</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Configure an interactive in-video question prompt for "{checkpointLesson?.title}".
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCheckpoint} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Pause Timestamp (MM:SS)
              </label>
              <input
                type="text"
                required
                value={checkpointTime}
                onChange={(e) => setCheckpointTime(e.target.value)}
                placeholder="01:30"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Concept Check Question Prompt
              </label>
              <textarea
                rows={3}
                required
                value={checkpointQ}
                onChange={(e) => setCheckpointQ(e.target.value)}
                placeholder="e.g. What operation should you perform to isolate x on the left side?"
                className="w-full rounded-control border border-border bg-surface p-2.5 text-xs text-ink outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCheckpointLesson(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs font-bold">
                Save Checkpoint
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Lesson Modal */}
      <Dialog open={previewLesson !== null} onOpenChange={() => setPreviewLesson(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary/10 text-secondary uppercase font-mono">
                {previewLesson?.courseCode}
              </span>
              <DialogTitle className="font-heading text-lg font-bold">
                {previewLesson?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-ink-muted">
              Student-facing preview mode with active layout and typography.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {previewLesson?.videoUrl && (
              <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center text-white relative">
                <video
                  src={previewLesson.videoUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="rounded-control bg-page-bg p-4 border border-border prose prose-sm max-w-none text-ink text-xs sm:text-sm">
              <div className="font-heading font-bold text-base text-ink mb-2">
                {previewLesson?.title}
              </div>
              <p className="whitespace-pre-line text-ink-muted">{previewLesson?.bodyMd}</p>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="btn-primary text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={toDelete !== null}
        title="Delete Lesson"
        body="Are you sure you want to delete this curriculum lesson? Students enrolled in Class 8 will no longer have access to this module."
        confirmLabel="Delete Lesson"
        cancelLabel="Cancel"
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
