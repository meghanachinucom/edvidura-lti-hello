import { useId, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CirclePlay, ClipboardCheck, XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { lessons as seedLessons, type LessonKind } from "@/data/lessons";
import { checkpointQuiz, type OptionKey } from "@/data/quiz";
import { mockState } from "@/data/mockState";

// TC-02 Content. Markdown text only; AI questions live on the AI tools page.
export const Route = createFileRoute("/_shell/teacher/content")({
  head: () => ({
    meta: [
      { title: t("TC-02.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-02.lead") },
      { property: "og:title", content: t("TC-02.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-02.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-02.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
const keys: OptionKey[] = ["A", "B", "C", "D"];

interface LessonRow { id: string; title: string; kind: LessonKind; published: boolean }
interface QRow { id: string; text: string }

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return <p id={id} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{children}</p>;
}

function useSaving() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const run = (done: () => void) => {
    setSaving(true); setSaved(false);
    setTimeout(() => { setSaving(false); setSaved(true); done(); }, mockState.teacher.savingMs);
  };
  return { saving, saved, setSaved, run };
}

function Page() {
  const [lessons, setLessons] = useState<LessonRow[]>(seedLessons.map((l) => ({ id: l.id, title: l.title, kind: l.kind, published: true })));
  const [questions, setQuestions] = useState<QRow[]>(checkpointQuiz.questions.map((q) => ({ id: q.id, text: q.text })));
  const [lessonForm, setLessonForm] = useState<null | { id?: string }>(null);
  const [qForm, setQForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const lessonSave = useSaving();
  const qSave = useSaving();

  return (
    <div className="mx-auto w-full max-w-content space-y-8 px-4 py-8">
      <div>
        <PageHeading text={s("title")} />
        <p className="mt-2 max-w-reading text-ink-muted">{s("lead")}</p>
      </div>

      <section aria-labelledby="sec-lessons" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sec-lessons" className="font-heading text-[22px] text-ink">{s("lessons")}</h2>
          <button type="button" className="btn-primary" onClick={() => { lessonSave.setSaved(false); setLessonForm({}); }}>{s("addLesson")}</button>
        </div>
        {lessonSave.saved && !lessonForm && <StatusBanner variant="success">{s("saved")}</StatusBanner>}
        {lessonForm && (
          <LessonForm key={lessonForm.id ?? "new"} initialTitle={lessons.find((l) => l.id === lessonForm.id)?.title ?? ""}
            saving={lessonSave.saving} onCancel={() => setLessonForm(null)}
            onSave={(title) => lessonSave.run(() => {
              setLessons((ls) => lessonForm.id
                ? ls.map((l) => (l.id === lessonForm.id ? { ...l, title } : l))
                : [...ls, { id: `new-${ls.length + 1}`, title, kind: "reading", published: false }]);
              setLessonForm(null);
            })} />
        )}
        <ul className="grid gap-4 sm:grid-cols-2 desktop:grid-cols-3">
          {lessons.map((lesson) => {
            const TopicIcon = lesson.kind === "video" ? CirclePlay : lesson.kind === "quiz" ? ClipboardCheck : BookOpen;
            return (
              <li key={lesson.id} className="flex min-w-0 flex-col rounded-surface border border-border bg-surface p-4 text-ink shadow-sm">
                <div aria-hidden className="flex aspect-square max-h-48 w-full items-center justify-center rounded-surface bg-secondary-container text-secondary">
                  <TopicIcon size={64} strokeWidth={1.5} />
                </div>
                <div className="flex flex-1 flex-col pt-4">
                  <span className="text-sm text-ink-muted">{t(`shared.lessonKind.${lesson.kind}`)} · {s(lesson.published ? "published" : "draft")}</span>
                  <h3 className="mt-1 font-heading text-lg font-semibold">{lesson.title}</h3>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <button type="button" className="btn-secondary" aria-label={`${s("edit")}: ${lesson.title}`} onClick={() => { lessonSave.setSaved(false); setLessonForm({ id: lesson.id }); }}>{s("edit")}</button>
                    <button type="button" className="btn-secondary" aria-label={`${s("delete")}: ${lesson.title}`} onClick={() => setToDelete(lesson.id)}>{s("delete")}</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="sec-q" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="sec-q" className="font-heading text-[22px] text-ink">{s("questions")}</h2>
          <div className="flex flex-wrap gap-2">
            <Link to="/teacher/ai" className="btn-secondary">{s("aiQuiz")}</Link>
            <button type="button" className="btn-primary" onClick={() => { qSave.setSaved(false); setQForm(true); }}>{s("addQuestion")}</button>
          </div>
        </div>
        {qSave.saved && !qForm && <StatusBanner variant="success">{s("saved")}</StatusBanner>}
        {qForm && (
          <QuestionForm saving={qSave.saving} onCancel={() => setQForm(false)}
            onSave={(text) => qSave.run(() => { setQuestions((qs) => [...qs, { id: `nq-${qs.length + 1}`, text }]); setQForm(false); })} />
        )}
        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-surface border border-border bg-surface p-3 text-ink">
              {editingQuestion === q.id ? (
                <div className="space-y-2">
                  <label htmlFor={`question-edit-${q.id}`} className="font-semibold">{s("questionText")}</label>
                  <textarea id={`question-edit-${q.id}`} rows={3} value={questionText} onChange={(event) => setQuestionText(event.target.value)} className={`${input} py-2`} />
                  <div className="flex gap-2">
                    <button type="button" className="btn-primary" onClick={() => { if (questionText.trim()) setQuestions((items) => items.map((item) => item.id === q.id ? { ...item, text: questionText.trim() } : item)); setEditingQuestion(null); }}>{s("save")}</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingQuestion(null)}>{s("cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p><span className="font-semibold">{i + 1}. </span>{q.text}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => { setEditingQuestion(q.id); setQuestionText(q.text); }}>{s("edit")}</button>
                    <button type="button" className="btn-secondary" onClick={() => setQuestionToDelete(q.id)}>{s("delete")}</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <ConfirmDialog open={questionToDelete !== null} title={s("deleteQuestionTitle")} body={s("deleteQuestionBody")}
        confirmLabel={s("delete")} cancelLabel={s("cancel")} onCancel={() => setQuestionToDelete(null)}
        onConfirm={() => { setQuestions((items) => items.filter((item) => item.id !== questionToDelete)); setQuestionToDelete(null); }} />
      <ConfirmDialog open={toDelete !== null} title={s("deleteTitle")} body={s("deleteBody")}
        confirmLabel={s("delete")} cancelLabel={s("cancel")} onCancel={() => setToDelete(null)}
        onConfirm={() => { setLessons((ls) => ls.filter((l) => l.id !== toDelete)); setToDelete(null); }} />
    </div>
  );
}

function LessonForm({ initialTitle, saving, onSave, onCancel }: { initialTitle: string; saving: boolean; onSave: (title: string) => void; onCancel: () => void }) {
  const id = useId();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState("");
  const [video, setVideo] = useState("");
  const [err, setErr] = useState(false);
  return (
    <form noValidate className="space-y-4 rounded-surface border border-border bg-surface p-4"
      onSubmit={(e) => { e.preventDefault(); if (!title.trim()) { setErr(true); document.getElementById(`${id}-t`)?.focus(); return; } onSave(title.trim()); }}>
      <div>
        <label htmlFor={`${id}-t`} className="block font-semibold text-ink">{s("lessonTitle")}</label>
        <input id={`${id}-t`} value={title} onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) setErr(false); }}
          aria-invalid={err || undefined} aria-describedby={err ? `${id}-te` : undefined} className={`${input} ${err ? "border-error" : ""}`} />
        {err && <FieldError id={`${id}-te`}>{s("titleError")}</FieldError>}
      </div>
      <div>
        <label htmlFor={`${id}-b`} className="block font-semibold text-ink">{s("lessonBody")}</label>
        <textarea id={`${id}-b`} rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={`${input} py-2 font-mono`} />
      </div>
      <div>
        <label htmlFor={`${id}-v`} className="block font-semibold text-ink">{s("video")} <span className="font-normal text-ink-muted">{s("optional")}</span></label>
        <p id={`${id}-vh`} className="text-sm text-ink-muted">{s("videoHelp")}</p>
        <input id={`${id}-v`} type="url" inputMode="url" value={video} onChange={(e) => setVideo(e.target.value)} aria-describedby={`${id}-vh`} className={input} />
      </div>
      <FormButtons saving={saving} onCancel={onCancel} />
    </form>
  );
}

function QuestionForm({ saving, onSave, onCancel }: { saving: boolean; onSave: (text: string) => void; onCancel: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<Record<OptionKey, string>>({ A: "", B: "", C: "", D: "" });
  const [correct, setCorrect] = useState<OptionKey | null>(null);
  const [diff, setDiff] = useState("medium");
  const [errs, setErrs] = useState<{ text?: boolean; choices?: boolean; correct?: boolean }>({});

  const submit = () => {
    const filled = keys.filter((k) => opts[k].trim()).length;
    const e = { text: !text.trim(), choices: filled < 2, correct: !correct || !opts[correct].trim() };
    setErrs(e);
    const first = e.text ? `${id}-q` : e.choices ? `${id}-oA` : e.correct ? `${id}-cA` : null;
    if (first) { document.getElementById(first)?.focus(); return; }
    onSave(text.trim());
  };

  return (
    <div className="grid gap-4 desktop:grid-cols-[1fr_320px]">
      <form noValidate className="space-y-4 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div>
          <label htmlFor={`${id}-q`} className="block font-semibold text-ink">{s("questionText")}</label>
          <textarea id={`${id}-q`} rows={3} value={text} onChange={(e) => setText(e.target.value)}
            aria-invalid={errs.text || undefined} aria-describedby={errs.text ? `${id}-qe` : undefined} className={`${input} py-2 ${errs.text ? "border-error" : ""}`} />
          {errs.text && <FieldError id={`${id}-qe`}>{s("questionError")}</FieldError>}
        </div>
        {keys.map((k) => (
          <div key={k}>
            <label htmlFor={`${id}-o${k}`} className="block font-semibold text-ink">{s("option", { k })}</label>
            <input id={`${id}-o${k}`} value={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.value })}
              aria-invalid={errs.choices || undefined} aria-describedby={errs.choices ? `${id}-oe` : undefined} className={input} />
          </div>
        ))}
        {errs.choices && <FieldError id={`${id}-oe`}>{s("choicesError")}</FieldError>}
        <fieldset aria-describedby={errs.correct ? `${id}-ce` : undefined}>
          <legend className="font-semibold text-ink">{s("correct")}</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {keys.map((k) => (
              <label key={k} className="flex min-h-11 items-center gap-2 text-ink">
                <input id={`${id}-c${k}`} type="radio" name={`${id}-c`} checked={correct === k} onChange={() => setCorrect(k)} className="size-5 accent-accent" />
                {s("markCorrect", { k })}
              </label>
            ))}
          </div>
          {errs.correct && <FieldError id={`${id}-ce`}>{s("correctError")}</FieldError>}
        </fieldset>
        <div className="max-w-sm">
          <label htmlFor={`${id}-d`} className="block font-semibold text-ink">{s("difficulty")}</label>
          <select id={`${id}-d`} value={diff} onChange={(e) => setDiff(e.target.value)} className={input}>
            <option value="easy">{s("easy")}</option>
            <option value="medium">{s("medium")}</option>
            <option value="hard">{s("hard")}</option>
          </select>
        </div>
        <FormButtons saving={saving} onCancel={onCancel} />
      </form>
      <aside aria-labelledby={`${id}-g`} className="h-fit rounded-surface border border-border bg-surface p-4">
        <h3 id={`${id}-g`} className="font-heading text-[18px] text-ink">{s("guideTitle")}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
          <li>{s("guide1")}</li><li>{s("guide2")}</li><li>{s("guide3")}</li>
        </ul>
      </aside>
    </div>
  );
}

function FormButtons({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 tablet:flex-row tablet:items-center">
      <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>{s("cancel")}</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? s("saving") : s("save")}</button>
      <span role="status" className="sr-only">{saving ? s("saving") : ""}</span>
    </div>
  );
}
