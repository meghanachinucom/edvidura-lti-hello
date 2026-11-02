/**
 * Review switches for every screen state. Edit these values to see a state.
 * PROTOTYPE ONLY — reviewers change this file; nothing is stored in the browser.
 */
export type ScreenState = "ready" | "loading" | "empty" | "error" | "slow" | "unavailable";

export const mockState = {
  /** true = every signed-in screen shows SessionExpired. Or list paths, e.g. ["/lessons"]. */
  sessionExpired: false as boolean | string[],
  /** Per-screen state, keyed by route path, e.g. { "/lessons": "unavailable" }. Missing paths are "ready". */
  screens: {} as Record<string, ScreenState>,
  /** Milliseconds a "slow" mock action takes before SlowNetworkNote appears. */
  slowAfterMs: 3000,
  /** SH-04 Receipt verify: "auto" checks the pasted text against receipts.ts; or force a result. */
  receiptVerify: { result: "auto" as "auto" | "valid" | "invalid", checkingMs: 800 },
  /** SH-05 Deep link picker. */
  deepLink: { list: "populated" as "populated" | "empty", submit: "success" as "success" | "error", submittingMs: 800 },
  /** SH-06 Institute connect. The one admin key the prototype accepts. */
  onboard: { validAdminKey: "demo-admin-key" },
  /** SH-07 Moodle registration state. */
  ltiRegister: "waiting" as "waiting" | "done",
  /** LR-01 / LR-02 lessons. list: populated, empty or loading. fromMiss = arrived from a missed quiz question. */
  lessons: {
    list: "populated" as "populated" | "empty" | "loading",
    fromMiss: false,
    save: "success" as "success" | "error",
    savingMs: 800,
  },
  /** LR-03 / LR-04 / LR-06 quizzes. "/quiz" shows the gate or (Batch L3) the session. */
  quiz: {
    mode: "gate" as "gate" | "session",
    gate: "ready" as "ready" | "submitted" | "noQuestions" | "unavailable",
    gateType: "graded" as "graded" | "practice",
    /** Attempt the gate "View result" link opens when already submitted. */
    submittedAttemptId: "at-m3",
    history: "populated" as "populated" | "empty",
    loadingMs: 400,
    /** "auto" uses the attempt's own Moodle status; or force one. */
    resultMoodle: "auto" as "auto" | "sent" | "error" | "unavailable" | "practice",
    /** true = every answer shown as correct (no-misses state). */
    resultNoMisses: false,
    gradedRetryAvailable: true,
    /** LR-05 Quiz session. */
    sessionType: "practice" as "graded" | "practice",
    /** slow = takes 5 s so SlowNetworkNote shows; sessionExpired = SessionExpired on submit. */
    submit: "success" as "success" | "error" | "slow" | "sessionExpired",
    submittingMs: 800,
  },
  /** LR-07 Ask Vidura. reply: "auto" uses the pre-written answer; or force a variant. */
  coach: { lessonsLinked: true, reply: "auto" as "auto" | "noSources" | "error", thinkingMs: 1500 },
  /** LR-08 AI hint. */
  hint: { state: "ready" as "ready" | "unavailable" | "error", loadingMs: 1000 },
  /** LR-10 Flashcards. */
  flashcards: { deck: "populated" as "populated" | "empty" },
  /** LR-09 My plan. step = current loop step (1 Review, 2 Practise, 3 Graded retry). */
  plan: { open: true, step: 2 as 1 | 2 | 3, save: "success" as "success" | "error" },
  /** LR-11 Micro-learning. */
  micro: { reels: "populated" as "populated" | "empty" },
  /** LR-12 / LR-13. passMark is the percentage shown on My analytics. */
  analytics: { attempts: "populated" as "populated" | "empty", passMark: 60 },
  activity: { rows: "populated" as "populated" | "empty", loadingMs: 400 },
  /** LR-14 eBook library. unavailableId = a book that opens the "not available" page. */
  library: { list: "populated" as "populated" | "empty", unavailableId: null as string | null },
  /** LR-15 reader. slow = loading long enough for SlowNetworkNote. */
  reader: {
    state: "ready" as "ready" | "loading" | "slow" | "renderError" | "chapterMissing",
    loadingMs: 600,
    save: "success" as "success" | "error",
    savingMs: 800,
  },
  /** TC-01 / TC-02 / TC-05 instructor screens. upload: slow = long enough for SlowNetworkNote. */
  teacher: {
    attempts: "populated" as "populated" | "empty" | "loading",
    savingMs: 800,
    manuals: "populated" as "populated" | "empty",
    upload: "success" as "success" | "error" | "slow",
    uploadMs: 1600,
    /** TC-03 / TC-04 / TC-19 */
    analytics: "populated" as "populated" | "empty" | "loading",
    activity: "populated" as "populated" | "empty" | "loading",
    moodle: "connected" as "connected" | "notConnected",
    /** TC-08 AI Author: draft = a draft appears; none = no draft produced. */
    author: { result: "draft" as "draft" | "none", save: "success" as "success" | "error", draftingMs: 1200 },
    /** TC-09 / TC-10 / TC-11: draft "error" = drafting fails; save "error" = saving fails. */
    remediation: { draft: "success" as "success" | "error", save: "success" as "success" | "error", draftingMs: 1200 },
    simplify: { draft: "success" as "success" | "error", save: "success" as "success" | "error", draftingMs: 1200 },
    gradeAssist: { draft: "success" as "success" | "error", draftingMs: 1200 },
    /** TC-12 / TC-13 / TC-14. selectedRole null = no role selected. */
    coachInsights: "populated" as "populated" | "empty" | "loading",
    shortcuts: "populated" as "populated" | "empty",
    selectedRole: "tr-1" as string | null,
    /** TC-15 / TC-16. */
    sme: "populated" as "populated" | "empty",
    dct: "populated" as "populated" | "allLinked" | "empty",
    /** TC-17 / TC-18. */
    institutions: "populated" as "populated" | "empty",
    directory: "populated" as "populated" | "empty",
    /** TC-07 generation preview. source "file" shows fileName. */
    generate: {
      state: "loaded" as "loaded" | "none" | "unreadable",
      source: "prompt" as "prompt" | "file",
      fileName: "Earthing notes.pdf",
      save: "success" as "success" | "error",
      savingMs: 800,
    },
  },
  /** SA-01 / SA-02 / SA-03 Training Officer screens. */
  /** OP-01/OP-02 operator console. */
  ops: {
    dashboard: "populated" as "populated" | "loading" | "error",
    submitMs: 800,
  },
  schoolAdmin: {
    home: "populated" as "populated" | "empty" | "loading",
    instructors: "populated" as "populated" | "empty" | "loading",
    classes: "populated" as "populated" | "empty",
    /** SA-04..SA-07 */
    students: "populated" as "populated" | "empty",
    analytics: "populated" as "populated" | "empty" | "loading",
    activity: "populated" as "populated" | "empty" | "loading",
    /** detail: or "error"; detailEmpty lists sections to show empty: instructors, classes, attempts, officers. */
    detail: "populated" as "populated" | "loading" | "error",
    detailEmpty: [] as ("instructors" | "classes" | "attempts" | "officers")[],
    /** M5: flips the institute detail Moodle status between Synced and Not synced. */
    moodleSynced: true as boolean,
    loadingMs: 400,
  },
  /** SH-02 Launch hub switches. */
  launchHub: {
    recentAttempts: "populated" as "populated" | "empty",
    nextLesson: "present" as "present" | "none",
    loadingMs: 400,
  },
};

export function isSessionExpired(path: string): boolean {
  const s = mockState.sessionExpired;
  return s === true || (Array.isArray(s) && s.includes(path));
}

export function screenState(path: string): ScreenState {
  return mockState.screens[path] ?? "ready";
}
