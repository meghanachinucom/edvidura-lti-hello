export type OpsConnection = "connected" | "attention" | "notConnected";
export interface OpsInstituteRow { id: string; name: string; moodleSite: string; connection: OpsConnection; learners: number; lastResultAt: string | null }

/** Operator console: 3 fictional institutes. */
export const opsInstitutes: OpsInstituteRow[] = [
  { id: "oi-1", name: "Suryamala ITI", moodleSite: "https://moodle.example.org", connection: "connected", learners: 8, lastResultAt: "2026-10-23T05:12:00Z" },
  { id: "oi-2", name: "Demo Institute B", moodleSite: "https://moodle-b.example.org", connection: "attention", learners: 24, lastResultAt: "2026-10-20T07:30:00Z" },
  { id: "oi-3", name: "Demo Institute C", moodleSite: "https://moodle-c.example.org", connection: "notConnected", learners: 0, lastResultAt: null },
];

/** OP-02 figures. Quiz attempts per institute (keyed by row id). */
export const opsQuizAttempts: Record<string, number> = { "oi-1": 10, "oi-2": 31, "oi-3": 0 };
/** Institutes with no activity in the last 7 days. */
export const opsQuietIds = ["oi-3"];
/** Last 7 days, platform-wide counts. */
export const opsDaily = [
  { day: "17 Oct", launches: 12, attempts: 5 }, { day: "18 Oct", launches: 9, attempts: 4 },
  { day: "19 Oct", launches: 3, attempts: 1 }, { day: "20 Oct", launches: 14, attempts: 8 },
  { day: "21 Oct", launches: 11, attempts: 6 }, { day: "22 Oct", launches: 15, attempts: 9 },
  { day: "23 Oct", launches: 7, attempts: 4 },
];
export const opsScoreBands = [
  { label: "0–39%", value: 6 }, { label: "40–59%", value: 9 }, { label: "60–79%", value: 16 }, { label: "80–100%", value: 10 },
];
/** Prototype owner key; any other value is rejected. */
export const OPS_DEMO_KEY = "demo-owner-key";
