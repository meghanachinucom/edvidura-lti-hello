import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, X } from "lucide-react";
import { t } from "@/i18n";
import { useFocusTrap } from "@/components/shared/useFocusTrap";
import { CoachStarterChips } from "@/components/shared/CoachStarterChips";
import { askViduraLanguages, pickViduraAnswer, VIDURA_OFF_SCOPE, type ViduraAnswer } from "@/data/askVidura";

// M2 Ask Vidura side panel. Learner role only; mock answers from class lessons.
const s = (k: string) => t(`M2.${k}`);

interface Turn { id: number; question: string; answer?: ViduraAnswer | null }

export function AskViduraPanel() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);

  const open = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  };
  const close = () => {
    setVisible(false);
    setTimeout(() => setMounted(false), 200);
  };

  return (
    <>
      <button
        ref={openBtn}
        type="button"
        onClick={open}
        aria-expanded={mounted}
        className="btn-primary fixed bottom-4 right-4 z-40 shadow-sm"
      >
        <MessageCircle aria-hidden size={18} />{s("button")}
      </button>
      {mounted && <Panel visible={visible} onClose={close} />}
    </>
  );
}

function Panel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true, onClose);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const id = turns.length;
    setTurns((ts) => [...ts, { id, question: q }]);
    setText(""); setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, answer: pickViduraAnswer(q) } : x)));
    }, 1500);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setBusy(false);
    setTurns((ts) => ts.filter((x) => x.answer !== undefined));
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={s("button")}
      className={`fixed inset-0 z-50 flex flex-col bg-surface transition-transform ease-out tablet:inset-y-0 tablet:left-auto tablet:right-0 tablet:w-[420px] tablet:border-l tablet:border-border ${
        visible ? "translate-x-0 duration-[250ms]" : "translate-x-full duration-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="font-heading text-[22px] text-ink">{s("button")}</h2>
          <p className="text-sm text-ink-muted">{s("scope")}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={s("close")} className="icon-btn">
          <X aria-hidden size={20} />
        </button>
      </div>

      <div className="border-b border-border p-4">
        <label htmlFor="vidura-lang" className="block font-semibold text-ink">{s("language")}</label>
        <select id="vidura-lang" className="mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control">
          {askViduraLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <p className="mt-2 text-sm text-ink-muted">{s("languageNote")}</p>
      </div>

      <ol className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.map((x) => (
          <li key={x.id} className="space-y-3">
            <div className="ml-auto max-w-[85%] rounded-surface bg-highlight p-3 text-ink">
              <p className="text-sm font-semibold">{s("yourQuestion")}</p>
              <p>{x.question}</p>
            </div>
            {x.answer !== undefined && <Answer answer={x.answer} />}
          </li>
        ))}
      </ol>
      <p role="status" className="px-4 text-ink-muted">{busy ? s("thinking") : ""}</p>

      <form onSubmit={send} className="space-y-2 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <CoachStarterChips onSelect={(prompt) => { setText(prompt); ref.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); }} />
        <label htmlFor="vidura-q" className="block font-semibold text-ink">{s("yourQuestion")}</label>
        <textarea
          id="vidura-q" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          className="w-full rounded-surface border border-border-control bg-surface p-2 text-ink"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary">{s("send")}</button>
          {busy && <button type="button" onClick={stop} className="btn-secondary">{s("stop")}</button>}
        </div>
      </form>
    </div>
  );
}

function Citation({ lesson, section }: { lesson: string; section: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="group relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="min-h-11 px-1 text-accent underline underline-offset-4"
      >
        {lesson}
      </button>
      <span
        role="note"
        className={`absolute bottom-full left-0 z-10 mb-1 w-56 rounded-surface border border-border bg-surface-raised p-3 text-left shadow-sm ${open ? "block" : "hidden group-hover:block group-focus-within:block"}`}
      >
        <span className="block font-semibold text-ink">{lesson}</span>
        <span className="block text-sm text-ink-muted">{section}</span>
      </span>
    </span>
  );
}

function Answer({ answer }: { answer: ViduraAnswer | null }) {
  const [vote, setVote] = useState<"helpful" | "notHelpful" | null>(null);
  return (
    <div className="max-w-[92%] space-y-3 rounded-surface border border-border bg-page-bg p-3 text-ink">
      <p className="text-sm font-semibold">{s("coach")}</p>
      {answer === null ? (
        <p>{VIDURA_OFF_SCOPE}</p>
      ) : (
        <>
          <p>{answer.answer}</p>
          <div>
            <p className="text-sm font-semibold">{s("citations")}</p>
            <p>
              <Citation {...answer.citations[0]} />
              {" · "}
              <Citation {...answer.citations[1]} />
            </p>
          </div>
          <div className="rounded-surface border border-border bg-surface p-3">
            <p className="text-sm font-semibold">{s("checkQuestion")}</p>
            <p>{answer.check}</p>
          </div>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {vote === null ? (
          <>
            <button type="button" onClick={() => setVote("helpful")} className="btn-secondary">{s("helpful")}</button>
            <button type="button" onClick={() => setVote("notHelpful")} className="btn-secondary">{s("notHelpful")}</button>
          </>
        ) : (
          <p role="status" className="text-sm">{s("thanks")}</p>
        )}
      </div>
    </div>
  );
}
