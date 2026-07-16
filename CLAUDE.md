# Scam Patrol — Claude Code context. Express + EJS + MySQL, SINGLE Node app. I am M1 (CI/CD + Cloud Deployment + Team Lead).

## Phase 2 reality (important)
CA2 Phase 1 (the app) is DONE and graded. We are now in **Phase 2: DevOps Implementation (Week 11-13)**, assessed Week 13.
**The app's FEATURES ARE FROZEN.** Do NOT add, redesign or "improve" app functionality, views, styling, game mechanics or
AI features. Phase 2 work = Docker, CI/CD, deployment, IaC, testing in the pipeline, security scanning — infra files, not features.
Graded repo = **github.com/shaniaong25026302/ScamPatrol** and it is **PUBLIC**. The old name `scamlah-devops-` (still my git
remote URL, still my local folder name) is an alias GitHub redirects — package.json's "ScamPatrol" is the correct name.
Public repo ⇒ branch protection and unlimited Actions minutes are already free; no GitHub Pro / Student Pack needed for them.
Public repo also ⇒ never commit `.env` (verified: it never has been, on any branch).
Starting point: the repo has ZERO DevOps infrastructure. No Dockerfile, no CI config, no YAML on any branch. This is greenfield.

## The ONE exception to the app freeze (the Week 11 "prep PR" — mine, ask me first)
Deploying the app as-is silently breaks it. These are DevOps CONFIG changes, not features. Nothing else in the app is in scope:
- `src/utils/jwt.js` lines 41/48/53 — `secure: isProd()`. On a plain-HTTP EC2 with NODE_ENV=production the browser
  SILENTLY DROPS the auth cookie -> login "succeeds" then every user is a guest, and jwt.verify failures are swallowed so
  there is NO error anywhere. Works locally, breaks only on the demo box. Needs a COOKIE_SECURE override.
- `src/server.js` — add `GET /api/health/live` (shallow) for the Docker HEALTHCHECK, and add it to the guest allow-list (:67).
  `/api/health` (:77) deep-pings MySQL and 503s on a blip — as a HEALTHCHECK that restart-loops the container. Keep the deep
  one for the post-deploy smoke gate; it is perfect for that and wrong for this.
- `src/utils/jwt.js:10` — JWT_SECRET is read at MODULE LOAD and never validated. A missing secret = a guest-only app that
  looks healthy. Fail fast at boot instead.
- `src/services/dailyquiz.service.js:28` + `scamweather.service.js:27` — 4 JSON files in `src/data/` written via
  `fs.writeFileSync`. Put their path behind a DATA_DIR env var so a volume can persist them (admin posts + quiz progress
  currently vanish on every redeploy). Do NOT mount a volume at `src/data` — `missions.js`/`shop.js` are CODE in that folder.
- `db/schema.sql:394,415,429` — glossary, chat_sessions, chat_messages are bare `CREATE TABLE` -> add `IF NOT EXISTS`.
- `src/server.js:171-176` — graceful shutdown works but has no forced-exit timeout.
Ask me before touching ANY of these. Nothing else in `src/` or `views/` is in scope.

## Before every change (always)
- Inspect what exists first (git log, file tree, the file itself, package.json, db/schema.sql, .env.example).
- If a file exists: read and update incrementally. NEVER overwrite or recreate from scratch.
- If a teammate already added work in my area, reconcile and FLAG conflicts to me.
- Do NOT create or switch git branches. Do NOT auto-commit or push — I commit manually, and I decide when.

## External inputs — teach then ask (after every step)
When a step needs a value only I can provide — AWS credentials / EC2 host / SSH key, GitHub repo secrets, DB_*, JWT_SECRET,
GEMINI_API_KEY — do NOT invent it or bake a fake value into real code. Instead: (1) tell me what's needed and why;
(2) teach me how to get it in 2-4 concrete steps (exact site/menu/command); (3) tell me the exact place + key it goes in
(e.g. GitHub -> Settings -> Secrets and variables -> Actions -> `EC2_SSH_KEY`); (4) STOP and ask me to paste it before
continuing. If a step needs nothing, say "no inputs needed". NEVER print a secret's value or echo it in a workflow step.

## My scope (M1 — CI/CD Pipeline & Cloud Deployment, + integration)
- `.github/workflows/ci.yml` — on PR: lint -> test (AI_FAKE=1 + a mysql service container) -> docker build + container smoke test.
- `.github/workflows/cd.yml` — on push to main: build -> push `ghcr.io/shaniaong25026302/scampatrol:sha-<short>` (lowercased by `docker/metadata-action`) ->
  scp compose + db/*.sql to EC2 -> ssh -> `docker compose pull && up -d` -> smoke `GET /api/health`. Deploy the immutable
  `sha-` tag, NEVER `latest` (rollback = re-run workflow_dispatch with an older SHA).
- Branch protection on main (require PR + 1 approval + the CI checks) so "only successful builds proceed" is demonstrable.
- GitHub Actions secrets + variables. AWS EC2 (t3.micro, Ubuntu 24.04, ap-southeast-1, Elastic IP).
- `docker-compose.prod.yml`, and the Week 11 prep PR above.
- Team integration + merge conflict resolution (same role as Phase 1).

## Do NOT touch (the other 5 own these — they build INTO my pipeline)
- `Dockerfile` / `.dockerignore` / DATA_DIR wiring + volumes — **Rebecca (M2)**
- `docker-compose.yml` / healthchecks / MySQL initdb wiring — **Liam (M5)**
- `tests/*` + the npm `test` script + the CI test job's contents — **Shawn (M6)**
- `ansible/` (site.yml, roles, inventory, .env.j2) — **Nivi (M3)**
- `.github/dependabot.yml` + `.github/workflows/security.yml` — **CG (M4)**
Only edit shared files (`package.json`, `.env.example`, `README.md`) ADDITIVELY and flag the owner.

## Stack decisions (settled — do not re-litigate or "suggest alternatives")
- CI/CD = **GitHub Actions, NOT Jenkins.** The brief already requires the GitHub PR workflow, and "only successful builds
  proceed" is a native, screenshot-able gate. Jenkins needs its own host (a 2nd EC2, or it fights MySQL for 1GB) and
  rebuilds that gate via webhooks + the Checks API for zero extra marks. Jenkins = considered and rejected, on the record.
- Registry = **GHCR** (GITHUB_TOKEN is auto-injected — no long-lived credential to leak; free; same platform as the code).
  Set the PACKAGE visibility public even if the repo is private -> EC2 pulls with no credentials at all.
- Base image = **node:22-bookworm-slim, NOT Alpine.** `bcrypt@5.1.1` is a NATIVE module with no musl prebuild, so Alpine
  falls back to a node-gyp source build and needs python3/make/g++.
- **SINGLE-stage Dockerfile.** There is no build step (runtime EJS, no bundler, no TS), so multi-stage would discard nothing.
  Size/security wins come from `--omit=dev`, the slim base, `.dockerignore` and a non-root user.
- COPY `src/ views/ public/` — views/, public/ and db/ live OUTSIDE src/, so copying only src/ yields a broken image.
  Root `middleware/` is dead code (nothing requires it) — do NOT copy it.
- `.dockerignore` MUST include `node_modules` (correctness, not size: the local `bcrypt_lib.node` is win32 and will not
  load on Linux), plus `.env` and `.git`.
- Ansible = **day-0 host provisioning** (install Docker, 2GB swapfile, template .env), NOT deployment. Actions owns the
  continuous path and is the source of truth for prod secrets.
- **AI_FAKE=1 in CI always** — needs no API key and burns no Gemini quota (free tier is 20 req/day/model, easily exhausted).

## Env
The app reads **24** env vars; `.env.example` lists only 11. Missing: PORT, APP_BASE_URL, DB_CONNECTION_LIMIT, GEMINI_API_KEY,
GEMINI_MODEL, AI_FAKE, MAIL_FROM, MAILJET_API_KEY, MAILJET_SECRET_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
`.env.example` is the CONTRACT every teammate's component codes against — keep it complete and accurate.
`.env` holds real secrets and is gitignored. NEVER commit it, NEVER print it, NEVER copy it into an image or a teammate's patch.

## My local working tree (mine only)
My local tree carries a beginner-comment layer over M1 files that is deliberately NOT committed — GitHub main stays
comment-free for teammates. Never commit those comments. **Never `git add -A` / `-u`** (it would stage ~66 comment files and
node_modules) — stage files BY NAME. Preserve teammates' attribution markers (`<Rebecca Member 2>`, `<Nivi>`, `<Shawn>`,
`<CG Member 4>`, `<Liam>`) and my own `<Shania Start>` / `<Shania End>`.
NOTE: my local `.gitignore`'s inline `#` comments break its patterns (git only strips FULL-LINE comments), so `node_modules/`
is not ignored locally. `origin/main`'s .gitignore is correct. `.env` is safely ignored in both — verified.

## Repo lives in OneDrive (accepted risk — my call)
Set the folder to "Always keep on this device". OneDrive dehydrates files into 0-byte cloud placeholders that git and
`docker build` read as EMPTY, and it has eaten files in this repo before. Sanity-check `git status` before any demo.

## Commits (Conventional Commits)
`<type>(<scope>): <desc>`. Types: feat, fix, docs, style, refactor, test, chore, ci, build.
Scopes: docker, compose, ci, cd, deploy, iac, sec, test, env, db, auth, ai. NO `Co-Authored-By` line.
