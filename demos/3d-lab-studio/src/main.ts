import './styles.css';
import { plannerMode } from './chapterPlanner';
import { buildClassroomPrompt, pollMeshJob, startMeshJob } from './meshGen';
import { extractChapterFromPdf } from './pdfChapter';
import { ALL_PLAYGROUNDS, expandTopicText, newDraftId, proposeFromChapter, sampleBody } from './propose';
import { PLAYGROUND_LABELS, mountPlayground } from './runtimes';
import { getPack, loadPacks, upsertPack } from './storage';
import type { LabHandle, LabPack, PlaygroundId } from './types';

type Mode = 'teacher' | 'library' | 'learner';

const app = document.querySelector('#app') as HTMLElement;
let mode: Mode = 'library';
let draft: LabPack | null = null;
let learnerId: string | null = null;
let lab: LabHandle | null = null;
let uploadStatus = '';
let lastPdfMeta: { sourceName: string; pageCount: number } | null = null;
/** Keep typed text across re-renders while developing. */
let composeTitle = '';
let composeBody = '';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdLite(text: string): string {
  return esc(text)
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<h2>)/, '<p>')
    .replace(/(?<!<\/h2>)$/s, '</p>');
}

function stopLab() {
  lab?.dispose();
  lab = null;
}

function setMode(next: Mode, packId?: string) {
  mode = next;
  if (packId) learnerId = packId;
  stopLab();
  render();
}

function render() {
  const published = loadPacks().filter((p) => p.status === 'published');
  const count = published.length;
  const featured = published[0];
  app.innerHTML = `
    <header class="topbar">
      <h1 class="brand">
        <span class="brand-mark material-symbols-outlined">school</span>
        EdVidura
        <span class="muted">VR lab</span>
        <span class="badge">Demo</span>
      </h1>
      <nav class="nav">
        <button type="button" data-nav="teacher" class="${mode === 'teacher' ? 'on' : ''}">
          <span class="material-symbols-outlined">edit_note</span> Type → Interactive
        </button>
        <button type="button" data-nav="library" class="${mode === 'library' ? 'on' : ''}">
          <span class="material-symbols-outlined">apps</span> Library
        </button>
        <button type="button" data-nav="learner" class="${mode === 'learner' ? 'on' : ''}">
          <span class="material-symbols-outlined">view_in_ar</span> Launch
        </button>
      </nav>
    </header>
    <main class="shell">
      <div class="studio-grid">
        <section class="hub-hero studio-main">
          <img src="https://images.unsplash.com/photo-1593508512255-86ab42a8e620?auto=format&fit=crop&w=1600&q=80" alt="">
          <div class="hub-hero-body">
            <p class="hub-kicker">Spatial labs</p>
            <h1>${featured ? esc(featured.title) : 'Walk the graph in 3D'}</h1>
            <p class="hub-hero-sub">${count} experience${count === 1 ? '' : 's'} for Quest or Chrome.</p>
          </div>
        </section>
        <section class="hub-cal studio-rail">
          <img src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=70" alt="">
          <div class="hub-cal-body">
            <h2>Headset ready</h2>
            <p>Open any lab in the browser or on Quest.</p>
          </div>
        </section>
      </div>
      <div class="hub-seg">
        <button type="button" class="hub-seg-btn ${mode === 'library' ? 'on' : ''}" data-nav="library">
          <span class="material-symbols-outlined">apps</span> All apps
        </button>
        <button type="button" class="hub-seg-btn ${mode === 'teacher' ? 'on' : ''}" data-nav="teacher">
          <span class="material-symbols-outlined">edit_note</span> Type → Interactive
        </button>
        <button type="button" class="hub-seg-btn ${mode === 'learner' ? 'on' : ''}" data-nav="learner">
          <span class="material-symbols-outlined">view_in_ar</span> Launch
        </button>
      </div>
      ${mode === 'teacher' ? renderTeacher() : ''}
      ${mode === 'library' ? renderLibrary() : ''}
      ${mode === 'learner' ? renderLearner() : ''}
      <p class="footer-note">
        Main purpose: typed text → develop → interactive 3D · planner ${
          plannerMode() === 'heuristic' ? 'heuristic' : plannerMode()
        } · demo (not Moodle/LTI).
      </p>
    </main>
  `;

  app.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => setMode((btn as HTMLElement).dataset.nav as Mode));
  });

  if (mode === 'teacher') bindTeacher();
  if (mode === 'library') bindLibrary();
  if (mode === 'learner') bindLearner();
}

function renderTeacher(): string {
  const title = composeTitle || draft?.title || '';
  const body = composeBody || draft?.bodyMd || '';
  const playground = draft?.playground;
  const step = !draft ? 1 : 2;
  return `
    <div class="t2i-pipeline" role="list">
      <div class="t2i-step ${step === 1 ? 'on' : 'done'}" role="listitem"><span class="t2i-num">1</span> Type text</div>
      <span class="t2i-arrow material-symbols-outlined">arrow_forward</span>
      <div class="t2i-step ${step >= 2 ? 'on' : ''}" role="listitem"><span class="t2i-num">2</span> Develop interactive</div>
      <span class="t2i-arrow material-symbols-outlined">arrow_forward</span>
      <div class="t2i-step" role="listitem"><span class="t2i-num">3</span> Try &amp; publish</div>
    </div>
    <p class="lede">Main purpose: type or paste a chapter → Develop → interactive callouts + live 3D appear on the right.</p>
    <div class="grid-2">
      <section class="hub-card">
        <p class="kicker">1 · Type</p>
        <h2>Chapter text</h2>
        <label class="field">Title
          <input id="title" value="${esc(title)}" placeholder="e.g. Water cycle and our rains" />
        </label>
        <label class="field">Chapter text (type or paste — or leave blank; we auto-fill from the title)
          <textarea id="body" placeholder="Leave blank for auto-fill from title, or paste a chapter…">${esc(body)}</textarea>
        </label>
        <div class="row">
          <button type="button" class="btn btn-primary" id="propose">Develop into interactive</button>
          <button type="button" class="btn btn-ghost" id="autofill-title">Auto-fill from title</button>
          <label class="btn btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:0.35rem">
            <span class="material-symbols-outlined">picture_as_pdf</span> Or load PDF
            <input id="pdf" type="file" accept="application/pdf,.pdf" class="sr-only" />
          </label>
        </div>
        ${uploadStatus ? `<p class="meta" id="upload-status">${esc(uploadStatus)}</p>` : '<p class="meta">Short title only is fine — we expand it into a chapter draft, then build the interactive lab.</p>'}
        <details class="samples">
          <summary>Optional: load a demo sample</summary>
          <div class="chips">
            ${ALL_PLAYGROUNDS.map(
              (id) =>
                `<button type="button" class="chip" data-sample="${id}">${PLAYGROUND_LABELS[id].split('(')[0].trim()}</button>`
            ).join('')}
          </div>
        </details>
      </section>
      <section class="hub-card">
        <p class="kicker">2 · Interactive from your text</p>
        ${
          draft
            ? `
          <h2>${esc(draft.title)}</h2>
          <p class="meta">${PLAYGROUND_LABELS[draft.playground]}
            · ${draft.scene?.planner || 'heuristic'}${draft.scene?.model ? ` (${esc(draft.scene.model)})` : ''}
          </p>
          <p style="color:var(--muted);font-size:0.88rem">${esc(draft.note)}</p>
          <label class="field">Template
            <select id="playground">
              ${(Object.keys(PLAYGROUND_LABELS) as PlaygroundId[])
                .map(
                  (id) =>
                    `<option value="${id}" ${id === playground ? 'selected' : ''}>${PLAYGROUND_LABELS[id]}</option>`
                )
                .join('')}
            </select>
          </label>
          <ul class="callout-list">
            ${draft.callouts
              .map(
                (c, i) => `
              <li>
                <button type="button" class="t2i-callout" data-focus="${esc(c.id)}">
                  <strong>${i + 1} · ${esc(c.label)}</strong>
                  <span>${esc(c.body)}</span>
                </button>
                <label class="field" style="margin:0.35rem 0 0">Edit callout
                  <textarea data-callout="${i}" rows="2">${esc(c.body)}</textarea>
                </label>
              </li>`
              )
              .join('')}
          </ul>
          <div class="t2i-play-wrap">
            <p class="kicker" style="color:#c8f542">Live playground</p>
            <div id="t2i-lab-host" class="lab-host"></div>
          </div>
          ${
            draft.scene?.mesh
              ? `<p class="meta">AI mesh: ${esc(draft.scene.mesh.provider || '')} · ${esc(
                  draft.scene.mesh.status || ''
                )}${draft.scene.mesh.approved ? ' · approved' : ' · needs approve'}</p>`
              : ''
          }
          <div class="row">
            <button type="button" class="btn btn-ghost" id="gen-mesh">New concept → AI 3D</button>
            <button type="button" class="btn btn-ghost" id="approve-mesh" ${
              draft.playground === 'ai_mesh' && draft.scene?.mesh && !draft.scene.mesh.approved
                ? ''
                : 'hidden'
            }>Approve AI mesh</button>
            <button type="button" class="btn btn-ghost" id="preview">Open full launch</button>
            <button type="button" class="btn btn-ok" id="publish">Publish for students</button>
            <button type="button" class="btn btn-ghost" id="save-draft">Save draft</button>
            <button type="button" class="btn btn-ghost" id="clear-draft">Clear</button>
          </div>
        `
            : `<div class="t2i-placeholder">
                <span class="material-symbols-outlined t2i-placeholder-icon">view_in_ar</span>
                <p><strong>Interactive side stays empty until you develop</strong></p>
                <p class="meta">Type on the left → Develop → callouts and 3D appear here from your words.</p>
              </div>`
        }
      </section>
    </div>
  `;
}

function bindTeacher() {
  const titleEl = app.querySelector('#title') as HTMLInputElement | null;
  const bodyEl = app.querySelector('#body') as HTMLTextAreaElement | null;
  titleEl?.addEventListener('input', () => {
    composeTitle = titleEl.value;
  });
  bodyEl?.addEventListener('input', () => {
    composeBody = bodyEl.value;
  });

  app.querySelector('#pdf')?.addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploadStatus = `Reading ${file.name}…`;
    render();
    try {
      const chapter = await extractChapterFromPdf(file);
      lastPdfMeta = { sourceName: chapter.sourceName, pageCount: chapter.pageCount };
      composeTitle = chapter.title;
      composeBody = chapter.body;
      uploadStatus = `Developing interactive from ${chapter.sourceName} (${plannerMode()})…`;
      render();
      const proposed = await proposeFromChapter(chapter.title, chapter.body, {
        sourceName: chapter.sourceName,
        pageCount: chapter.pageCount,
      });
      draft = {
        id: draft?.id || newDraftId(),
        status: 'draft',
        updatedAt: new Date().toISOString(),
        ...proposed,
      };
      composeTitle = draft.title;
      composeBody = draft.bodyMd;
      uploadStatus = `Interactive from ${chapter.sourceName} · ${chapter.pageCount} pages · ${draft.scene?.planner || 'heuristic'}`;
      render();
    } catch (err) {
      lastPdfMeta = null;
      uploadStatus = err instanceof Error ? err.message : 'Could not read PDF.';
      render();
    }
  });

  app.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.sample as PlaygroundId;
      const sample = sampleBody(id);
      lastPdfMeta = null;
      composeTitle = sample.title;
      composeBody = sample.body;
      uploadStatus = `Demo sample loaded (${id}) — type your own text for real chapters.`;
      render();
    });
  });

  const applyAutofill = (force = false) => {
    const title = (app.querySelector('#title') as HTMLInputElement).value;
    const bodyMd = (app.querySelector('#body') as HTMLTextAreaElement).value;
    if (!(title.trim() || bodyMd.trim())) {
      uploadStatus = 'Type a short title first (e.g. Volcanoes).';
      render();
      return null;
    }
    if (!force && bodyMd.trim().length >= 40) {
      return { title: title.trim(), body: bodyMd, autofilled: false };
    }
    const filled = expandTopicText(title, force ? '' : bodyMd);
    composeTitle = filled.title;
    composeBody = filled.body;
    uploadStatus = filled.autofilled
      ? `Auto-filled chapter from “${filled.title}” — edit if you want, then Develop`
      : 'Chapter text ready';
    render();
    return filled;
  };

  app.querySelector('#autofill-title')?.addEventListener('click', () => {
    applyAutofill(true);
  });

  // Blur on title: if body is empty/short, auto-fill so teacher sees the draft
  titleEl?.addEventListener('blur', () => {
    const bodyNow = (app.querySelector('#body') as HTMLTextAreaElement | null)?.value || '';
    if (titleEl.value.trim() && bodyNow.trim().length < 40) {
      const filled = expandTopicText(titleEl.value, bodyNow);
      if (filled.autofilled) {
        composeTitle = filled.title;
        composeBody = filled.body;
        const bodyField = app.querySelector('#body') as HTMLTextAreaElement | null;
        const titleField = app.querySelector('#title') as HTMLInputElement | null;
        if (titleField) titleField.value = filled.title;
        if (bodyField) bodyField.value = filled.body;
        uploadStatus = `Auto-filled from short title “${filled.title}”`;
        const status = app.querySelector('#upload-status');
        if (status) status.textContent = uploadStatus;
        else {
          const meta = document.createElement('p');
          meta.className = 'meta';
          meta.id = 'upload-status';
          meta.textContent = uploadStatus;
          titleEl.closest('.hub-card')?.appendChild(meta);
        }
      }
    }
  });

  app.querySelector('#propose')?.addEventListener('click', async () => {
    const title = (app.querySelector('#title') as HTMLInputElement).value;
    const bodyMd = (app.querySelector('#body') as HTMLTextAreaElement).value;
    if (!(title.trim() || bodyMd.trim())) {
      uploadStatus = 'Type a topic (e.g. Volcanoes) or paste a short chapter.';
      render();
      return;
    }
    const filled = expandTopicText(title, bodyMd);
    composeTitle = filled.title;
    composeBody = filled.body;
    uploadStatus = filled.autofilled
      ? `Auto-filled “${filled.title}”, developing interactive (${plannerMode()})…`
      : `Developing interactive (${plannerMode()})…`;
    render();
    try {
      const proposed = await proposeFromChapter(filled.title, filled.body, lastPdfMeta || undefined);
      draft = {
        id: draft?.id || newDraftId(),
        status: 'draft',
        updatedAt: new Date().toISOString(),
        ...proposed,
      };
      composeTitle = draft.title;
      composeBody = draft.bodyMd;
      uploadStatus = lastPdfMeta
        ? `Interactive from ${lastPdfMeta.sourceName}`
        : filled.autofilled
          ? `Short title expanded → interactive lab ready — try the playground, then publish`
          : 'Your text is now interactive — try the playground, then publish';
      render();
    } catch (err) {
      uploadStatus = err instanceof Error ? err.message : 'Develop failed.';
      render();
    }
  });

  if (!draft) return;

  app.querySelector('#playground')?.addEventListener('change', async (e) => {
    if (!draft) return;
    const pg = (e.target as HTMLSelectElement).value as PlaygroundId;
    const again = await proposeFromChapter(draft.title, draft.bodyMd, {
      forcePlayground: pg,
      ...(lastPdfMeta || {}),
    });
    draft.playground = pg;
    draft.callouts = again.callouts;
    draft.scene = again.scene;
    draft.note = again.note;
    render();
  });

  app.querySelectorAll('[data-callout]').forEach((el) => {
    el.addEventListener('change', () => {
      if (!draft) return;
      const i = Number((el as HTMLElement).dataset.callout);
      draft.callouts[i] = {
        ...draft.callouts[i],
        body: (el as HTMLTextAreaElement).value.slice(0, 400),
      };
    });
  });

  const persist = (status: LabPack['status']) => {
    if (!draft) return;
    draft.callouts = draft.callouts.map((c, i) => {
      const ta = app.querySelector(`[data-callout="${i}"]`) as HTMLTextAreaElement | null;
      return ta ? { ...c, body: ta.value.slice(0, 400) } : c;
    });
    const titleEl = app.querySelector('#title') as HTMLInputElement | null;
    const bodyEl = app.querySelector('#body') as HTMLTextAreaElement | null;
    if (titleEl) draft.title = titleEl.value.slice(0, 120);
    if (bodyEl) draft.bodyMd = bodyEl.value.slice(0, 12000);
    draft.status = status;
    draft.updatedAt = new Date().toISOString();
    upsertPack({ ...draft });
  };

  app.querySelector('#save-draft')?.addEventListener('click', () => {
    persist('draft');
    setMode('library');
  });

  app.querySelector('#gen-mesh')?.addEventListener('click', async () => {
    if (!draft) return;
    uploadStatus = 'Starting text→3D…';
    render();
    try {
      const prompt = buildClassroomPrompt(draft.title, draft.bodyMd);
      let job = await startMeshJob(prompt);
      for (let i = 0; i < 60; i++) {
        if (job.status === 'SUCCEEDED' || job.status === 'FAILED' || job.status === 'CANCELED') break;
        await new Promise((r) => setTimeout(r, 2500));
        job = await pollMeshJob(job);
        uploadStatus = `AI mesh ${job.status}`;
        // keep draft identity while polling UI refreshes lightly
      }
      draft.playground = 'ai_mesh';
      draft.scene = {
        hudHint: 'Orbit the AI-generated classroom model',
        objectives: draft.scene?.objectives || [],
        hotspots: [],
        sliders: [],
        quiz: draft.scene?.quiz || [],
        planner: draft.scene?.planner || 'heuristic',
        mesh: { ...job, approved: false },
      };
      draft.note = `AI mesh (${job.provider}) — approve mesh, then publish.`;
      draft.callouts = draft.callouts.length
        ? draft.callouts
        : [{ id: 'model', label: '3D model', body: prompt.slice(0, 200) }];
      uploadStatus =
        job.status === 'SUCCEEDED'
          ? 'Mesh ready — Approve AI mesh, then publish'
          : job.note || 'Mesh job ended';
      render();
    } catch (err) {
      uploadStatus = err instanceof Error ? err.message : 'Mesh failed';
      render();
    }
  });

  app.querySelector('#approve-mesh')?.addEventListener('click', () => {
    if (!draft?.scene?.mesh) return;
    draft.scene.mesh.approved = true;
    uploadStatus = 'AI mesh approved';
    render();
  });

  app.querySelector('#publish')?.addEventListener('click', () => {
    if (draft?.playground === 'ai_mesh' && !draft.scene?.mesh?.approved) {
      uploadStatus = 'Approve the AI mesh before publishing for students.';
      render();
      return;
    }
    persist('published');
    learnerId = draft!.id;
    setMode('learner');
  });

  app.querySelector('#preview')?.addEventListener('click', () => {
    persist('draft');
    learnerId = draft!.id;
    setMode('learner');
  });

  app.querySelector('#clear-draft')?.addEventListener('click', () => {
    stopLab();
    draft = null;
    composeTitle = '';
    composeBody = '';
    uploadStatus = '';
    lastPdfMeta = null;
    render();
  });

  // Live playground from developed text (main purpose preview)
  const labHost = app.querySelector('#t2i-lab-host') as HTMLElement | null;
  if (labHost && draft) {
    stopLab();
    lab = mountPlayground(labHost, draft, (id) => {
      app.querySelectorAll('.t2i-callout').forEach((el) => {
        el.classList.toggle('on', (el as HTMLElement).dataset.focus === id);
      });
    });
    app.querySelectorAll('.t2i-callout').forEach((btn) => {
      btn.addEventListener('click', () => {
        lab?.focus?.((btn as HTMLElement).dataset.focus || '');
      });
    });
  }
}

function renderLibrary(): string {
  const packs = loadPacks().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!packs.length) {
    return `<div class="hub-card flat"><p class="empty">No XR experiences available for this tenant yet.</p></div>`;
  }
  return `
    <div class="grid-2">
      ${packs
        .map(
          (p) => `
        <article class="hub-card">
          <p class="kicker">${PLAYGROUND_LABELS[p.playground]}</p>
          <h2>${esc(p.title)}</h2>
          <p class="meta status-${p.status}">${p.status}</p>
          <div class="row">
            <button type="button" class="btn btn-ghost" data-open="${p.id}">Details</button>
            ${
              p.status === 'published'
                ? `<button type="button" class="btn btn-primary" data-learn="${p.id}">Launch</button>`
                : `<button type="button" class="btn btn-ok" data-publish="${p.id}">Approve</button>`
            }
          </div>
        </article>`
        )
        .join('')}
    </div>
  `;
}

function bindLibrary() {
  app.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.open!;
      draft = getPack(id) || null;
      composeTitle = draft?.title || '';
      composeBody = draft?.bodyMd || '';
      setMode('teacher');
    });
  });
  app.querySelectorAll('[data-learn]').forEach((btn) => {
    btn.addEventListener('click', () => setMode('learner', (btn as HTMLElement).dataset.learn));
  });
  app.querySelectorAll('[data-publish]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.publish!;
      const pack = getPack(id);
      if (!pack) return;
      pack.status = 'published';
      pack.updatedAt = new Date().toISOString();
      upsertPack(pack);
      render();
    });
  });
}

function renderLearner(): string {
  const published = loadPacks().filter((p) => p.status === 'published');
  const pack =
    (learnerId && getPack(learnerId)) ||
    published[0] ||
    null;
  if (pack && pack.status === 'draft' && learnerId === pack.id) {
    // allow teacher preview of draft
  } else if (pack && pack.status !== 'published' && !learnerId) {
    return `<div class="hub-card flat"><p class="empty">No XR experiences available for this tenant yet.</p></div>`;
  }
  if (!pack) {
    return `<div class="hub-card flat"><p class="empty">No XR experiences available for this tenant yet.</p></div>`;
  }
  learnerId = pack.id;
  return `
    <div class="learner">
      <section class="hub-card">
        <p class="kicker">${PLAYGROUND_LABELS[pack.playground]}</p>
        <h2>${esc(pack.title)}</h2>
        <p class="meta">From chapter · ${pack.scene?.planner || 'heuristic'} planner</p>
        <div class="textbook">${mdLite(pack.bodyMd)}</div>
        ${
          pack.scene?.objectives?.length
            ? `<p class="kicker">Learning goals</p><ul class="callout-list">${pack.scene.objectives
                .map((o) => `<li>${esc(o)}</li>`)
                .join('')}</ul>`
            : ''
        }
        <ul class="callout-list">
          ${pack.callouts
            .map(
              (c) => `
            <li>
              <strong>${esc(c.label)}</strong>
              <div style="color:var(--muted);font-size:0.88rem">${esc(c.body)}</div>
              <button type="button" class="linkish" data-focus="${esc(c.id)}">Show in 3D</button>
            </li>`
            )
            .join('')}
        </ul>
        ${
          pack.scene?.quiz?.length
            ? `<p class="kicker">Check understanding</p>
          <ul class="callout-list quiz-list">
            ${pack.scene.quiz
              .map(
                (q, qi) => `
              <li data-quiz="${qi}">
                <strong>Q${qi + 1}.</strong> ${esc(q.q)}
                <div class="quiz-choices">
                  ${q.choices
                    .map(
                      (c, ci) =>
                        `<button type="button" class="chip" data-quiz="${qi}" data-choice="${ci}">${esc(c)}</button>`
                    )
                    .join('')}
                </div>
                <div class="meta" data-quiz-result="${qi}"></div>
              </li>`
              )
              .join('')}
          </ul>`
            : ''
        }
        ${
          published.length > 1
            ? `<label class="field">Switch lab
            <select id="switch-lab">
              ${published
                .map(
                  (p) =>
                    `<option value="${p.id}" ${p.id === pack.id ? 'selected' : ''}>${esc(p.title)}</option>`
                )
                .join('')}
            </select>
          </label>`
            : ''
        }
      </section>
      <section class="hub-card stage-wrap">
        <p class="kicker">Playground</p>
        <h2>Interactive 3D</h2>
        <div id="lab-host"></div>
      </section>
    </div>
  `;
}

function bindLearner() {
  const pack = learnerId ? getPack(learnerId) : undefined;
  const host = app.querySelector('#lab-host') as HTMLElement | null;
  if (!pack || !host) return;

  lab = mountPlayground(host, pack, (id) => {
    const item = pack.callouts.find((c) => c.id === id);
    if (item) {
      // soft highlight via scroll — optional
    }
  });

  app.querySelectorAll('[data-focus]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.focus || '';
      lab?.focus?.(id);
    });
  });

  app.querySelector('#switch-lab')?.addEventListener('change', (e) => {
    setMode('learner', (e.target as HTMLSelectElement).value);
  });

  app.querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const qi = Number(el.dataset.quiz);
      const ci = Number(el.dataset.choice);
      const q = pack.scene?.quiz?.[qi];
      const result = app.querySelector(`[data-quiz-result="${qi}"]`) as HTMLElement | null;
      if (!q || !result) return;
      result.textContent = ci === q.answer ? 'Correct — matches the chapter.' : 'Not quite — try another choice.';
      result.style.color = ci === q.answer ? 'var(--ok)' : 'var(--danger)';
    });
  });
}

render();
