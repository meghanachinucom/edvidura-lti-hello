# EdVidura — next-level screens (Lovable + Google Stitch)

Core product only. **Font: Outfit for everything** (brand, titles, body, buttons, tables). **Every screen is responsive** (390 → 1440), not desktop-only.

**How to paste**

| Tool | How |
|------|-----|
| **Google Stitch** | New project → paste **Screen 00**. Then **one screen per generation**. Each prompt repeats Outfit + breakpoints. Generate as **responsive web**, not a static 1440 artboard only. |
| **Lovable** | New project → **Screen 00**. Then **01, 02, 03…** as separate messages. Tell it to use Tailwind responsive classes. |

Copy **only** the fenced block under each screen.

---

## Design system (shared)

**Name:** Lumen  
**Type:** **Outfit** 400 / 500 / 600 / 700 from Google Fonts — *all* text. Never Fraunces, Sora, Syne, Inter, Roboto, Poppins, Arial.

| Token | Hex | Use |
|-------|-----|-----|
| ink | `#0F1C24` | text, logo |
| paper | `#F6F1E8` | page |
| panel | `#EBE4D6` | bands, wells |
| line | `#D4CBB8` | rules |
| lagoon | `#0E7C66` | primary CTA, active, progress |
| lagoon-soft | `#D5EEE7` | selected, success wash |
| harbor | `#1F4E79` | links, secondary |
| ember | `#C45C26` | one accent per screen max |
| warn | `#9A3412` | errors |
| ok | `#166534` | correct / synced |

**Responsive (global):**

- Breakpoints: 390 · 768 · 1024 · 1280 · 1440
- Type: `clamp()` — brand ~32–72px, H1 ~24–40px, body 16px
- Nav: ≥1024 inline links; &lt;1024 hamburger → full-width sheet; context “Algebra I · Riverside” hides below 1280
- Buttons wrap; on &lt;480 primary is 100% width, 48px tall
- Tables → stacked definition rows below 768
- Touch targets ≥44px; 16px page gutter on mobile, 24–40px desktop
- `prefers-reduced-motion: reduce` → no motion

**Motion (when allowed):** page rise 420ms, list stagger 50ms, nav underline 180ms, CTA hover −2px, progress 900ms, drawer 320ms.

---

## Screen 00 — system + shell (paste first)

```
Design EdVidura, an LTI 1.3 learning app that opens from Moodle in a new window. Moodle owns people and grades. EdVidura owns lessons, quiz, manuals, Ask Vidura. School: Riverside High. Course: Algebra I.

Build the APP SHELL + empty Home placeholder. Must be FULLY RESPONSIVE (mobile 390, tablet 768, desktop 1024–1440) in one layout — use fluid CSS / Tailwind breakpoints, not a separate desktop-only mock.

VISUAL “Lumen”
Colors: ink #0F1C24, paper #F6F1E8, panel #EBE4D6, line #D4CBB8, lagoon #0E7C66, lagoon-soft #D5EEE7, harbor #1F4E79, ember #C45C26 (max once per screen), warn #9A3412, ok #166534.
FONT: Outfit for ALL text (wordmark, nav, headings, body, buttons). Google Fonts weights 400–700. Do not use Fraunces, Sora, Syne, Inter, Roboto, or Poppins.
No purple, no gray SaaS (#f8f9fa/#212529), no navy+gold+coral.

LAYOUT
- Paper page, subtle paper→panel gradient, 3% grain.
- Sticky navbar: left EV mark + “EdVidura” in Outfit 700. Center context “Algebra I · Riverside High” (hide <1280px). Right: links + “← Back to Moodle”.
- ≥1024: links in a row (Lessons, Quiz, Help ▾, More ▾). <1024: hamburger, 44px, opens a full-width sheet with the same links + Back to Moodle.
- Prototype role toggle: Student | Teacher | Admin.

RESPONSIVE
Fluid type. 16px side padding on 390, 24px on 768, 40px on 1440. No horizontal scroll. Safe-area insets.

MOTION
420ms fade+rise. Nav underline 180ms. Button hover −2px. Reduced-motion = instant.

ANTI: no left sidebar, no KPI tiles, no emoji, no dark mode, no glassmorphism.

Output: responsive shell + “Home will live here”.
```

---

## Screen 01 — Student Home

```
EdVidura student Home. Lumen. FONT Outfit for everything. Responsive 390 / 768 / 1024 / 1440. Keep the shell navbar (hamburger <1024).

Colors: paper #F6F1E8, ink #0F1C24, lagoon #0E7C66, harbor #1F4E79.

FIRST VIEWPORT — one composition, not a dashboard:
1. Brand “EdVidura” Outfit 700, clamp(32px, 8vw, 72px) — larger than the greeting.
2. “Hi, Ada” Outfit 600, clamp(22px, 4vw, 36px).
3. Lede Outfit 400: “Pick up where you left off.”
4. 4px lagoon progress to 38% (900ms). “3 of 8 lessons”.
5. CTAs: lagoon “Continue learning”; ghost “Ask Vidura”. <480px: stack, full width, 48px height.

Below fold: “Up next” row (title “Linear equations · graphs”) + text links Lessons · Quiz · Manual · My plan. No cards.

MOTION: stagger brand→greeting→lede→bar→CTAs 80ms. Hover −2px.

Do not add stats or icons. Cinematic paper classroom.
```

---

## Screen 02 — Lessons list

```
EdVidura Lessons. Lumen. Outfit only. Responsive.

Title “Lessons” Outfit 700 clamp(24px, 4vw, 36px). Lede “Your class path.”

8 full-width rows, 1px line #D4CBB8:
Desktop: number 01–08 | title | type as text (Reading/Video/Quiz) | Done/Now/Open.
NOW: 3px lagoon left + lagoon-soft wash.
DONE: 55% opacity.
<768: stack — number+title, type and status under.

Empty: “No course bound — ask your teacher.”

MOTION: rows stagger 50ms; hover translateX 4px on pointer devices only (not touch).
```

---

## Screen 03 — Lesson player

```
EdVidura lesson reader. Lumen. Outfit only. Responsive.

Title “Linear equations · graphs” Outfit 700 clamp(22px, 3.5vw, 32px). Kicker “Reading · 8 min”.
16:9 media well: panel #EBE4D6, 12px radius, lagoon play triangle. Full width on mobile.
Body Outfit 400, 16px, 1.65, max-width 65ch.

Sticky action bar: “Previous” outline + “Mark done & continue” lagoon.
<640px: bar stacks, both buttons 100% width 48px.

Skip link on focus. MOTION: title rise 420ms; bar slides up 12px.
```

---

## Screen 04 — Quiz (graded)

```
EdVidura graded quiz. Lumen. Outfit only. Responsive. Exam-calm.

Header “Quiz” Outfit 700. Meta 14px: “6 questions · Moodle sync on”. Link “Practice instead (no gradebook)” — wraps under title on mobile.

6 questions. Prompt Outfit 600 18px. 4 choice rows, 12px radius; selected lagoon border + lagoon-soft, 180ms.
Touch targets 48px min. Sticky “Submit quiz” — max 280px centered desktop, 100% width on <480.

No timers, hearts, streaks. Questions stagger 40ms.
```

---

## Screen 05 — Quiz result

```
EdVidura quiz result. Lumen. Outfit only. Responsive.

Score “4 / 6” Outfit 700 clamp(48px, 12vw, 88px), count-up 700ms. Sub “67% · Algebra I”.
Banner: “Score queued for Moodle gradebook” (alt: ember “Saved in EdVidura — gradebook sync not available”).

Review 6 rows: correct ok left rule, incorrect warn left rule.
CTAs wrap: Try again · Practice weak items · Back to Moodle. Full-width stack <480.

No confetti. Ember at most once.
```

---

## Screen 06 — Quiz gate

```
EdVidura “Almost ready” gate. Lumen. Outfit only. Responsive.

Centered column max 520px, 16px gutters:
Outfit 700 “Almost ready”
Outfit 400 “Finish the path, then take the graded quiz.”
Progress 3/8.
Lagoon “Continue lessons” + ghost “Practice lane (no gradebook)” — stack full width on mobile.

Overlay 8% ink. Motion: fade 240ms, rise 420ms.
```

---

## Screen 07 — Manuals list

```
EdVidura manuals index. Lumen. Outfit only. Responsive.

Title “Manuals”. Lede “Versioned class handbooks.”
3 rows: title Outfit 600 clamp(18px, 3vw, 24px), meta “eBook · v3 · published”, chevron.
<640: meta under title. Hover lagoon left edge 0→3px (pointer only).
Empty: “No handbook assigned to this class.”
```

---

## Screen 08 — Manual / eBook reader

```
EdVidura eBook reader. Lumen. Outfit only. MUST be responsive.

≥1280: hero band + 3 columns (TOC 240px sticky | body 65ch | Discuss tab).
1024–1279: TOC + body; Discuss as icon that opens a drawer.
<1024: hero, then TOC as horizontal chip scroller, then body. Discuss = bottom sheet 320ms.

Hero: “eBook · v3 · published” + “Algebra I technical guide” Outfit 700 clamp(26px, 5vw, 44px).
Body Outfit 400 16px/1.65. Headings Outfit 600.
Discuss default CLOSED. English only. Skip link to #manual-body.
```

---

## Screen 09 — Ask Vidura

```
EdVidura Ask Vidura. Not ChatGPT. Lumen. Outfit only. Responsive.

≥1024: page with thread; optional right drawer 400px.
<1024: full-screen column; composer sticky above home indicator.

Header “Ask Vidura” Outfit 700. Stance “Answers stay on class materials.”
Language select Outfit: English (India) / Hindi / Telugu / Tamil. No flags.

Thread: student right, Vidura left. Citations as rectangles (not pills): “Lesson 03 · Graphs”.
Refuse example: “I can only help with this class.”
Composer: textarea, Send lagoon 48px, Mic / Speak text buttons.

MOTION: drawer 320ms; 3-dot pulse then reply. No robot avatar, no purple bubbles.
```

---

## Screen 10 — My progress

```
EdVidura My progress. Lumen. Outfit only. Responsive.

Title “My progress”. “This class only.”
Three type metrics (not KPI cards): 38% path · 4 quizzes · last 4/6 — huge Outfit 700 numbers.
≥768: three columns with vertical rules. <768: stack, rules become horizontal.

Path of 8 nodes; ember ring on NOW (once). Line animates 800ms. Horizontal scroll OK on 390 if needed, with snap. No rainbow charts.
```

---

## Screen 11 — Teacher class results

```
EdVidura teacher Class results. Outfit only. Responsive. Teacher nav: Class results, Preview, Analytics.

Scope text + lagoon dot: “Single class · Algebra Period 1 · 24 students”.
Title + lagoon “Preview as student” — button full width under title on mobile.

≥768: table Learner / Attempts / Last % / Moodle sync. Ada Chen 3 · 67% · Queued + 7 rows.
<768: each learner is a stacked block (name, then stats).

Note: “Figures are for this class only.” Row stagger 30ms.
```

---

## Screen 12 — Teacher analytics

```
EdVidura teacher analytics. Outfit only. Responsive. Not a BI dashboard.

Insight Outfit 600 clamp(20px, 3vw, 28px): “Most misses are on slope-intercept.”
3 horizontal lagoon bars + 5 students to practice.
Bars full width; stack everything on mobile. No pie charts.
```

---

## Screen 13 — School admin overview

```
EdVidura school admin. ONE school. Outfit only. Responsive.

“EdVidura” Outfit 700 clamp(32px, 6vw, 56px).
“You’re running Riverside High.”
Metrics as type: 18 teachers · 12 classes · 340 students — wrap on mobile, no cards.
“These figures stay inside this school.”
Links: Teachers · Classes · Students (stack <480).

Admin nav in hamburger on small screens. Count-up 600ms.
```

---

## Screen 14 — Admin Teachers / Classes / Students

```
Three screens, Lumen, Outfit only, responsive.

TEACHERS: ≥1024 split form | table. <1024 form on top, directory below. Inputs 48px, 12px radius. “Save teacher” full width on mobile.

CLASSES: add form then roster blocks; blocks stack on mobile.

STUDENTS: directory; “By class” accordion on mobile.

Isolation one-liner. Focus ring harbor 150ms.
```

---

## Screen 15 — Marketing landing

```
EdVidura marketing. Outfit for all type. Lumen. Responsive.

FIRST VIEWPORT:
≥1024: full-bleed classroom photo; left paper gradient; type on paper.
<768: image 50vh on top, type below on paper — no unreadable overlay.

Brand Outfit 700 clamp(36px, 8vw, 72px)
Headline: “Learning that stays with the class.”
Sentence: “Moodle keeps people and grades. EdVidura keeps the path.”
CTAs: “Open in Moodle” lagoon · “See how it works” ghost — stack 100% width <480.

No stats, no logo cloud, no feature pills.
Ken-Burns 12s desktop only; off if reduced-motion or mobile.
```

---

## If the model drifts

```
Reset: Outfit for ALL type (no Fraunces, Sora, Inter). Lumen colors paper #F6F1E8 ink #0F1C24 lagoon #0E7C66 harbor #1F4E79. Fully responsive 390–1440, hamburger <1024, full-width CTAs <480, tables stack <768. No purple, no KPI cards, no confetti.
```

## Order

00 shell → 01 Home → 02 Lessons → 03 Player → 04 Quiz → 05 Result → 06 Gate → 07–08 Manuals → 09 Ask Vidura → 10 Progress → 11–12 Teacher → 13–14 Admin → 15 Landing.
