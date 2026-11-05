import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { focusDayKeys, learnerFocus, performanceCounts, type FocusPeriod } from "@/data/learnerFocus";
import { t } from "@/i18n";

const s = (key: string, values?: Record<string, string | number>) => t(`learnerFocus.${key}`, values);
type CardKey = "focus" | "rhythm" | "map" | "performance";

function PeriodSelect({ period, onChange, id }: { period: FocusPeriod; onChange: (period: FocusPeriod) => void; id: string }) {
  return (
    <select id={id} value={period} onChange={(event) => onChange(event.target.value as FocusPeriod)} className="min-h-11 rounded-control border border-border-control bg-surface px-3 text-sm text-ink">
      <option value="thisWeek">{s("thisWeek")}</option>
      <option value="lastWeek">{s("lastWeek")}</option>
    </select>
  );
}

function CardHeading({ title, id, period, onChange }: { title: string; id: string; period: FocusPeriod; onChange: (period: FocusPeriod) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={`${id}-title`} className="font-heading text-xl text-ink">{s(title)}</h2>
      <label className="sr-only" htmlFor={`${id}-period`}>{s("periodLabel", { title: s(title) })}</label>
      <PeriodSelect id={`${id}-period`} period={period} onChange={onChange} />
    </div>
  );
}

export function LearnerFocusAnalytics() {
  const [periods, setPeriods] = useState<Record<CardKey, FocusPeriod>>({ focus: "thisWeek", rhythm: "thisWeek", map: "thisWeek", performance: "thisWeek" });
  const selectPeriod = (card: CardKey) => (period: FocusPeriod) => setPeriods((current) => ({ ...current, [card]: period }));
  const focus = learnerFocus[periods.focus];
  const rhythm = learnerFocus[periods.rhythm];
  const map = learnerFocus[periods.map];
  const performance = periods.performance === "thisWeek" ? performanceCounts : { productive: 2, neutral: 2, distracted: 2 };
  const bestDays = new Set([...rhythm.rhythm].sort((a, b) => b.hours - a.hours).slice(0, 2).map((day) => day.day));

  return (
    <div className="space-y-4">
      <section aria-labelledby="focus-time-title" className="rounded-surface border border-border bg-surface p-4 tablet:p-5">
        <CardHeading title="focusTime" id="focus-time" period={periods.focus} onChange={selectPeriod("focus")} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
          <p className="font-heading text-3xl font-bold text-ink">{focus.total}</p>
          <p className="text-sm text-ink-muted">{s("versusLastWeek", { time: focus.previousTotal, change: focus.changeMinutes })}</p>
        </div>
        <div className="mt-3 h-48 w-full" role="img" aria-label={s("focusChartLabel")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={focus.area} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <defs><linearGradient id="learner-focus-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--secondary)" stopOpacity={0.02} /></linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(day: string) => s(`days.${day}`)} tickLine={false} axisLine={false} />
              <YAxis unit="m" tickLine={false} axisLine={false} />
              <Tooltip labelFormatter={(day) => s(`days.${String(day)}`)} formatter={(value) => [`${value} ${s("minutes")}`, s("focusTime")]} />
              <Area type="monotone" dataKey="minutes" stroke="var(--secondary)" strokeWidth={3} fill="url(#learner-focus-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-labelledby="study-rhythm-title" className="rounded-surface border border-border bg-surface p-4 tablet:p-5">
        <CardHeading title="studyRhythm" id="study-rhythm" period={periods.rhythm} onChange={selectPeriod("rhythm")} />
        <div className="mt-5 grid grid-cols-7 gap-2">
          {rhythm.rhythm.map((day) => <div key={day.day} className="flex min-w-0 flex-col items-center gap-2">
            <span className="text-xs text-ink-muted">{day.hours.toFixed(1)}h</span>
            <div className="flex h-28 w-full max-w-10 items-end overflow-hidden rounded-t-control bg-page-bg">
              <div className={`w-full rounded-t-control ${bestDays.has(day.day) ? "bg-secondary" : "bg-ink-muted"}`} style={{ height: `${day.hours / Math.max(...rhythm.rhythm.map((item) => item.hours)) * 100}%` }} />
            </div>
            <span className="text-xs text-ink-muted">{s(`days.${day.day}`)}</span>
          </div>)}
        </div>
        <p className="mt-3 text-sm text-ink-muted">{s("bestTwoDays")}</p>
      </section>

      <section aria-labelledby="focus-map-title" className="rounded-surface border border-border bg-surface p-4 tablet:p-5">
        <CardHeading title="focusMap" id="focus-map" period={periods.map} onChange={selectPeriod("map")} />
        <div className="mt-5 grid grid-cols-7 gap-2">
          {map.density.map((density, dayIndex) => <div key={focusDayKeys[dayIndex]} className="flex flex-col items-center gap-2">
            <span className="text-xs text-ink-muted">{s(`days.${focusDayKeys[dayIndex]}`)}</span>
            <div className="flex flex-col-reverse gap-1.5" aria-label={s("focusDensity", { day: s(`days.${focusDayKeys[dayIndex]}`), level: density >= 4 ? s("high") : density >= 2 ? s("medium") : s("low") })}>
              {Array.from({ length: 5 }, (_, dotIndex) => <span key={dotIndex} className={`size-3 rounded-full ${dotIndex < density ? (density >= 4 ? "bg-secondary" : density >= 2 ? "bg-highlight" : "bg-border") : "bg-page-bg"}`} />)}
            </div>
          </div>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted" aria-label={s("legend")}>
          {([["high", "bg-secondary"], ["medium", "bg-highlight"], ["low", "bg-border"]] as const).map(([label, color]) => <span key={label} className="inline-flex items-center gap-2"><span className={`size-3 rounded-full ${color}`} />{s(label)}</span>)}
        </div>
      </section>

      <section aria-labelledby="performance-title" className="rounded-surface border border-border bg-surface p-4 tablet:p-5">
        <CardHeading title="performance" id="performance" period={periods.performance} onChange={selectPeriod("performance")} />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {([["productive", performance.productive, 78], ["neutral", performance.neutral, 54], ["distracted", performance.distracted, 30]] as const).map(([key, count, percent]) => <div key={key} className="flex min-w-0 flex-col items-center text-center">
            <div className="scale-[0.78] origin-center tablet:scale-100"><ProgressRing percent={percent} label={s(key)} /></div>
            <span className="-mt-4 text-sm font-semibold text-ink">{count} {s("items")}</span>
          </div>)}
        </div>
      </section>
    </div>
  );
}
