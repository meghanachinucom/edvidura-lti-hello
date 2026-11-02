import { t } from "@/i18n";

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

const istDayNumber = (d: Date) => Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);

/** Formats a UTC ISO timestamp in IST: "Today, 10:42 IST", "Yesterday, 18:05 IST" or "21 Oct, 16:05 IST". */
export function formatIST(utcIso: string, now: Date = new Date()): string {
  const src = new Date(utcIso);
  const d = new Date(src.getTime() + IST_OFFSET_MS);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const time = `${hh}:${mm} ${t("shared.time.ist")}`;
  const diff = istDayNumber(now) - istDayNumber(src);
  if (diff === 0) return `${t("shared.time.today")}, ${time}`;
  if (diff === 1) return `${t("shared.time.yesterday")}, ${time}`;
  const month = t(`shared.time.months.${d.getUTCMonth()}`);
  return `${d.getUTCDate()} ${month}, ${time}`;
}
