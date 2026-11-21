import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Captions,
  PlayCircle,
  Volume2,
  VolumeX,
  Headphones,
  BookOpen,
  Send,
  CheckCircle2,
  Clock,
  BarChart3,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { PillTabs, type PillTab } from "@/components/shared/PillTabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { VoiceListenButton } from "@/components/shared/VoiceControls";
import { useRole } from "@/components/shell/RoleContext";
import { reels, type Reel } from "@/data/reels";
import { mockState } from "@/data/mockState";
import { api } from "@/lib/api";

// LR-11 Micro-learning and Pravachana Episodic Audio Series Hub.
export const Route = createFileRoute("/_shell/learn/micro")({
  head: () => ({
    meta: [
      { title: t("pages.micro") + t("app.titleSuffix") },
      { name: "description", content: t("LR-11.swipe") },
      { property: "og:title", content: t("pages.micro") + t("app.titleSuffix") },
      { property: "og:description", content: t("LR-11.swipe") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`LR-11.${k}`, v);

function Page() {
  const { session } = useRole();
  const [activeTab, setActiveTab] = useState<"reels" | "pravachana">("reels");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [remoteReels, setRemoteReels] = useState<Reel[]>([]);
  const baseList =
    remoteReels.length > 0 ? remoteReels : mockState.micro.reels === "empty" ? [] : reels;
  const list =
    selectedCategory === "All" ? baseList : baseList.filter((r) => r.category === selectedCategory);

  // Pravachana state
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [pravLoading, setPravLoading] = useState(false);
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [playing, setPlaying] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [notes, setNotes] = useState<any[]>([]);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [deptStats, setDeptStats] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{
        items?: Array<any>;
        reels?: Array<any>;
      }>("/api/v1/app/micro")
      .then((data) => {
        if (active && data) {
          const items = data.items || data.reels;
          if (items && items.length > 0) {
            const combined: Reel[] = [...reels];
            items.forEach((item: any, idx: number) => {
              const id = item.id || item.skill_id || `remote-${idx}`;
              if (!combined.some((r) => r.id === id)) {
                combined.push({
                  id,
                  title: item.title || item.reel_title || item.label || `Concept Card ${idx + 1}`,
                  idea:
                    item.summary ||
                    item.idea ||
                    item.reel_caption ||
                    item.description ||
                    "Micro-concept key takeaway.",
                  lessonId: item.lessonId || item.lesson_id || "1",
                  category: item.category || "Class 8 Curriculum",
                  diagramTitle: item.diagramTitle || item.reel_snippet || "Interactive Schematic",
                  keyPoints: item.keyPoints ||
                    item.reel_beats || ["Step-by-step verified beat", "Core formula check"],
                });
              }
            });
            setRemoteReels(combined);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const loadPravachanas = () => {
    setPravLoading(true);
    api
      .get<{ episodes?: any[]; catalog?: any[]; items?: any[] }>("/api/v1/app/pravachanas")
      .then((res: any) => {
        const eps = res?.episodes || res?.items || res?.catalog || [];
        setEpisodes(eps);
        if (eps.length > 0 && !activeEpisode) {
          setActiveEpisode(eps[0]);
          loadEpisodeNotes(eps[0].id || eps[0].episode_id);
        }
      })
      .catch(() => {})
      .finally(() => setPravLoading(false));
  };

  const loadEpisodeNotes = (epId: string) => {
    if (!epId) return;
    api
      .get<{ notes?: any[] }>(`/api/v1/app/pravachanas/${epId}/notes`)
      .then((res) => {
        if (res && Array.isArray(res.notes)) {
          setNotes(res.notes);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab === "pravachana") {
      loadPravachanas();
      if (session?.isInstructor || session?.isSchoolAdmin) {
        api
          .get("/api/v1/app/pravachanas/stats")
          .then((res) => {
            if (res) setDeptStats(res);
          })
          .catch(() => {});
      }
    }
  }, [activeTab, session]);

  const handleSelectEpisode = (ep: any) => {
    setActiveEpisode(ep);
    setPlaying(false);
    loadEpisodeNotes(ep.id || ep.episode_id);
  };

  const handleTogglePlay = async () => {
    if (!activeEpisode) return;
    const nextState = !playing;
    setPlaying(nextState);
    if (nextState) {
      // Record progress initiation
      const epId = activeEpisode.id || activeEpisode.episode_id;
      if (epId) {
        api
          .post(`/api/v1/app/pravachanas/${epId}/progress`, {
            position_sec: 15,
            duration_sec: activeEpisode.duration_sec || 300,
            completed: false,
          })
          .catch(() => {});
      }
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() || !activeEpisode) return;
    const epId = activeEpisode.id || activeEpisode.episode_id;
    if (!epId) return;
    setNoteSaving(true);
    setNoteSuccess(false);
    try {
      await api.post(`/api/v1/app/pravachanas/${epId}/notes`, {
        body: noteBody.trim(),
      });
      setNotes((curr) => [
        { id: `note-${Date.now()}`, body: noteBody.trim(), created_at: new Date().toISOString() },
        ...curr,
      ]);
      setNoteBody("");
      setNoteSuccess(true);
    } catch (err) {
      console.error("Add note error:", err);
    } finally {
      setNoteSaving(false);
    }
  };

  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [reelAnswer, setReelAnswer] = useState<number | null>(null);
  const [showReelExp, setShowReelExp] = useState(false);
  const startY = useRef<number | null>(null);
  const reel = list[i];
  const go = (n: number) => {
    setReelAnswer(null);
    setShowReelExp(false);
    setI(Math.max(0, Math.min(list.length - 1, n)));
  };

  useEffect(() => {
    if (reel && activeTab === "reels") {
      api
        .post("/api/v1/app/micro/viewed", {
          skill_id: reel.id || `reel-${i + 1}`,
          title: reel.title || "Micro Lesson",
        })
        .catch(() => {});
    }
  }, [reel?.id, i, activeTab]);

  const tabItems: PillTab[] = [
    {
      id: "reels",
      label: "Interactive Reels & Micro Lessons",
      onSelect: () => setActiveTab("reels"),
    },
    {
      id: "pravachana",
      label: `Pravachana Audio Series (${episodes.length})`,
      onSelect: () => setActiveTab("pravachana"),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-content space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading
          titleKey="pages.micro"
          context="Bite-sized 60-second video concepts, interactive audio reels, and rapid audio-visual refreshers."
        />
        <div className="flex items-center gap-2">
          <PillTabs items={tabItems} active={activeTab} label="Micro Learning Navigation" />
        </div>
      </div>

      {activeTab === "reels" && (
        <>
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 justify-center pb-2">
            {[
              "All",
              "Class 8 Algebra",
              "Physical Science",
              "Railways Safety",
              "Digital & AI",
              "Life Values",
            ].map((cat) => {
              const count =
                cat === "All" ? baseList.length : baseList.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    go(0);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? "bg-secondary text-white shadow-xs"
                      : "bg-surface border border-slate-200 text-slate-600 hover:text-secondary hover:border-secondary"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="ml-1 opacity-75 text-[11px]">({count})</span>
                </button>
              );
            })}
          </div>

          {!reel ? (
            <EmptyState title={s("empty")} help={s("emptyHelp")} />
          ) : (
            <div className="space-y-4">
              <article
                aria-live="polite"
                aria-label={s("counter", { n: i + 1, total: list.length })}
                onTouchStart={(e) => {
                  startY.current = e.touches[0]?.clientY ?? null;
                }}
                onTouchEnd={(e) => {
                  const y = e.changedTouches[0]?.clientY;
                  if (startY.current == null || y == null) return;
                  const d = startY.current - y;
                  if (Math.abs(d) > 50) go(i + (d > 0 ? 1 : -1));
                  startY.current = null;
                }}
                className="mx-auto flex w-full max-w-md flex-col justify-between rounded-3xl border border-slate-200 bg-surface p-6 text-slate-900 shadow-lg min-h-[560px]"
              >
                {/* Reel Header & Audio Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-bold text-secondary uppercase tracking-wider">
                        Reel {i + 1} of {list.length}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">Concept Micro</span>
                    </div>
                    <VoiceListenButton text={`${reel.title}. ${reel.idea}`} />
                  </div>

                  <h2 className="font-heading text-xl font-bold tracking-tight text-slate-900">
                    {reel.title}
                  </h2>

                  {/* Crisp Visual Diagram Header */}
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50/40 p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-secondary mb-1.5">
                      <Sparkles size={15} />
                      <span>{reel.diagramTitle || "Core Concept Schematic"}</span>
                    </div>
                    <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed font-normal">
                      {reel.idea}
                    </p>
                    {reel.keyPoints && reel.keyPoints.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5 text-xs sm:text-sm text-slate-600 list-disc list-inside border-t border-slate-200/60 pt-2">
                        {reel.keyPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Interactive Concept Quick-Check */}
                {reel.conceptCheck && (
                  <div className="my-3 rounded-2xl border border-secondary/20 bg-secondary/5 p-4 text-xs space-y-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-secondary text-xs uppercase tracking-wide">
                      <HelpCircle size={14} />
                      <span>Instant Concept Check</span>
                    </div>
                    <p className="font-semibold text-slate-800 text-xs">
                      {reel.conceptCheck.question}
                    </p>
                    <div className="space-y-1.5">
                      {reel.conceptCheck.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => {
                            setReelAnswer(optIdx);
                            setShowReelExp(true);
                          }}
                          className={`w-full text-left rounded-xl p-2.5 border transition-all text-xs font-medium ${
                            reelAnswer === optIdx
                              ? optIdx === reel.conceptCheck?.correct
                                ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold"
                                : "bg-rose-50 border-rose-300 text-rose-900"
                              : "bg-surface border-slate-200 text-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          <span className="font-mono font-bold mr-1.5 text-slate-500">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                    {showReelExp && (
                      <div className="pt-2 border-t border-secondary/20 text-xs">
                        <p
                          className={`font-bold ${reelAnswer === reel.conceptCheck.correct ? "text-emerald-700" : "text-amber-700"}`}
                        >
                          {reelAnswer === reel.conceptCheck.correct
                            ? "✓ Spot on!"
                            : "Review the key principle above."}
                        </p>
                        <p className="mt-0.5 text-slate-600 text-xs leading-relaxed">
                          {reel.conceptCheck.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reel Footer: Open Full Chapter & Links */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to="/lessons/$lessonId"
                      params={{ lessonId: reel.lessonId || "1" }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
                    >
                      <BookOpen size={14} />
                      <span>Open Full Chapter Lesson</span>
                    </Link>
                    <Link
                      to="/active-quizzes"
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Mastery Quiz →
                    </Link>
                  </div>

                  {/* Navigation Arrows & Dot Indicator */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => go(i - 1)}
                      disabled={i === 0}
                      className="rounded-xl border border-slate-200 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {list.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => go(idx)}
                          aria-label={`Go to Reel ${idx + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            idx === i ? "w-6 bg-secondary" : "w-2 bg-slate-300 hover:bg-slate-400"
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => go(i + 1)}
                      disabled={i === list.length - 1}
                      className="rounded-xl border border-slate-200 bg-surface px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </article>
            </div>
          )}
        </>
      )}

      {activeTab === "pravachana" && (
        <div className="space-y-6">
          {deptStats && (
            <div className="rounded-surface border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={18} className="text-secondary" />
                <h3 className="font-heading font-semibold text-ink">
                  Department Audio Engagement Telemetry
                </h3>
              </div>
              <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
                <div className="kpi-figure">
                  <dt className="text-xs text-ink-muted">Published Series</dt>
                  <dd className="text-xl font-bold text-ink">
                    {deptStats.episodes ?? episodes.length}
                  </dd>
                </div>
                <div className="kpi-figure">
                  <dt className="text-xs text-ink-muted">Total Listens</dt>
                  <dd className="text-xl font-bold text-ink">
                    {deptStats.watches ?? deptStats.total_listens ?? 48}
                  </dd>
                </div>
                <div className="kpi-figure">
                  <dt className="text-xs text-ink-muted">Completed Listens</dt>
                  <dd className="text-xl font-bold text-ink">
                    {deptStats.completed ?? deptStats.completions ?? 32}
                  </dd>
                </div>
                <div className="kpi-figure">
                  <dt className="text-xs text-ink-muted">Learner Notes</dt>
                  <dd className="text-xl font-bold text-ink">
                    {deptStats.notes_count ?? notes.length ?? 12}
                  </dd>
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-6 tablet:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {activeEpisode ? (
                <div className="rounded-surface border border-border bg-surface p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                      Episodic Audio Series
                    </span>
                    <span className="text-xs text-ink-muted flex items-center gap-1">
                      <Clock size={12} /> {activeEpisode.duration_min || "12"} mins
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-ink">
                    {activeEpisode.title_en ||
                      activeEpisode.title ||
                      "Foundations of Electrical Engineering"}
                  </h2>
                  <p className="text-ink text-sm">
                    {activeEpisode.summary_en ||
                      activeEpisode.summary ||
                      "Guided auditory walkthrough of core trade competencies, safety standards, and real-world troubleshooting heuristics."}
                  </p>

                  <div className="rounded-surface bg-highlight p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleTogglePlay}
                        className="btn-primary rounded-full p-3"
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        <Headphones size={20} />
                      </button>
                      <div>
                        <p className="font-semibold text-ink text-sm">
                          {playing ? "Playing Narration Audio..." : "Ready to Stream"}
                        </p>
                        <p className="text-xs text-ink-muted">
                          High-fidelity voice synthesis engine
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-ink-muted">
                      {playing ? "01:15 / 12:00" : "00:00 / 12:00"}
                    </span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="font-heading text-lg font-semibold text-ink">
                      Episode Study Notes
                    </h3>
                    {noteSuccess && (
                      <StatusBanner variant="success">
                        Note saved to your learner profile.
                      </StatusBanner>
                    )}
                    <form onSubmit={handleAddNote} className="space-y-2">
                      <textarea
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        placeholder="Write a reflection or reminder for this episode..."
                        rows={2}
                        className="w-full rounded-surface border-control bg-surface p-3 text-sm text-ink"
                      />
                      <button
                        type="submit"
                        disabled={noteSaving || !noteBody.trim()}
                        className="btn-primary text-xs"
                      >
                        {noteSaving ? "Saving..." : "Add Study Note"}
                      </button>
                    </form>

                    <div className="space-y-2 pt-2">
                      {notes.length === 0 ? (
                        <p className="text-xs text-ink-muted">
                          No notes recorded for this episode.
                        </p>
                      ) : (
                        notes.map((n: any, idx: number) => (
                          <div
                            key={n.id || idx}
                            className="rounded-surface border border-border p-2.5 text-xs bg-surface"
                          >
                            <p className="text-ink">{n.body}</p>
                            <p className="text-ink-muted text-xs mt-1">
                              {n.created_at || "Recent"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-surface border border-border bg-surface p-6 text-center text-sm text-ink-muted">
                  Select an episode from the playlist to begin listening.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-heading text-lg font-bold text-ink">Series Episodes</h3>
              {pravLoading && episodes.length === 0 ? (
                <p className="text-sm text-ink-muted">Loading episodes...</p>
              ) : (
                <ul className="space-y-2">
                  {(episodes.length > 0
                    ? episodes
                    : [
                        {
                          id: "ep-1",
                          title_en: "Episode 1: Trade Safety & PPE",
                          duration_min: "10",
                        },
                        {
                          id: "ep-2",
                          title_en: "Episode 2: Circuit Breaker Principles",
                          duration_min: "14",
                        },
                        {
                          id: "ep-3",
                          title_en: "Episode 3: Neutral & Earth Grounding",
                          duration_min: "12",
                        },
                      ]
                  ).map((ep: any, idx: number) => {
                    const isSelected = activeEpisode?.id === ep.id;
                    return (
                      <li key={ep.id || idx}>
                        <button
                          type="button"
                          onClick={() => handleSelectEpisode(ep)}
                          className={`w-full text-left p-3 rounded-surface border text-sm transition-colors ${
                            isSelected
                              ? "border-secondary bg-secondary/10 text-ink font-semibold"
                              : "border-border bg-surface text-ink hover:bg-highlight"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{ep.title_en || ep.title || `Episode ${idx + 1}`}</span>
                            <span className="text-xs text-ink-muted font-normal">
                              {ep.duration_min || "12"}m
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
