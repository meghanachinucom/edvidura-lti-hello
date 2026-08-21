# EdVidura current UI — Lovable prompt

Paste everything below the line into a new Lovable project.

---

Build a **React + Vite + TypeScript + Tailwind** (or CSS modules) multi-page UI mock for **EdVidura**, an LTI learning tool embedded in Moodle. This must match the **current production shell** exactly — not a generic purple SaaS dashboard, not Inter, not light gray cards with indigo accents.

## Product context (UI only — mock data)

Three roles share one cinematic shell:

1. **Learner** — Home → Lessons → Quiz → Result  
2. **Instructor / teacher** — Upload content, Class results, Learners  
3. **School admin** — Dashboard, Teachers, Classes, Students, Workspace  

Learner opens from Moodle. School admin runs **one school only** (tenant-isolated). Toggle **Student / Teacher / School admin** in the shell mock.

Use client-side routing (`react-router`) with these routes and mock data:

| Route | Screen | Role |
|-------|--------|------|
| `/` | Home (Launch Hub) | All |
| `/lessons` | Lessons list | Learner |
| `/lessons/:id` | Lesson player | Learner |
| `/quiz` | Quiz session | Learner |
| `/quiz/result` | Quiz result | Learner |
| `/attempts` | My attempts | Learner |
| `/teacher/content` | Upload content | Teacher |
| `/teacher/attempts` | Class results | Teacher |
| `/school-admin` | School admin dashboard | School admin |
| `/school-admin/teachers` | Teachers directory + add form | School admin |
| `/school-admin/classes` | Classes + roster + add form | School admin |
| `/school-admin/students` | Students directory | School admin |
| `/workspace` | Full school workspace summary | School admin |

Toggle **Student / Teacher / School admin** in the shell footer mock so Teach vs School admin nav appears correctly.

## Visual system (mandatory)

### Palette (Coolors [0d3b66-faf0ca-f4d35e-ee964b-f95738](https://coolors.co/palette/0d3b66-faf0ca-f4d35e-ee964b-f95738))

- Deep blue `#0d3b66` — brand panel / navy
- Cream `#faf0ca` — body text / fog highlights
- Gold `#f4d35e` — accents, active nav, “Vidura”, progress
- Orange `#ee964b` — hover / secondary warm
- Coral `#f95738` — primary CTA buttons

Ink/panel are darker blues derived from `#0d3b66` (`#071f38`, `#0a2a4a`).

### Typography

- Display / brand / titles: **Syne** (700/800) from Google Fonts  
- Body: **Outfit** (400–700) from Google Fonts  
- **Do not use** Inter, Roboto, Arial, or system UI as primary fonts.

### Layout — cinematic split shell

Full viewport CSS grid:

1. **Left brand panel** (~40%, min ~300px) — dark cinematic brand
2. **Right content** — dark panel `#0e1628` with sticky topbar + main

Mobile (&lt;980px): brand panel becomes off-canvas drawer; hamburger in topbar.

### Left brand panel (must look cinematic)

- Background: layered radial amber glow + navy gradient  
  `linear-gradient(160deg, #05080f 0%, #14213d 48%, #070b14 100%)` plus amber radial highlights
- Thin amber border on the right edge
- Animated subtle diagonal stripe overlay (slow drift)
- Slow spinning soft amber conic wash
- Decorative **orbit** rings (pulsing circle, top-right)
- Top content:
  - Kicker: `LEARNING CHECK` — amber, uppercase, wide letter-spacing
  - Giant brand: **Ed** (white) stacked over **Vidura** (amber) — Syne 800, clamp ~2.8–4.6rem, tight tracking
  - Meta: `Algebra I · Riverside High` (mute)
- Nav sections:
  - **Learn:** 01 Home, 02 Lessons, 03 My attempts, 04 Take the quiz, 05 Latest result
  - **School admin** (school admin only): A1 Dashboard, A2 Teachers, A3 Classes, A4 Students, A5 Workspace
  - **Teach** (teacher only): 06 Upload content, 07 Class results, 10 Learners
  - **Setup** (teacher): 08 Moodle connection, 09 Institutions
- Nav links: mute text; **active** = amber text + amber left border + faint amber fill; numbered `01` / `A1` style with Syne
- Footer: learner name (white), role (amber: Student / Instructor / School admin), button `← Back to Moodle` (amber outline → solid amber on hover)

### Right content

- Sticky topbar: dark translucent blur; page title in Syne; `← Back to Moodle` outline button
- Main max-width ~920px, padding ~1.5rem
- Soft **rise** entrance animation on welcome / insights / lists

### Components

**Home**

- Welcome block with huge watermark number `01` behind title
- Title: `Hi, Alice` (first name)
- Lede about institution + course
- CTAs: primary amber sharp (no pill radius) `Continue learning`; secondary outline buttons
- Thin amber progress bar for lesson progress
- Three insight columns with amber left rule: attempts, last score, gradebook sync On/Off
- Soft amber note if grade sync off

**Lessons**

- Same welcome pattern (`02`)
- Ordered list of lesson rows: number amber, title, type (Reading/Video/Quiz), arrow; hover amber border; completed slightly faded

**Lesson player**

- Title + optional 16:9 video frame + muted prose
- Actions: Previous (secondary) + Mark done & continue (primary amber)

**Quiz**

- Meta line (question count · sync status)
- Fieldsets: amber uppercase legend, white prompt, choice rows with border; checked = amber border + tint
- Sticky submit bar with amber Submit

**Result**

- Giant amber score `2 / 3`
- Banner for Moodle sync status
- Review list with green/red left borders
- Try again / My attempts / Back to Moodle

**School admin dashboard**

- Welcome: `Hi, Riverside` (or admin first name) + “You’re running Riverside High”
- Four insight tiles: Teachers, Classes, Students, Quiz attempts
- Table of school admins
- Classes at a glance with student counts
- CTAs to Teachers / Classes / Students

**School admin · Teachers**

- Left/right: Add teacher form (code, name, email) + directory table
- Sharp amber Save teacher button

**School admin · Classes**

- Add class form (code, name, subject, term)
- Roster blocks: class name, teachers, student list

**School admin · Students**

- Flat directory table + “By class” sections

**Buttons**

- Sharp corners (border-radius 0) for primary/secondary CTAs
- Primary: amber bg, black text
- Secondary: transparent, fog text, white border → amber on hover
- Slight translateY on hover

### Explicit anti-patterns (do not build these)

- Purple / indigo accent SaaS theme
- Light `#f8fafc` content area with white cards and soft shadows
- Rounded-full pills, Inter font, generic dashboard KPI cards with icons in colored squares
- Inset hero image cards or floating badge stickers on the brand panel

### Mock data

- Tenant: Riverside High  
- Course: Algebra I  
- Learner: Alice Nguyen (Student)  
- Teacher: Priya Shah (Instructor)  
- School admin: Riverside Admin (`admin@riverside.test`)  
- Teachers directory: Priya Shah, James Cole (+ form to add)  
- Classes: 3 classes with teachers + 3 students each  
- Lessons: 3 items (2 reading done, 1 quiz pending)  
- Quiz: 3 multiple-choice questions  
- Result: score 2/3, AGS sync “Saved in EdVidura…”

### Deliverable

A polished clickable prototype with the shell on every page, working nav, and the screens above. Match the mood: dark editorial / cinematic learning tool, amber as the only warm accent.
