/**
 * EdVidura Master Design System Registry
 *
 * Single source of truth for design tokens, typography, component presets,
 * and global styling conventions derived from origin/feature/frontend.
 *
 * All screens must consume these tokens and classes to ensure consistent
 * global propagation of future design and theme changes.
 */

export const DESIGN_TOKENS = {
  colors: {
    pageBg: "var(--page-bg)",
    surface: "var(--surface)",
    surfaceRaised: "var(--surface-raised)",
    ink: "var(--ink)",
    inkMuted: "var(--ink-muted)",
    border: "var(--border)",
    borderControl: "var(--border-control)",
    accent: "var(--accent)",
    accentInk: "var(--accent-ink)",
    secondary: "var(--secondary)",
    highlight: "var(--highlight)",
    success: "var(--success)",
    warning: "var(--warning)",
    error: "var(--error)",
    focusRing: "var(--focus-ring)",
    primary: "var(--primary)",
    topbar: "var(--topbar)",
    buttonMain: "var(--button-main)",
    selected: "var(--selected)",
  },
  radii: {
    surface: "12px", // var(--radius-surface)
    control: "8px",  // var(--radius-control)
    full: "9999px",
  },
  typography: {
    fontSans: "var(--font-sans)",
    fontHeading: "var(--font-heading)",
    fontMono: "var(--font-mono)",
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },
  breakpoints: {
    mobileMax: 639,
    tablet: 640,
    desktop: 1280,
  },
  layout: {
    maxContentWidth: "960px", // max-w-content
    maxReadingWidth: "68ch",  // max-w-reading
    touchMinHeight: "44px",   // min-h-11
  },
} as const;

/**
 * Standard CSS class presets for building screens.
 * Use these presets across all routes to guarantee uniform styling and
 * instantaneous propagation when global tokens or rules are adjusted.
 */
export const DESIGN_PRESETS = {
  // Page Containers
  pageContainer: "mx-auto w-full max-w-content space-y-6 px-4 pb-28 pt-8 tablet:pb-8",
  pageHeaderRow: "flex items-center justify-between gap-4",

  // Grid & Multi-Column Layouts
  studioGrid: "studio-grid",
  kpiGrid: "grid grid-cols-2 gap-4 tablet:flex tablet:flex-wrap tablet:gap-10",

  // Cards & Containers
  card: "rounded-surface border border-border bg-surface p-4 shadow-sm",
  sectionCard: "section-card rounded-surface border border-border bg-surface p-4",
  kpiCard: "kpi-figure rounded-surface border border-border bg-surface p-4",

  // Form Controls (min 44px accessible touch target)
  input: "min-h-11 w-full rounded-control border border-border-control bg-surface px-3 py-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
  select: "min-h-11 w-full rounded-control border border-border-control bg-surface px-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
  textarea: "w-full rounded-control border border-border-control bg-surface px-3 py-2 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",

  // Action Buttons
  btnPrimary: "btn-primary",
  btnSecondary: "btn-secondary",
  iconBtn: "icon-btn inline-flex min-h-11 min-w-11 items-center justify-center rounded-control",

  // Badges & Status
  badgeDraft: "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-tertiary-container text-tertiary",
  badgeSuccess: "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary-container text-secondary",

  // Typography Elements
  heading1: "font-heading text-2xl font-bold text-ink tablet:text-3xl",
  heading2: "font-heading text-lg font-bold text-ink tablet:text-xl",
  leadParagraph: "max-w-reading text-ink",
  mutedNote: "text-sm text-ink-muted",
  metricNumber: "kpi-figure dd text-2xl font-extrabold text-metric tablet:text-3xl",
} as const;
