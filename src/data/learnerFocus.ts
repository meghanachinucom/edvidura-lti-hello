export type FocusPeriod = "thisWeek" | "lastWeek";

export const learnerFocus = {
  thisWeek: {
    total: "7h 24m",
    previousTotal: "6h 48m",
    changeMinutes: 36,
    area: [
      { day: "mon", minutes: 52 }, { day: "tue", minutes: 68 }, { day: "wed", minutes: 41 },
      { day: "thu", minutes: 76 }, { day: "fri", minutes: 63 }, { day: "sat", minutes: 82 }, { day: "sun", minutes: 62 },
    ],
    rhythm: [
      { day: "mon", hours: 0.8 }, { day: "tue", hours: 1 }, { day: "wed", hours: 0.6 },
      { day: "thu", hours: 1.2 }, { day: "fri", hours: 1 }, { day: "sat", hours: 1.5 }, { day: "sun", hours: 1.3 },
    ],
    density: [2, 4, 2, 5, 3, 5, 3],
  },
  lastWeek: {
    total: "6h 48m",
    previousTotal: "6h 12m",
    changeMinutes: 36,
    area: [
      { day: "mon", minutes: 45 }, { day: "tue", minutes: 57 }, { day: "wed", minutes: 38 },
      { day: "thu", minutes: 68 }, { day: "fri", minutes: 55 }, { day: "sat", minutes: 79 }, { day: "sun", minutes: 66 },
    ],
    rhythm: [
      { day: "mon", hours: 0.7 }, { day: "tue", hours: 0.9 }, { day: "wed", hours: 0.6 },
      { day: "thu", hours: 1.1 }, { day: "fri", hours: 0.9 }, { day: "sat", hours: 1.4 }, { day: "sun", hours: 1.2 },
    ],
    density: [2, 3, 2, 4, 3, 5, 4],
  },
};

export const focusDayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const performanceCounts = { productive: 2, neutral: 3, distracted: 1 } as const;
