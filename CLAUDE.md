# Project Guidance for Claude — Unimrkt Research

## Deployment & server operations

**Always read and strictly follow [`DEPLOYMENT.md`](./DEPLOYMENT.md) before any
git push, build, or server deployment.** Full detail is there; the
non-negotiables:

- **Builds run only on the Linux staging server**, never on the local Windows
  machine (low RAM) — **never run `npm run build` locally.**
- **Staging server:** `ssh -p 5726 stagingunimrkt@103.25.130.61` (SSH key auth)
  — never request, store, or hardcode passwords or tokens. Local-only deploy
  secrets go in a gitignored `.env.deploy.local`.
- 🚫 **Strict separation from ROI Mantra.** ROI is a *different* system on a
  *different* server (`103.25.128.182`, user `MLSJDLW`, PM2 `roi-*`). **Never**
  run Unimrkt commands on the ROI server, or touch ROI, unless explicitly told.
- **Zero-downtime deploy:** push `main` locally → on the server `git pull` +
  `npm install` (if deps changed) + `npm run build` + `pm2 reload <app>`. Run the
  idempotent seeds / `reorder-cm-layout` after the CMS reload. **Never** use
  `pm2 delete` or `pm2 kill`.
- **Before any `git add`/`commit`:** inspect `git status` / `git diff`, stage
  files explicitly by path (never `git add .`), keep WIP out (e.g.
  `views/contact/ContactFormSection.tsx`), and verify `.gitignore` blocks
  `.env*` (keep `.env.example`), `*.pem`/`*.key`/`*.ppk`/`credentials*.json`,
  `*.db`/`*.sql`/`*.sqlite`, `*.tar.gz`/`*.zip`, `.tmp/`/`backups/`,
  `public/uploads/`, and build output.

## Repository layout

Three git remotes over the same tree:

- Root (`.`) → `Unimrkt-Research-Full-Code` — full-code snapshot + shared docs
  (`DEPLOYMENT.md`, this file, `docs/`).
- `Frontend/` → `Unimrkt-Research-FrontEnd` — Next.js app → server
  `unimrkt-frontend` (PM2), port `3001`.
- `backend/` → `Unimrkt-Research-Backend` — Strapi CMS (SQLite) → server
  `unimrkt-cms` (PM2), port `1337`. Seed scripts: `seed:services-page`,
  `seed:telephonic-service`, `seed:subservice-sections`, `seed:global-menu`,
  `seed:approved-media`, `seed:office-map`, `seed:closing-bands`,
  `seed:site-content`, and `reorder-cm-layout -- --only=…`.
