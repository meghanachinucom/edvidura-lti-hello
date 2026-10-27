/**
 * EdVidura Official Brand Logo Component
 * Features the signature Scholar Hat (Mortarboard Cap) with 'EV' monogram
 * rendered in sharp, scalable vector SVG with Lumen Coral (#FF4757) and Deep Midnight Navy (#071E2D).
 */

export interface LogoOptions {
  size?: number;
  className?: string;
  idSuffix?: string;
}

export function renderEdViduraLogo(options: LogoOptions = {}): string {
  const size = options.size || 36;
  const className = options.className || '';
  const gradId = `ev-logo-grad-${options.idSuffix || Math.random().toString(36).substring(2, 7)}`;

  return `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="shrink-0 ${className}"
      aria-label="EdVidura Logo - Scholar Hat with EV Monogram"
    >
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FF5B6B" />
          <stop offset="100%" stop-color="#FF4757" />
        </linearGradient>
        <filter id="${gradId}-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#FF4757" flood-opacity="0.38"/>
        </filter>
      </defs>

      <!-- Rounded Squircle Badge Base -->
      <rect width="40" height="40" rx="11" fill="url(#${gradId})" filter="url(#${gradId}-shadow)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" stroke="rgba(255,255,255,0.3)" stroke-width="1" />

      <!-- Mortarboard Diamond Cap (Academic Scholar Hat) -->
      <path d="M20 7L34 13.5L20 20L6 13.5L20 7Z" fill="#071E2D" stroke="#FFFFFF" stroke-width="1.3" stroke-linejoin="round" />
      
      <!-- Mortarboard Cap Skull Base -->
      <path d="M11 17V24C11 27.5 14.5 30 20 30C25.5 30 29 27.5 29 24V17" fill="#071E2D" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" />

      <!-- Golden Mortarboard Button and Tassel -->
      <circle cx="20" cy="13.5" r="1.5" fill="#FDE047" stroke="#071E2D" stroke-width="0.5" />
      <path d="M30.5 15.5V25" stroke="#FDE047" stroke-width="1.4" stroke-linecap="round" />
      <circle cx="30.5" cy="26" r="1.4" fill="#FDE047" />

      <!-- Bold EV Monogram embedded prominently in scholar hat -->
      <text
        x="20"
        y="26.5"
        font-family="'Outfit', system-ui, -apple-system, sans-serif"
        font-weight="900"
        font-size="8.5"
        fill="#FFFFFF"
        text-anchor="middle"
        letter-spacing="0.5"
      >EV</text>
    </svg>
  `;
}
