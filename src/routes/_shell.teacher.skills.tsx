import { StatusGem } from "@/components/shared/StatusGem";
import { useId, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";
import { t } from "@/i18n";
import { PageHeading } from "@/components/shared/PageHeading";
import { skillGaps } from "@/data/teacherInsights";
import { StatusBanner } from "@/components/shared/StatusBanner";
import { skills as seedSkills, targetRoles, type Skill } from "@/data/skills";
import { lessonById } from "@/data/lessons";
import { LessonName } from "@/components/shared/LessonList";
import { mockState } from "@/data/mockState";

// TC-14 Skills and roles. No standards database, automatic mapping or NSQF codes.
export const Route = createFileRoute("/_shell/teacher/skills")({
  head: () => ({
    meta: [
      { title: t("TC-14.title") + t("app.titleSuffix") },
      { name: "description", content: t("TC-14.lead") },
      { property: "og:title", content: t("TC-14.title") + t("app.titleSuffix") },
      { property: "og:description", content: t("TC-14.lead") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const s = (k: string, v?: Record<string, string | number>) => t(`TC-14.${k}`, v);
const input = "mt-2 min-h-11 w-full rounded-surface bg-surface px-3 text-ink border-control";
interface Role { id: string; title: string; skills: string[] }

function Err({ id, text }: { id: string; text: string }) {
  return <p id={id} className="mt-2 flex items-center gap-2 text-error"><XCircle aria-hidden size={18} className="shrink-0" />{text}</p>;
}

function Page() {
  const id = useId();
  const [roles, setRoles] = useState<Role[]>(targetRoles.map((r) => ({ id: r.id, title: r.title, skills: [...r.skills] })));
  const [allSkills, setAllSkills] = useState<Skill[]>(seedSkills);
  const [sel, setSel] = useState<string | null>(mockState.teacher.selectedRole);
  const [form, setForm] = useState<null | "role" | "skill">(null);
  const [saved, setSaved] = useState(false);
  const role = roles.find((r) => r.id === sel);
  const rows = role ? role.skills.map((c) => allSkills.find((k) => k.code === c)).filter((k): k is Skill => !!k) : [];

  const stateFor = (skill: Skill): "missing" | "practising" | "passed" =>
    skill.link === "missing" ? "missing" : skillGaps.some((gap) => gap.code === skill.code) ? "practising" : "passed";
  const stateTone = { missing: "attention", practising: "progress", passed: "done" } as const;

  return (
    <div className="mx-auto w-full max-w-content space-y-6 px-4 py-8">
      <PageHeading text={s("title")} />
      <div className="flex flex-col gap-2 tablet:flex-row">
        <button type="button" className="btn-secondary" aria-expanded={form === "role"} onClick={() => { setSaved(false); setForm(form === "role" ? null : "role"); }}>{s("addRole")}</button>
        <button type="button" className="btn-secondary" aria-expanded={form === "skill"} disabled={!role}
          onClick={() => { setSaved(false); setForm(form === "skill" ? null : "skill"); }}>{s("addSkill")}</button>
      </div>

      {form === "role" && <RoleForm onCancel={() => setForm(null)} onSave={(title) => {
        const rid = `role-${roles.length + 1}`; setRoles([...roles, { id: rid, title, skills: [] }]); setSel(rid); setForm(null); setSaved(true);
      }} />}
      {form === "skill" && role && <SkillForm onCancel={() => setForm(null)} onSave={(title, code) => {
        if (!allSkills.some((k) => k.code === code)) setAllSkills([...allSkills, { code, title, link: "missing" }]);
        setRoles(roles.map((r) => (r.id === role.id && !r.skills.includes(code) ? { ...r, skills: [...r.skills, code] } : r))); setForm(null); setSaved(true);
      }} />}
      {saved && <StatusBanner variant="success">{s("saved")}</StatusBanner>}

      <div className="grid gap-6 tablet:grid-cols-[260px_1fr]">
        <div>
          <div className="tablet:hidden">
            <label htmlFor={`${id}-r`} className="block font-semibold text-ink">{s("role")}</label>
            <select id={`${id}-r`} value={sel ?? ""} onChange={(e) => setSel(e.target.value || null)} className={input}>
              <option value="">{s("chooseRole")}</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
          <nav aria-label={s("roles")} className="hidden tablet:block">
            <h2 className="font-heading text-[18px] text-ink">{s("roles")}</h2>
            <ul className="mt-2 space-y-1">
              {roles.map((r) => (
                <li key={r.id}>
                  <button type="button" aria-current={sel === r.id ? "true" : undefined} onClick={() => setSel(r.id)}
                    className={`min-h-11 w-full rounded-surface px-3 py-2 text-left text-ink ${sel === r.id ? "nav-active" : "hover:bg-surface"}`}>{r.title}</button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-ink">{s("caption")}</p>
          <ul aria-label={s("legend")} className="flex flex-wrap gap-4 text-sm text-ink">
            {(["missing", "practising", "passed"] as const).map((state) => <li key={state}><StatusGem tone={stateTone[state]}>{s(`state.${state}`)}</StatusGem></li>)}
          </ul>
          {!role ? <p className="text-ink-muted">{s("noRole")}</p> : (
            <ul className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3" aria-label={s("skills", { role: role.title })}>
              {rows.map((skill) => {
                const state = stateFor(skill);
                return <li key={skill.code} className="rounded-surface border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3"><h2 className="font-heading text-[18px] text-ink">{skill.title}</h2><StatusGem tone={stateTone[state]}>{s(`state.${state}`)}</StatusGem></div>
                  <p className="mt-2 font-mono text-sm text-ink-muted">{skill.code}</p>
                  {skill.lessonId && lessonById(skill.lessonId) && <Link to="/lessons/$lessonId" params={{ lessonId: skill.lessonId }} className="mt-2 inline-flex min-h-11 items-center text-ink underline"><LessonName lesson={lessonById(skill.lessonId)!} /></Link>}
                  {state === "missing" && <Link to="/teacher/ai/remediation" className="mt-2 inline-flex min-h-11 items-center text-secondary underline">{s("generate")}</Link>}
                </li>;
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-f`} className="block font-semibold text-ink">{s("import")}</label>
        <input id={`${id}-f`} type="file" className="mt-2 block w-full text-ink" />
      </div>
    </div>
  );
}

function RoleForm({ onSave, onCancel }: { onSave: (title: string) => void; onCancel: () => void }) {
  const id = useId();
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  return (
    <form noValidate className="space-y-3 rounded-surface border border-border bg-surface p-4"
      onSubmit={(e) => { e.preventDefault(); if (!v.trim()) { setErr(true); document.getElementById(`${id}-n`)?.focus(); return; } onSave(v.trim()); }}>
      <div>
        <label htmlFor={`${id}-n`} className="block font-semibold text-ink">{s("roleName")}</label>
        <input id={`${id}-n`} value={v} onChange={(e) => { setV(e.target.value); setErr(false); }}
          aria-invalid={err || undefined} aria-describedby={err ? `${id}-e` : undefined} className={`${input} ${err ? "border-error" : ""}`} />
        {err && <Err id={`${id}-e`} text={s("roleError")} />}
      </div>
      <Buttons onCancel={onCancel} />
    </form>
  );
}

function SkillForm({ onSave, onCancel }: { onSave: (title: string, code: string) => void; onCancel: () => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errs, setErrs] = useState<{ name?: boolean; code?: boolean }>({});
  return (
    <form noValidate className="space-y-3 rounded-surface border border-border bg-surface p-4" onSubmit={(e) => {
      e.preventDefault();
      const x = { name: !name.trim(), code: !code.trim() };
      setErrs(x);
      if (x.name || x.code) { document.getElementById(x.name ? `${id}-n` : `${id}-c`)?.focus(); return; }
      onSave(name.trim(), code.trim());
    }}>
      <div>
        <label htmlFor={`${id}-n`} className="block font-semibold text-ink">{s("skillName")}</label>
        <input id={`${id}-n`} value={name} onChange={(e) => setName(e.target.value)}
          aria-invalid={errs.name || undefined} aria-describedby={errs.name ? `${id}-ne` : undefined} className={`${input} ${errs.name ? "border-error" : ""}`} />
        {errs.name && <Err id={`${id}-ne`} text={s("nameError")} />}
      </div>
      <div>
        <label htmlFor={`${id}-c`} className="block font-semibold text-ink">{s("skillCode")}</label>
        <input id={`${id}-c`} value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false}
          aria-invalid={errs.code || undefined} aria-describedby={errs.code ? `${id}-ce` : undefined} className={`${input} ${errs.code ? "border-error" : ""}`} />
        {errs.code && <Err id={`${id}-ce`} text={s("codeError")} />}
      </div>
      <Buttons onCancel={onCancel} />
    </form>
  );
}

function Buttons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-2 tablet:flex-row">
      <button type="button" className="btn-secondary" onClick={onCancel}>{s("cancel")}</button>
      <button type="submit" className="btn-primary">{s("save")}</button>
    </div>
  );
}
