/**
 * Unimrkt admin look & feel: brand tokens for the Strapi Design System (light + dark) and the global stylesheet injected at boot.
 *
 * The Design System exposes tokens, not class names, so everything that cannot be a token (sidebar, badges, table headers, buttons)
 * is styled through stable attributes (`aria-label`, `role`, `data-*`) and the badge classes added by `bootstrap` in app.tsx.
 */

export const FONT_LINKS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap',
];

const BRAND = {
  primary100: '#FBE8EC',
  primary200: '#FDF2F4',
  primary500: '#BE2C28',
  primary600: '#A6192E',
  primary700: '#8B1527',
};

export const theme = {
  light: {
    colors: {
      ...BRAND,
      buttonPrimary500: '#BE2C28',
      buttonPrimary600: '#A6192E',
    },
  },
  dark: {
    colors: {
      // Dark mode keeps the same crimson accent but lifts the tints so they stay readable on dark surfaces.
      primary100: '#3A1018',
      primary200: '#2A0C12',
      primary500: '#D8444A',
      primary600: '#BE2C28',
      primary700: '#E5646A',
      buttonPrimary500: '#D8444A',
      buttonPrimary600: '#BE2C28',
    },
  },
};

export const GLOBAL_CSS = `
:root {
  --um-navy: #0a1128;
  --um-navy-2: #111a3a;
  --um-crimson: #a6192e;
  --um-crimson-2: #be2c28;
  --um-font: 'Inter', 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --um-display: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
  --um-radius: 16px;
  --um-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.06);
}

body, button, input, select, textarea { font-family: var(--um-font) !important; }
h1, h2, h3 { font-family: var(--um-display) !important; letter-spacing: -0.01em; }

/* ---------- Left sidebar ---------- */
body nav:not([aria-label]) {
  background: linear-gradient(180deg, var(--um-navy) 0%, var(--um-navy-2) 100%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}
body nav:not([aria-label]) * { color: inherit; }
body nav:not([aria-label]) a,
body nav:not([aria-label]) button { color: #cbd5e1 !important; }
body nav:not([aria-label]) svg { fill: currentColor; }
body nav:not([aria-label]) a:hover,
body nav:not([aria-label]) button:hover { background: rgba(255, 255, 255, 0.07) !important; color: #fff !important; }
body nav:not([aria-label]) hr,
body nav:not([aria-label]) [role="separator"] { border-color: rgba(255, 255, 255, 0.08) !important; background: rgba(255, 255, 255, 0.08) !important; }
body nav:not([aria-label]) a[aria-current="page"],
body nav:not([aria-label]) a[aria-current="true"],
body nav:not([aria-label]) a.active {
  color: #fff !important;
  background: linear-gradient(135deg, rgba(190, 44, 40, 0.38), rgba(166, 25, 46, 0.18)) !important;
  box-shadow: inset 0 0 0 1px rgba(190, 44, 40, 0.65), 0 0 18px rgba(190, 44, 40, 0.28);
  border-radius: 10px;
}
body nav:not([aria-label]) a[aria-current="page"] svg,
body nav:not([aria-label]) a[aria-current="true"] svg,
body nav:not([aria-label]) a.active svg { filter: drop-shadow(0 0 6px rgba(255, 120, 120, 0.75)); }

/* Secondary column (Content Manager / Settings sub-navigation) */
nav[aria-label] { border-right: 1px solid #e2e8f0; }
nav[aria-label] a[aria-current="page"],
nav[aria-label] a.active {
  background: linear-gradient(135deg, rgba(190, 44, 40, 0.1), rgba(166, 25, 46, 0.05)) !important;
  box-shadow: inset 0 0 0 1px rgba(190, 44, 40, 0.35);
  border-radius: 10px;
  color: var(--um-crimson) !important;
  font-weight: 600;
}

/* ---------- Cards, panels, dialogs ---------- */
main > div > div[class*="Box"],
form > div > div > div[class*="Box"],
[role="dialog"] { border-radius: var(--um-radius) !important; }
main section, main form > div > div { border-radius: var(--um-radius); }
main table { border-radius: var(--um-radius); }
main [role="tabpanel"], main fieldset { border-radius: var(--um-radius); }

/* ---------- Buttons ---------- */
button[data-variant="default"], a[data-variant="default"],
main button[type="submit"]:not([data-variant="tertiary"]):not([data-variant="secondary"]) {
  background-image: linear-gradient(135deg, var(--um-crimson-2) 0%, var(--um-crimson) 100%);
  border-color: var(--um-crimson) !important;
  color: #fff;
  box-shadow: 0 1px 2px rgba(166, 25, 46, 0.25);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
button[data-variant="default"]:hover:not(:disabled), a[data-variant="default"]:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(166, 25, 46, 0.32);
  filter: brightness(1.05);
}
button[data-variant="default"]:active:not(:disabled) { transform: translateY(0); }
@media (prefers-reduced-motion: reduce) {
  button[data-variant="default"], a[data-variant="default"] { transition: none; }
  button[data-variant="default"]:hover:not(:disabled), a[data-variant="default"]:hover { transform: none; }
}

/* ---------- Tables ---------- */
main table thead th, main table thead th span {
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase;
  color: #64748b !important;
}
main table thead tr { background: #f8fafc; }
main table tbody tr { border-bottom: 1px solid #f1f5f9; }
main table tbody tr:nth-child(even) { background: #fafbfc; }
main table tbody tr:hover { background: #fdf2f4 !important; }
main table tbody td { border-color: #f1f5f9 !important; }

/* Status pills — tagged by bootstrap() in app.tsx */
.um-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 10px; border-radius: 9999px; font-weight: 500; font-size: 0.75rem; line-height: 1.5; border: 1px solid;
}
.um-badge::before { content: ''; width: 6px; height: 6px; border-radius: 9999px; background: currentColor; }
.um-badge--published { background: #ecfdf5 !important; color: #047857 !important; border-color: #a7f3d0 !important; }
.um-badge--draft { background: #fffbeb !important; color: #b45309 !important; border-color: #fde68a !important; }
.um-badge--modified { background: #eff6ff !important; color: #1d4ed8 !important; border-color: #bfdbfe !important; }
.um-badge * { color: inherit !important; background: transparent !important; }

/* Media thumbnails in list rows */
main table tbody td img { border-radius: 8px; object-fit: cover; }

/* ---------- Login / auth screens ---------- */
main:has(form) h1 { font-family: var(--um-display) !important; }
`;
