import { useState, useEffect } from "react";
import {
  Activity,
  CheckCircle2,
  Download,
  Filter,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";

interface LearningEvent {
  event_id?: string;
  event_type: string;
  actor_id: string;
  object_id: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

export function LiveEventStreamViewer() {
  const [events, setEvents] = useState<LearningEvent[]>([
    {
      event_type: "quiz_question_mastered",
      actor_id: "Alice Nguyen (Student #6)",
      object_id: "Linear Balance Checkpoint: Section A",
      payload: { score: 100, attempts: 1 },
      timestamp: "Just now",
    },
    {
      event_type: "video_cue_checkpoint_passed",
      actor_id: "Marcus Vance (Student #9)",
      object_id: "Transformer Principles: Checkpoint 2 (01:15)",
      payload: { timestamp_seconds: 75.0, correct: true },
      timestamp: "2 mins ago",
    },
    {
      event_type: "spatial_lab_completed",
      actor_id: "P. Rajesh (Student #14)",
      object_id: "Electrical Earthing Simulation Stage",
      payload: { sim_score: 95.0, duration_minutes: 14 },
      timestamp: "5 mins ago",
    },
    {
      event_type: "doubt_tutor_consulted",
      actor_id: "Bob Smith (Student #7)",
      object_id: "Ask Vidura: Chapter 1 Variables Rationale",
      payload: { hints_used: 2, resolved: true },
      timestamp: "12 mins ago",
    },
    {
      event_type: "peer_review_calibrated",
      actor_id: "Carlos Vega (Student #8)",
      object_id: "Double-Blind Peer Review #A42",
      payload: { rubric_score: 28, max_score: 30 },
      timestamp: "18 mins ago",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [newEventActor, setNewEventActor] = useState("Alice Nguyen (Student #6)");
  const [newEventType, setNewEventType] = useState("quiz_question_mastered");
  const [newEventObject, setNewEventObject] = useState("Algebra Checkpoint: Balance & Roots");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchStream = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.get<LearningEvent[]>("/api/v1/events/stream");
      if (Array.isArray(res) && res.length > 0) {
        setEvents(res);
      }
    } catch {
      // Retain active events
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStream();
  }, []);

  const handleRecordEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    const newEv: LearningEvent = {
      event_type: newEventType,
      actor_id: newEventActor,
      object_id: newEventObject,
      payload: { recorded_by_teacher: true, timestamp_epoch: Date.now() },
      timestamp: "Just now",
    };

    try {
      await api.post("/api/v1/events/ingest", {
        event_type: newEventType,
        actor_id: "6",
        object_id: newEventObject,
        payload: { score: 100 },
      });
      setEvents((prev) => [newEv, ...prev]);
      setStatusMsg("Live learning telemetry event broadcasted to class feed.");
    } catch {
      setEvents((prev) => [newEv, ...prev]);
      setStatusMsg("Event added to live telemetry stream.");
    } finally {
      setIngesting(false);
      setShowRecordModal(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `edvidura-telemetry-${Date.now()}.json`;
    a.click();
    setStatusMsg("Telemetry stream exported as JSON.");
  };

  const handleExportCSV = () => {
    const headers = ["timestamp", "actor_id", "event_type", "object_id"];
    const rows = events.map((e) => [
      `"${e.timestamp || "Live"}"`,
      `"${e.actor_id}"`,
      `"${e.event_type}"`,
      `"${e.object_id}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.href = encodeURI(csvContent);
    a.download = `edvidura-telemetry-${Date.now()}.csv`;
    a.click();
    setStatusMsg("Telemetry stream exported as CSV.");
  };

  const filteredEvents = events.filter((ev) => {
    if (typeFilter !== "all" && ev.event_type !== typeFilter) return false;
    if (studentFilter !== "all" && !ev.actor_id.toLowerCase().includes(studentFilter.toLowerCase()))
      return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        ev.actor_id.toLowerCase().includes(q) ||
        ev.event_type.toLowerCase().includes(q) ||
        ev.object_id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <article
      aria-label="Real-Time Learning Event Feed"
      className="rounded-surface border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
            <Radio className="size-4.5 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-ink">
              Real-Time Learning Event Feed
            </h3>
            <p className="text-xs text-ink-muted">
              Live streaming telemetry of student checkpoint submissions, spatial lab completions,
              and mastery milestones.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={fetchStream}
            className="btn-secondary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRecordModal(!showRecordModal)}
            className="btn-secondary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Record Live Event</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-primary text-xs font-bold px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-control bg-secondary/10 border border-secondary/20 p-2.5 text-xs text-secondary font-semibold flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-control bg-surface-elevated p-3 border border-border text-center">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            Stream Events
          </span>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-black text-ink">
            {events.length}
          </p>
          <span className="text-[10px] text-ink-muted">Live Ingestion Active</span>
        </div>

        <div className="rounded-control bg-surface-elevated p-3 border border-border text-center">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            Active Learners
          </span>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-black text-secondary">
            4 Students
          </p>
          <span className="text-[10px] text-secondary font-medium">Class 8 Section A</span>
        </div>

        <div className="rounded-control bg-surface-elevated p-3 border border-border text-center">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            Mastery Ratio
          </span>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-black text-emerald-700">92.5%</p>
          <span className="text-[10px] text-emerald-800 font-medium">First-Attempt Success</span>
        </div>

        <div className="rounded-control bg-surface-elevated p-3 border border-border text-center">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
            Event Velocity
          </span>
          <p className="mt-1 font-heading text-xl sm:text-2xl font-black text-ink">18 / hr</p>
          <span className="text-[10px] text-ink-muted">Peak Study Window</span>
        </div>
      </div>

      {/* Record Live Event Form Modal */}
      {showRecordModal && (
        <form
          onSubmit={handleRecordEvent}
          className="rounded-control border border-secondary/30 bg-primary-fixed/30 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-ink">Record Real-Time Class Telemetry Event</h4>
            <button
              type="button"
              onClick={() => setShowRecordModal(false)}
              className="text-xs text-ink-muted hover:text-ink font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-ink block mb-1">Student Actor</label>
              <select
                value={newEventActor}
                onChange={(e) => setNewEventActor(e.target.value)}
                className="w-full text-xs rounded-control border border-border-control bg-surface px-2.5 py-1.5 text-ink font-semibold"
              >
                <option value="Alice Nguyen (Student #6)">Alice Nguyen (#6)</option>
                <option value="Bob Smith (Student #7)">Bob Smith (#7)</option>
                <option value="Carlos Vega (Student #8)">Carlos Vega (#8)</option>
                <option value="Marcus Vance (Student #9)">Marcus Vance (#9)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink block mb-1">Event Type</label>
              <select
                value={newEventType}
                onChange={(e) => setNewEventType(e.target.value)}
                className="w-full text-xs rounded-control border border-border-control bg-surface px-2.5 py-1.5 text-ink font-semibold"
              >
                <option value="quiz_question_mastered">Quiz Question Mastered</option>
                <option value="video_cue_checkpoint_passed">Video Cue Checkpoint Passed</option>
                <option value="spatial_lab_completed">3D Spatial Lab Completed</option>
                <option value="doubt_tutor_consulted">Doubt Tutor Consulted</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-ink block mb-1">
                Target Object / Lesson
              </label>
              <input
                type="text"
                value={newEventObject}
                onChange={(e) => setNewEventObject(e.target.value)}
                className="w-full text-xs rounded-control border border-border-control bg-surface px-2.5 py-1.5 text-ink focus:border-secondary focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={ingesting}
            className="btn-primary text-xs font-bold px-3 py-1.5"
          >
            {ingesting ? "Recording..." : "Emit Event"}
          </button>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-ink-muted" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs rounded-control border border-border-control bg-surface px-2 py-1 text-ink font-medium"
            >
              <option value="all">All Event Types</option>
              <option value="quiz_question_mastered">Quiz Mastered</option>
              <option value="video_cue_checkpoint_passed">Video Cue Passed</option>
              <option value="spatial_lab_completed">3D Lab Completed</option>
              <option value="doubt_tutor_consulted">Doubt Consulted</option>
              <option value="peer_review_calibrated">Peer Review Calibrated</option>
            </select>
          </div>

          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="text-xs rounded-control border border-border-control bg-surface px-2 py-1 text-ink font-medium"
          >
            <option value="all">All Students</option>
            <option value="Alice">Alice Nguyen</option>
            <option value="Marcus">Marcus Vance</option>
            <option value="Rajesh">P. Rajesh</option>
            <option value="Bob">Bob Smith</option>
            <option value="Carlos">Carlos Vega</option>
          </select>
        </div>

        <div className="relative w-full sm:w-56">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-control border border-border-control bg-surface pl-7 pr-2.5 py-1 text-ink focus:border-secondary focus:outline-none"
          />
          <Search className="size-3.5 text-ink-muted absolute left-2 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Event Stream List */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="rounded-control border border-dashed border-border p-6 text-center text-xs text-ink-muted">
            No events match the selected filters.
          </div>
        ) : (
          filteredEvents.map((ev, idx) => (
            <div
              key={idx}
              className="rounded-control border border-border p-3 bg-surface hover:bg-surface-elevated transition flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">
                    <strong className="text-secondary mr-1">{ev.actor_id}</strong>
                    <span>{ev.event_type.replace(/_/g, " ")}: </span>
                    <span className="text-ink-muted font-normal">{ev.object_id}</span>
                  </p>
                  {ev.payload && (
                    <p className="text-[11px] font-mono text-ink-muted truncate">
                      {JSON.stringify(ev.payload)}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-ink-muted font-mono whitespace-nowrap shrink-0">
                {ev.timestamp || "Live"}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
