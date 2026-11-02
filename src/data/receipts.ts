import type { AttemptKind, MoodleStatus } from "./attempts";

/**
 * Mock receipt files. In the prototype a pasted receipt is "valid" when it matches one of these
 * texts exactly; anything else is "invalid". The receipt text itself is never shown on screen.
 */
export interface Receipt { text: string; learnerName: string; quizTitle: string; issuedAt: string; score: number; kind: AttemptKind; moodleStatus: MoodleStatus }

export const receipts: Receipt[] = [
  { text: "EDV1.SITI.7Q4M-WARM-UP.SEAL-3F9A2C", learnerName: "Meena Rathod", quizTitle: "Safety warm-up", issuedAt: "2026-10-19T05:30:00Z", score: 4, kind: "graded", moodleStatus: "sent" },
  { text: "EDV1.SITI.8K2P-EARTHING.SEAL-B71D04", learnerName: "Meena Rathod", quizTitle: "Earthing basics quiz", issuedAt: "2026-10-21T10:35:00Z", score: 3, kind: "graded", moodleStatus: "unavailable" },
  { text: "EDV1.SITI.9R5T-CHECKPOINT.SEAL-C02E88", learnerName: "Meena Rathod", quizTitle: "Checkpoint quiz", issuedAt: "2026-10-23T05:12:00Z", score: 2, kind: "practice", moodleStatus: "practice" },
];

export const findReceipt = (pasted: string) => receipts.find((r) => r.text === pasted.trim());
