import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateCircuit, circuitSettings, type CircuitFault } from "@/data/circuit";
import { t } from "@/i18n";

const s = (key: string, values?: Record<string, string | number>) => t(`pass3.circuit.${key}`, values);

export function CircuitWorkbench() {
  const id = useId();
  const [voltage, setVoltage] = useState<number>(circuitSettings.voltage.initial);
  const [resistance, setResistance] = useState<number>(circuitSettings.resistance.initial);
  const [earthed, setEarthed] = useState(true);
  const [trip, setTrip] = useState<CircuitFault | null>(null);
  const circuit = calculateCircuit(voltage, resistance, earthed);
  const reason = circuit.fault ?? trip;
  const update = (v: number, r: number, earth: boolean) => {
    setVoltage(v); setResistance(r); setEarthed(earth);
    const fault = calculateCircuit(v, r, earth).fault;
    if (fault) setTrip(fault);
  };
  return <section className="mt-8 max-w-reading space-y-5 rounded-surface border border-border bg-surface p-4 tablet:p-6 text-ink">
    <h2 className="font-heading text-[22px]">{s("title")}</h2>
    <div className="grid gap-5 tablet:grid-cols-2">
      <div>
        <label htmlFor={`${id}-voltage`} className="flex justify-between gap-2"><span>{s("voltage")}</span><output className="tabular-nums">{s("volts", { n: voltage })}</output></label>
        <input id={`${id}-voltage`} type="range" {...{ min: circuitSettings.voltage.min, max: circuitSettings.voltage.max, step: 1 }} value={voltage}
          onChange={(e) => update(Number(e.target.value), resistance, earthed)} className="circuit-slider mt-2 w-full min-h-11" />
      </div>
      <div>
        <label htmlFor={`${id}-resistance`} className="flex justify-between gap-2"><span>{s("resistance")}</span><output className="tabular-nums">{s("ohms", { n: resistance })}</output></label>
        <input id={`${id}-resistance`} type="range" {...{ min: circuitSettings.resistance.min, max: circuitSettings.resistance.max, step: 1 }} value={resistance}
          onChange={(e) => update(voltage, Number(e.target.value), earthed)} className="circuit-slider mt-2 w-full min-h-11" />
      </div>
    </div>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" role="switch" checked={earthed}
      onChange={(e) => update(voltage, resistance, e.target.checked)} className="circuit-slider size-5" />{s("earthing")}</label>
    <dl className="grid grid-cols-2 gap-4 border-y border-border py-4">
      <div><dt className="text-sm text-ink-muted">{s("current")}</dt><dd className="mt-1 text-[28px] font-extrabold tabular-nums">{s("amps", { n: circuit.current.toFixed(2) })}</dd></div>
      <div><dt className="text-sm text-ink-muted">{s("power")}</dt><dd className="mt-1 text-[28px] font-extrabold tabular-nums">{s("watts", { n: circuit.power.toFixed(2) })}</dd></div>
    </dl>
    <svg viewBox="0 0 520 230" role="img" aria-label={s("diagram")} className="blueprint-grid w-full text-accent">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 80H190M230 80H420V170H70V80" />
        <circle cx="70" cy="125" r="24" className="fill-surface" /><path d="M58 125Q64 107 70 125T82 125" />
        <rect x="190" y="58" width="40" height="44" rx="5" className="fill-surface" />
        <path d={reason ? "M199 88L220 66" : "M199 80H221"} className={reason ? "text-error" : "text-accent"} />
        <circle cx="420" cy="125" r="23" className="fill-surface" /><path d="M404 109L436 141M436 109L404 141" />
        <path d="M420 149V203M403 203H437M408 211H432M414 219H426" className={earthed ? "text-secondary" : "text-ink-muted"} strokeDasharray={earthed ? undefined : "4 5"} />
        {!reason && circuit.current > 0 && <path d="M95 80H190M230 80H420V100M420 149V170H70V150" className="circuit-flow text-secondary" strokeWidth="5" strokeDasharray="3 24" />}
      </g>
      <g className="fill-ink" fontSize="14" textAnchor="middle">
        <text x="70" y="48">{s("volts", { n: voltage })}</text><text x="210" y="40">{s("mcb")}</text>
        <text x="420" y="48">{s("ohms", { n: resistance })}</text>
        <text x="210" y="211">{s(reason ? "tripped" : "closed")}</text>
      </g>
    </svg>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {reason ? <p role="alert" className="font-semibold text-error">{s("alert", { reason: s(reason) })}</p> : <p role="status" className="text-accent">{s("closed")}</p>}
      <Button type="button" variant="ghost" className="btn-secondary learning-control h-auto whitespace-normal" disabled={!reason || !!circuit.fault} onClick={() => setTrip(null)}><RotateCcw aria-hidden size={18} />{s("reset")}</Button>
    </div>
  </section>;
}