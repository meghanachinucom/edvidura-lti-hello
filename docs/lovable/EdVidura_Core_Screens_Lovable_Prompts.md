# EdVidura — Lovable design brief (core product)

Paste into Lovable as **one master prompt**, then iterate with the **per-screen prompts** below.

**Scope:** Core EdVidura only (Moodle LTI learning tool). Do **not** design Chaganti, welding packs, or corporate L&D variants.

**Colors:** Do **not** copy the live Coolors gray shell or the old navy/amber/coral palette. Use the new system in this doc.

---

## Master prompt (paste first)

```
Build a clickable React + Vite + TypeScript + Tailwind prototype for EdVidura.

PRODUCT
EdVidura is an LTI 1.3 learning app that opens inside Moodle (new window). Moodle owns people and the gradebook. EdVidura owns lessons, quiz, manuals/eBook, Ask Vidura (study coach), and teacher tools — all tenant-isolated per school.

ROLES (toggle in shell)
1) Student — Home, Lessons, Quiz, Manual, Ask Vidura, My progress
2) Teacher — Class results, content/manuals, analytics preview
3) School admin — school overview (classes / teachers / students counts)

FLOW (student)
Moodle launch → Home → Continue learning / Ask Vidura → Lessons or Quiz → Result (grade sync banner when AGS on)

SCREENS TO BUILD
/ home
/lessons  /lessons/:id
/quiz  /quiz/result
/manuals  /manuals/:id
/learn/coach (Ask Vidura)
/teacher/attempts
/school-admin (simple overview)

VISUAL SYSTEM — “Paper studio” (NEW — do not use existing EdVidura palettes)
Do NOT use: Coolors gray (#f8f9fa/#212529), navy+amber+coral (#0d3b66/#f4d35e/#f95738), purple/indigo SaaS, cream+#terracotta, Inter/Roboto/Arial.

Tokens:
--ink: #121714
--paper: #f3f1ea
--panel: #ebe7dc
--line: #cfc9ba
--mint: #1b6b57
--mint-soft: #d7ebe4
--sky: #2f5d7a
--warn: #9a3412
--ok: #166534

Typography:
- Outfit 400–700 from Google Fonts for ALL text (brand, titles, body, buttons). No Fraunces, Sora, Inter, or Syne.
Load Outfit only. Brand wordmark is hero-level on first viewport of Home: “EdVidura” larger than the greeting. Layout must be responsive 390–1440 (hamburger nav below 1024).

Layout:
- Light paper atmosphere: soft vertical gradient paper→panel, faint grain or paper noise (subtle).
- Top navbar only (no left sidebar): logo EV mark + EdVidura, context pill (course · school), role-aware links, Back to Moodle.
- One composition per first viewport — not a KPI dashboard. No card grid in the hero.
- Cards only when they wrap a real interaction (quiz choice, form, message thread). Prefer open lists and rules over boxed tiles.
- Radius: 10–14px max. No rounded-full pills. No multi-layer glow shadows. No emoji.
- Motion: 2–3 intentional (nav underline, home CTA rise, progress bar fill). Calm, not playful.

ANTI-PATTERNS
Purple gradients, dark-mode-first chrome, floating badges on heroes, icon rows of features, stat strips in the first viewport, generic “AI chatbot” bubbles with sparkles.

MOCK DATA
School: Riverside High · Course: Algebra I · Student: Ada Chen · Teacher: Priya Shah · AGS: available.

Deliver a polished prototype with working role toggle and navigation.
```

---

## Product copy bank (reuse in screens)

| Element | Copy |
|---------|------|
| Brand | EdVidura |
| Tagline | Learning that stays with the class |
| Moodle return | ← Back to Moodle |
| Student home lede | Pick up where you left off. |
| Continue CTA | Continue learning |
| Coach CTA | Ask Vidura |
| Quiz gate | Almost ready — finish the path, then take the graded quiz. |
| Practice | Practice lane (no gradebook) |
| Result sync on | Score queued for Moodle gradebook |
| Result sync off | Saved in EdVidura — gradebook sync not available on this launch |
| Manual | Manual · versioned eBook |
| Teacher | Class results · this class only |
| Admin | One school. Your figures stay inside Riverside. |

---

## Per-screen prompts

### 1) Home (student)

```
Design EdVidura student Home using Paper studio tokens from the master prompt.
First viewport = one composition: brand EdVidura (hero), greeting “Hi, Ada”, one short lede, primary CTA “Continue learning”, secondary “Ask Vidura”, optional thin progress (“3 of 8 lessons”).
No dashboard cards, no stats strip, no schedule. Below fold: quiet “Up next” lesson row + text links (Lessons, Quiz, Manual, My plan).
Navbar: EV · EdVidura | Algebra I · Riverside | Lessons Quiz Help More | Back to Moodle.
```

### 2) Lessons list

```
EdVidura lessons list on Paper studio. Title “Lessons”, short lede “Your class path.” Ordered rows: number, title, type (Reading / Video / Quiz), status (Done / Now / Open). Active row uses mint left edge. No card grid. Empty state: “No course bound — ask your teacher.”
```

### 3) Lesson player

```
EdVidura lesson reader. Chapter title in Fraunces, body in Sora, comfortable measure (~65ch). Optional 16:9 media well (flat, not a floating card). Footer actions: Previous (outline) · Mark done & continue (mint fill). Skip link to content.
```

### 4) Quiz

```
EdVidura graded quiz. Meta: “6 questions · Moodle sync on”. Each question: prompt + radio choices as bordered rows (selected = mint border + mint-soft fill). Sticky bottom bar: Submit quiz. Include a quiet “Practice instead” text link. Sharp, calm exam feel — not gamified.
```

### 5) Quiz result

```
EdVidura quiz result. Large score “4 / 6” in Fraunces. Sync banner (ok or warn). Review list with correct/incorrect left rules. CTAs: Try again · Practice weak items · Back to Moodle. No confetti.
```

### 6) Manual / eBook reader

```
EdVidura technical manual reader. Hero band with title + “eBook · v3”. Left sticky chapter TOC from ## headings. Main column readable markdown. Optional right “Discuss” rail stub (chapter micro-forum) collapsed by default. Language selector is OUT OF SCOPE — core English only.
```

### 7) Ask Vidura (study coach)

```
EdVidura Ask Vidura drawer/page. Not a generic ChatGPT clone. Header “Ask Vidura”, short stance: “Answers stay on class materials.” Composer + send. Reply shows short answer + citation chips (lesson/manual titles). Language dropdown for Indian langs is fine as a simple select. Mic/speak controls secondary. Refuse off-topic with calm copy.
```

### 8) Teacher — class results

```
EdVidura teacher Class results. Scope chip: “Single class · Algebra Period 1”. Table: learner, attempts, last %, sync. Primary CTA “Preview as student”. No school-wide totals. Paper studio, dense but readable.
```

### 9) School admin overview

```
EdVidura school admin home for ONE school. Brand first. One line: “You’re running Riverside High.” Three quiet metrics (teachers, classes, students) as typography — not colorful KPI cards. Links: Teachers · Classes · Students. Emphasize tenant isolation in one short sentence.
```

### 10) Marketing / landing (optional)

```
EdVidura marketing landing (standalone). Full-bleed atmospheric photo or illustration of classroom/learning (edge-to-edge), not an inset card. First viewport ONLY: brand EdVidura, one headline, one sentence, one CTA group (“Open in Moodle” / “See how it works”). No stats, no feature pill cloud, no hero overlays. Paper studio colors adapted for marketing.
```

---

## Iteration tips for Lovable

1. Paste **Master prompt** → generate shell + Home.  
2. Paste one **per-screen prompt** at a time.  
3. If Lovable drifts to purple/Inter/cards: reply *“Revert to Paper studio tokens; Fraunces+Sora; no purple; no KPI cards.”*  
4. Keep Moodle as the LMS frame — EdVidura is the tool inside, not a full LMS clone.

## Local references (structure only — ignore their colors)

- Live shell structure: `templates/base_shell.html`, `templates/launch_hub.html`  
- Older Lovable export (colors obsolete): `docs/lovable/EdVidura_Current_UI_Lovable_Prompt.md`
