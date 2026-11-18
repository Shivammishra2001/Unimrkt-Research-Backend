# Unimrkt Research — Deployment & Server Operations

> Canonical runbook for deploying **Unimrkt Research** (staging). Read this
> before **any** git push, build, or server operation.
>
> **No passwords, keys, or tokens live in this file.** Local-only deploy secrets
> go in a **gitignored** `.env.deploy.local` (see §3).
>
> 🚫 **Strict separation from ROI Mantra.** Unimrkt and ROI are **different
> systems on different servers**. NEVER run Unimrkt commands on the ROI server
> or vice-versa.
>
> | | Unimrkt Research (this project) | ROI Mantra (do not touch) |
> | --- | --- | --- |
> | Server | `103.25.130.61` | `103.25.128.182` |
> | SSH user | `stagingunimrkt` | `MLSJDLW` |
> | PM2 | `unimrkt-cms`, `unimrkt-frontend` | `roi-backend`, `roi-frontend` |

---

## 1. Environment Rules

- **Local machine is Windows with low RAM headroom.**
  - **NEVER run `npm run build` locally** — it exhausts memory and fails.
  - Local is for editing, `git status` / `git diff`, and pushing only.
  - **All builds run on the Linux staging server.**

- **Repositories** (three remotes, same tree):

  | Repo | Remote | Deploys to |
  | --- | --- | --- |
  | Full monorepo | `Unimrkt-Research-Full-Code` | — (full-code snapshot) |
  | Frontend | `Unimrkt-Research-FrontEnd` | `unimrkt-frontend` |
  | Backend (Strapi) | `Unimrkt-Research-Backend` | `unimrkt-cms` |

## 2. Staging Server, Processes & URLs

**SSH:**

```bash
ssh -p 5726 stagingunimrkt@103.25.130.61
```

| Field | Value |
| --- | --- |
| Host / Port | `103.25.130.61` / `5726` |
| User | `stagingunimrkt` |
| Auth | SSH key only — **never hardcode a password or token in any file** |

| App | PM2 process | Port | Branch |
| --- | --- | --- | --- |
| Frontend (Next.js) | `unimrkt-frontend` | `3001` | `main` |
| Backend (Strapi)   | `unimrkt-cms`      | `1337` | `main` |

- **URLs:** site `https://stagingunimrkt.roimantra-dev.in/` · Strapi admin
  `https://stagingunimrkt.roimantra-dev.in/unimrktadmin`.
- **Database:** SQLite (`backend` → `DATABASE_CLIENT=sqlite`; file path is
  `DATABASE_FILENAME` in `backend/.env`, e.g. `.tmp/data.db`).
- **Remote paths:** confirm on first login with `pm2 info unimrkt-cms` /
  `pm2 info unimrkt-frontend` (the `cwd` / `exec cwd` field) before deploying.

## 3. Secrets & `.env.deploy.local`

- Every `.env*` (except `.env.example`) is gitignored — see §6.
- Any local-only deploy secret (SSH key path, token) goes in a **gitignored**
  `.env.deploy.local` at the repo root. **Never** paste secrets into this or any
  tracked `.md` file.
- Backend `.env` holds real Strapi secrets (`APP_KEYS`, `JWT_SECRET`,
  `ENCRYPTION_KEY`, `ADMIN_JWT_SECRET`, …) — generated once on the server,
  **never** rotated on redeploy.

## 4. Pre-Deploy Checklist & Git Safety

Before **any** `git add` / `commit`:

1. `git status` and `git diff` — stage files **explicitly by path**; never
   `git add .` / `-A`.
2. Keep work-in-progress out of deploy commits (e.g. do **not** commit
   `views/contact/ContactFormSection.tsx` unless explicitly approved).
3. Never commit `.env*` (except `.env.example`), databases/dumps
   (`*.db`, `*.sql`, `*.sqlite`), backups/archives (`*.tar.gz`, `*.zip`),
   keys/certs (`*.pem`, `*.key`, `*.ppk`, `credentials*.json`), uploads, or
   build output.
4. `git ls-files | grep -iE '\.env$|\.env\.|\.pem$|\.key$|credential|\.db$|\.sql$|backup'` must return **nothing** tracked.
5. **Push the backend first if the Strapi schema changed**, then the frontend.

## 5. Deployment Pipeline (staging, zero-downtime)

**1 — Local (Windows): commit & push only intended files**

```bash
git status && git diff
git add <specific/paths>          # never `git add .`
git commit -m "<message>"
git push origin main              # backend repo first if schema changed, then frontend
```

> Do **not** build locally.

**2 — Server: mandatory timestamped backup (before any pull/migration)**

```bash
ssh -p 5726 stagingunimrkt@103.25.130.61
cd <unimrkt-cms dir>
cp .tmp/data.db .tmp/backups/data-$(date +%F-%H%M).db         # SQLite snapshot
tar -czf ~/backups/uploads-$(date +%F-%H%M).tgz public/uploads # uploads snapshot
```

**3 — Backend deploy** (`unimrkt-cms`)

```bash
cd <unimrkt-cms dir>
git pull origin main
npm install                       # only if package-lock.json changed
npm run build
pm2 reload unimrkt-cms            # NEVER pm2 delete / pm2 kill
```

**4 — Idempotent seeds & Content-Manager layout** (run as needed after the CMS reload)

```bash
npm run seed:services-page
npm run seed:telephonic-service
npm run seed:subservice-sections
npm run seed:global-menu
npm run seed:approved-media
npm run seed:office-map
npm run seed:closing-bands
npm run seed:site-content
# (also available: seed:industries-page, seed:industry-media, seed:reset)
# Reorder Content-Manager layout for specific collections:
npm run reorder-cm-layout -- --only=<collection[,collection...]>
```

**5 — Frontend deploy** (`unimrkt-frontend`)

```bash
cd <unimrkt-frontend dir>
git pull origin main
npm install                       # only if package-lock.json changed
npm run build
pm2 reload unimrkt-frontend
```

**6 — Post-deploy health checks**

```bash
pm2 status                        # unimrkt-cms & unimrkt-frontend "online"
curl -I http://localhost:3001/    # frontend (1337 for the CMS)
curl -s -o /dev/null -w "%{http_code}\n" https://stagingunimrkt.roimantra-dev.in/
pm2 logs unimrkt-frontend --lines 20   # clean startup, no errors
```

Verify the Strapi webhook/revalidation URL in the admin points at the staging
frontend, and spot-check key routes return `200`.

## 6. Required `.gitignore` coverage (all repos)

```
# Env & deploy secrets
.env, .env.*, .env.local, .env.deploy.local, .env.staging, .env.production   (keep !.env.example)
# Keys / certs / credentials
*.pem, *.key, *.ppk, credentials*.json
# Databases, dumps, backups, archives
*.sqlite, *.db, *.sql, *.tar.gz, *.zip, .tmp/, backups/
# Runtime uploads
public/uploads/   (or public/uploads/* + !public/uploads/.gitkeep)
# Build / cache / deps
.next/, dist/, build/, .cache/, node_modules/, *.stackdump, content-inventory.json
```

## 7. Rollback

```bash
ssh -p 5726 stagingunimrkt@103.25.130.61
# Backend: restore DB + previous code
cd <unimrkt-cms dir>
cp .tmp/backups/data-<TIMESTAMP>.db .tmp/data.db
git reset --hard <previous-good-commit>
npm run build && pm2 reload unimrkt-cms
# Frontend: revert to previous commit
cd <unimrkt-frontend dir>
git reset --hard <previous-good-commit>
npm run build && pm2 reload unimrkt-frontend
```

If a bad commit reached a remote, revert it locally (`git revert <sha>`) and
redeploy rather than leaving the server ahead of the remote.
