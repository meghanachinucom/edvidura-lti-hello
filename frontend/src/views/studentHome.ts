/**
 * Student course home — CampusHub-style dashboard for this LTI course.
 */
import { state, setScreen, showToast } from '../state';
import { escapeHtml, firstName, openLiveLesson } from '../boot';
import { hubDash, hubMetric } from '../components/hub';

type HomeLesson = {
  id: string;
  title: string;
  lesson_type: string;
  completed: boolean;
  position: number;
};

const DEMO_LESSONS: HomeLesson[] = [
  { id: 'd1', title: 'Slope as rate of change', lesson_type: 'reading', completed: true, position: 1 },
  { id: 'd2', title: 'Graphing y = mx + b', lesson_type: 'lab', completed: true, position: 2 },
  { id: 'd3', title: 'Cartesian graphs and intercepts', lesson_type: 'lab', completed: false, position: 3 },
  { id: 'd4', title: 'Standard form Ax + By = C', lesson_type: 'reading', completed: false, position: 4 },
  { id: 'd5', title: 'Perpendicular slopes', lesson_type: 'reading', completed: false, position: 5 },
  { id: 'd6', title: 'Checkpoint 2 quiz', lesson_type: 'quiz', completed: false, position: 6 },
  { id: 'd7', title: 'Handbook: linear functions', lesson_type: 'reading', completed: false, position: 7 },
  { id: 'd8', title: 'Independent practice set', lesson_type: 'reading', completed: false, position: 8 },
];

function courseLessons(): HomeLesson[] {
  if (state.connected && state.liveLessons.length) {
    return state.liveLessons.map((l, i) => ({
      id: l.id,
      title: l.title,
      lesson_type: l.lesson_type || 'reading',
      completed: Boolean(l.completed),
      position: l.position || i + 1,
    }));
  }
  return DEMO_LESSONS;
}

function smoothPath(pts: Array<[number, number]>): string {
  if (!pts.length) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const cx = (a[0] + b[0]) / 2;
    d += ` C ${cx.toFixed(1)} ${a[1].toFixed(1)}, ${cx.toFixed(1)} ${b[1].toFixed(1)}, ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  return d;
}

function hubArea(values: number[], id: string): string {
  const w = 560;
  const h = 148;
  const padX = 8;
  const padY = 10;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(values.length - 1, 1);
    const y = h - padY - (v / max) * (h - padY * 2);
    return [x, y] as [number, number];
  });
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const fill = `${line} L ${last[0].toFixed(1)} ${h} L ${first[0].toFixed(1)} ${h} Z`;
  return `
    <svg viewBox="0 0 ${w} ${h}" class="w-full h-[132px]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${id}-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FE580D" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#FE580D" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${fill}" fill="url(#${id}-fill)"/>
      <path class="hub-line" d="${line}" fill="none" stroke="#FE580D" stroke-width="3.2" stroke-linecap="round"/>
    </svg>`;
}

function hubRhythm(): string {
  const w = 560;
  const h = 176;
  const padX = 36;
  const padY = 18;
  const bars = [
    0.28, 0.34, 0.4, 0.32, 0.3,
    0.36, 0.72, 0.88, 0.7, 0.38,
    0.3, 0.42, 0.36, 0.4, 0.33,
    0.38, 0.48, 0.44, 0.4, 0.35,
    0.42, 0.9, 0.95, 0.62, 0.4,
    0.32, 0.38, 0.34, 0.3, 0.28,
    0.26, 0.3, 0.28, 0.24, 0.22,
  ];
  const hot = new Set([6, 7, 8, 21, 22, 23]);
  const n = bars.length;
  const bw = 8;
  const gap = (w - padX * 2 - bw * n) / Math.max(n - 1, 1);
  const plotH = h - padY * 2 - 16;
  const linePts: Array<[number, number]> = [];
  for (let d = 0; d < 7; d++) {
    const slice = bars.slice(d * 5, d * 5 + 5);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const x = padX + (d * 5 + 2) * (bw + gap) + bw / 2;
    const y = padY + (1 - avg / 1.05) * plotH;
    linePts.push([x, y]);
  }
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `
    <svg viewBox="0 0 ${w} ${h}" class="w-full h-[168px]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <text x="4" y="${padY + 4}" font-size="10" fill="#94A3B8" font-family="Outfit, sans-serif">8h</text>
      <text x="4" y="${padY + plotH * 0.28}" font-size="10" fill="#94A3B8" font-family="Outfit, sans-serif">6h</text>
      <text x="4" y="${padY + plotH * 0.72}" font-size="10" fill="#94A3B8" font-family="Outfit, sans-serif">2h</text>
      <text x="4" y="${padY + plotH}" font-size="10" fill="#94A3B8" font-family="Outfit, sans-serif">0h</text>
      ${bars.map((v, i) => {
        const x = padX + i * (bw + gap);
        const bh = Math.max(8, v * plotH);
        const y = padY + plotH - bh;
        const on = hot.has(i);
        return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${on ? '#FE580D' : '#E8EAED'}"/>`;
      }).join('')}
      <path class="hub-line" d="${smoothPath(linePts)}" fill="none" stroke="#3F3F46" stroke-width="2" stroke-linecap="round"/>
      ${days.map((d, i) => {
        const x = padX + (i * 5 + 2) * (bw + gap) + bw / 2;
        return `<text x="${x}" y="${h - 2}" text-anchor="middle" font-size="10" fill="#94A3B8" font-family="Outfit, sans-serif">${d}</text>`;
      }).join('')}
    </svg>`;
}

function hubHeat(): string {
  const days: number[][] = [
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 1, 3, 3, 2, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 3, 3, 2, 1, 2, 2, 1, 0, 0],
    [0, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, 0],
    [0, 0, 0, 2, 3, 3, 2, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0],
  ];
  const tone = (n: number) => (n >= 3 ? 'h' : n === 2 ? 'm' : n === 1 ? 'l' : 'z');
  return `
    <div class="hub-fmap">
      <div class="hub-fmap-y"><span>8h</span><span>6h</span><span>2h</span><span>0h</span></div>
      <div class="hub-fmap-body">
        <div class="hub-dots">
          ${days.map(col => `
            <div class="hub-dcol">
              ${col.map(n => `<span class="hub-drow">${[0, 1, 2, 3, 4].map(() => `<b class="${tone(n)}"></b>`).join('')}</span>`).join('')}
            </div>`).join('')}
        </div>
        <div class="hub-fmap-x"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
      </div>
      <div class="hub-fmap-legend">
        <span><i class="h"></i> High</span>
        <span><i class="m"></i> Medium</span>
        <span><i class="l"></i> Low</span>
      </div>
    </div>`;
}

function hubRing(pct: number, color: string, label: string, sub: string): string {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  const r = 38;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  return `
    <div class="hub-ring">
      <svg viewBox="0 0 100 100" class="w-[92px] h-[92px]" aria-hidden="true">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="#F1F5F9" stroke-width="10"/>
        <circle class="hub-ring-arc" cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>
        <text x="50" y="55" text-anchor="middle" font-size="16" font-weight="800" fill="#111827" font-family="Outfit, sans-serif">${p}%</text>
      </svg>
      <div class="lbl">${escapeHtml(label)}</div>
      <div class="sub">${escapeHtml(sub)}</div>
    </div>`;
}

export function renderStudentHome(): string {
  const lessons = courseLessons();
  const pct = state.liveProgress?.percent ?? (state.quizScore.total ? state.quizScore.percent : Math.round((lessons.filter(l => l.completed).length / Math.max(lessons.length, 1)) * 100));
  const done = state.liveProgress?.completed_count ?? lessons.filter(l => l.completed).length;
  const total = state.liveProgress?.total_count ?? lessons.length;
  const nextLesson = state.liveProgress?.next_lesson || lessons.find(l => !l.completed) || lessons[0];
  const courseName = state.liveCourseTitle || 'Algebra I';
  const dueTitle = (state.liveGroupAssignments || [])[0]?.title || 'Checkpoint 2 quiz';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const monthLabel = new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  const labMin = [22, 38, 58, 78, 96, 70, 82];
  const labHours = (labMin.reduce((a, b) => a + b, 0) / 60).toFixed(0);
  const labMins = labMin.reduce((a, b) => a + b, 0) % 60;
  const quizPct = state.quizScore.total
    ? Math.round((state.quizScore.correct / state.quizScore.total) * 100)
    : 68;
  const reviewPct = state.quizScore.total
    ? Math.round(((state.quizScore.total - state.quizScore.correct) / state.quizScore.total) * 100)
    : 22;
  const lockedPct = Math.round((lessons.filter(l => l.position >= 7).length / Math.max(lessons.length, 1)) * 100) || 10;

  return hubDash({
    hero: {
      img: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=1800&q=80',
      kicker: `${hello}, ${escapeHtml(firstName())}`,
      title: 'Make Today<br>Count',
      sub: `${escapeHtml(courseName)} — lessons, quiz, and Ask Vidura in one place.`,
      cta: `<button id="hero-view-courses-btn" class="hub-cta-light" type="button">Explore course <span class="material-symbols-outlined text-[16px]">arrow_forward</span></button>`,
      icon: 'school',
      quote: '“A brighter you, a bolder tomorrow.”',
    },
    side: {
      title: escapeHtml(monthLabel),
      today: 'Today',
      body: `
        <div class="hub-cal-axis">
          <span>8AM</span><span>10AM</span><span>12PM</span><span>2PM</span><span>4PM</span><span>6PM</span>
        </div>
        <div class="relative flex-1 mt-3 min-h-[8rem]">
          <button class="hub-cal-chip orange home-open-sandbox absolute left-0 top-[6%]" type="button"><span>Cartesian lab</span><span>Now · 9:00</span></button>
          <button class="hub-cal-chip ghost absolute left-[46%] top-[8%]" type="button" id="dock-ask-vidura-btn"><span>Ask Vidura</span><span>12:00–1:00</span></button>
          <button class="hub-cal-chip ghost absolute left-[58%] top-[38%]" id="todo-handbook-btn" type="button"><span>Handbook</span><span>Wed</span></button>
          <button class="hub-cal-chip mint home-assigned-quiz-btn absolute left-[22%] top-[68%]" type="button"><span>${escapeHtml(dueTitle)}</span><span>Fri · 20 pts</span></button>
        </div>`,
    },
    pair: [
      {
        icon: 'timer',
        title: 'Focus Time',
        sub: 'Deep work sessions',
        week: 'This Week',
        body: `${hubMetric(`${labHours}h ${String(labMins).padStart(2, '0')}m`, '+23%')}<p class="text-[11px] text-slate-400 mt-1 mb-1">vs. last week</p>${hubArea(labMin, 'lab')}`,
      },
      {
        icon: 'ssid_chart',
        title: 'Study Rhythm',
        sub: 'Study patterns this week',
        week: 'This Week',
        body: hubRhythm(),
      },
    ],
    main: {
      icon: 'grid_view',
      title: 'Focus Map',
      sub: 'When you’re most focused',
      week: 'This Week',
      body: hubHeat(),
    },
    aside: {
      icon: 'donut_small',
      title: 'Performance',
      sub: 'Your activity balance',
      week: 'This Week',
      body: `<div class="flex items-start justify-between gap-2 mt-2">
        ${hubRing(quizPct || pct || 68, '#62BF8E', 'Productive', `${done}/${total} lessons`)}
        ${hubRing(reviewPct || 22, '#7D7D7D', 'Neutral', `${state.quizScore.correct}/${state.quizScore.total || 6} quiz`)}
        ${hubRing(Math.min(100, lockedPct || 10), '#FE580D', 'Distracted', 'Unit 3')}
      </div>`,
    },
    streak: {
      title: 'You’re on a 5-day study streak!',
      sub: 'Keep it going — consistency leads to success.',
      extra: `<div class="flex items-end gap-2">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => `<span class="hub-flame ${i < 5 ? '' : 'off'}"><span class="material-symbols-outlined text-[22px]" style="font-variation-settings:'FILL' 1">local_fire_department</span><span class="d">${d}</span></span>`).join('')}</div>`,
      cta: `<button class="hub-cta-dark home-resume-btn" type="button">Keep Learning <span class="material-symbols-outlined text-[16px]">arrow_forward</span></button>`,
    },
  });
}

function openHomeLesson(id: string, lessonType: string): void {
  if (lessonType === 'quiz') {
    setScreen('quiz');
    return;
  }
  if (state.connected && state.liveLessons.some(l => l.id === id)) {
    void openLiveLesson(id);
    return;
  }
  setScreen('lesson-detail');
}

export function bindStudentHomeEvents(container: HTMLElement): void {
  const resume = () => {
    const next = state.liveProgress?.next_lesson || courseLessons().find(l => !l.completed);
    if (next) {
      openHomeLesson(next.id, next.lesson_type);
      return;
    }
    setScreen('lessons');
  };

  container.querySelector('#hero-view-courses-btn')?.addEventListener('click', resume);
  container.querySelectorAll('.home-resume-btn').forEach(btn => btn.addEventListener('click', resume));

  container.querySelectorAll('.home-lesson-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      if (el.getAttribute('data-locked') === '1') {
        setScreen('prerequisite-gate');
        showToast('Unit locked until Checkpoint 2 is done', 'lock');
        return;
      }
      openHomeLesson(el.getAttribute('data-lesson-id') || '', el.getAttribute('data-lesson-type') || 'reading');
    });
  });
  container.querySelector('#todo-handbook-btn')?.addEventListener('click', () => setScreen('manuals'));

  container.querySelectorAll('.home-assigned-quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => setScreen('quiz'));
  });

  const openSandbox = () => {
    setScreen('lesson-detail');
    showToast('Opened graph sandbox', 'ssid_chart');
  };
  container.querySelector('#hero-join-now-btn')?.addEventListener('click', openSandbox);
  container.querySelectorAll('.home-open-sandbox').forEach(el => el.addEventListener('click', openSandbox));

  container.querySelector('#dock-ask-vidura-btn')?.addEventListener('click', () => setScreen('ask-vidura'));
  container.querySelector('#dock-quiz-btn')?.addEventListener('click', () => setScreen('quiz'));
  container.querySelector('#dock-manuals-btn')?.addEventListener('click', () => {
    setScreen('manuals');
  });
  container.querySelector('#dock-xr-btn')?.addEventListener('click', () => setScreen('xr-store'));
  container.querySelector('#dock-progress-btn')?.addEventListener('click', () => setScreen('my-progress'));
  container.querySelector('#all-categories-btn')?.addEventListener('click', () => setScreen('lessons'));
}
