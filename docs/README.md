# Scam Patrol

A Singapore anti-scam web app built as a retro-pixel game — **Scam Patrol HQ**. Users register,
analyze suspicious messages with AI, clear "spot-the-scam" field missions, earn XP/coins/badges,
report scams to the community, and climb the leaderboard.

**One single Express app** serves both the JSON API (`/api/*`) and the server-rendered EJS pages.
There is **no separate frontend build** — client interactivity is small `fetch()` scripts in `public/js`

---

## Tech stack

- **Runtime:** Node.js (18+), Express 5
- **Views:** EJS + `express-ejs-layouts` (one shared layout), plain CSS (retro/pixel theme)
- **Database:** MySQL (`mysql2/promise`) — hosted on filess.io
- **AI:** Google Gemini (`@google/genai`)
- **Email:** Mailjet HTTP API (primary) / Gmail SMTP (fallback) via Nodemailer
- **Auth:** `bcrypt` + JWT in httpOnly cookies
- **Tooling:** ESLint + Prettier, nodemon

---

> **Just want it running?** The fastest path needs no accounts and no database of your own:
>
> ```bash
> cp .env.local.example .env.local
> docker compose -f docker-compose.local.yml up
> ```
>
> See **[Phase 2: DevOps](#phase-2-devops)** for the pipeline, deployment and infrastructure.
> The section below is the manual Node setup, kept for working on the app itself.

## Quick start

### Prerequisites

- Node.js 18 or newer (`node -v`)
- A MySQL database (we use filess.io free tier)
- Git

### 1. Clone & install

```bash
git clone https://github.com/shaniaong25026302/ScamPatrol
cd ScamPatrol
npm install
```

### 2. Create your `.env`

Create a file named **`.env`** in the project root (same folder as `package.json`).
`.env` is **gitignored** — it is never committed and does **not** travel through `git pull`.
Each person/machine must create their own.

```env
# App
PORT=3000
NODE_ENV=development

# MySQL (filess.io)
DB_HOST=your-host.filess.io
DB_PORT=3307
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_CONNECTION_LIMIT=3          # filess.io free tier allows only 5 TOTAL connections

# Auth
JWT_SECRET=a-long-random-secret-string
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI Scam Checker (Google Gemini)
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.5-flash

# Email — sender identity
MAIL_FROM=Scam Patrol <your-verified-sender@gmail.com>

# Email — HTTP API (REQUIRED on hosts that block SMTP, e.g. Render):
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key

# Email — SMTP fallback (works locally; blocked on Render free tier)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password

# Public base URL used to build password-reset links
APP_BASE_URL=http://localhost:3000
```

> The database schema is in `db/schema.sql`. Run it once against your DB to create the tables.

### 3. Run

```bash
npm run dev     # development with auto-reload (nodemon) → http://localhost:3000
npm start       # production (node src/server.js)
npm run lint    # ESLint
```

`npm run dev` uses the repo's local nodemon (in `node_modules`), so no global install is needed.

---

## Environment variables

| Key                                                   | Required  | Purpose                                                                    |
| ----------------------------------------------------- | --------- | -------------------------------------------------------------------------- |
| `PORT`                                                | no        | Local port (Render sets its own — don't set it there)                      |
| `NODE_ENV`                                            | yes       | `development` locally, **`production`** on Render (enables secure cookies) |
| `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | yes       | MySQL connection                                                           |
| `DB_CONNECTION_LIMIT`                                 | yes       | Keep low (2–3) — filess.io caps at 5 total connections                     |
| `JWT_SECRET`                                          | yes       | Signs auth tokens                                                          |
| `GEMINI_API_KEY`                                      | yes       | AI scam checker                                                            |
| `MAIL_FROM`                                           | yes       | Sender name + address (must be a verified sender)                          |
| `MAILJET_API_KEY` + `MAILJET_SECRET_KEY`              | on Render | HTTP email (port 443) — works where SMTP is blocked                        |
| `SMTP_*`                                              | optional  | Local email fallback                                                       |
| `APP_BASE_URL`                                        | yes       | Base URL for reset links (`https://…onrender.com` in prod)                 |

---

## Project structure

```
ScamPatrol/
  src/
    server.js            App skeleton (Express, layout, mounts, guest-gating)
    db.js                MySQL connection pool
    routes/              *.routes.js (API) + *.pages.routes.js (pages)
    controllers/         request handlers
    models/              data access (SQL)
    middleware/          auth + gamification
    services/            gemini + mail
    utils/               jwt + validation
    data/                static mission/shop data
  views/
    layout.ejs           the ONE shared layout (theme, nav, HUD, scripts)
    partials/            game-nav, footer, header
    auth/ game/ ...      page views (content only)
  public/
    css/                 styles.css (base) + game.css (retro theme)
    js/                  small fetch() client scripts
    img/ audio/          assets
  db/schema.sql          database schema
```

---

## Team modules

What each member built into the app:

| Member       | Contribution                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1 (Shania)  | App skeleton + shared retro theme/layout, authentication (JWT in httpOnly cookies + bcrypt), AI Scam Checker, Ask Inspector Hoot chatbot, Long-Con detector, the whole Scam Patrol HQ gamification (XP / levels / coins / streaks, badges, energy, field missions, gold shop, story, points + world leaderboard), DB schema, deployment (Render) + email (Mailjet) |
| M2 (Rebecca) | Scam case reporting — create / edit / delete cases, categories, image upload, saved drafts                                                                                                                                                                                                                                                                         |
| M3 (Nivi)    | Community Watch — browse / search cases, case detail page, vote & flag                                                                                                                                                                                                                                                                                             |
| M4 (CG)      | Comments + user profile (files added; not yet wired into the app)                                                                                                                                                                                                                                                                                                  |
| M5 (Liam)    | Scam Weather service (on feature branch; not yet merged)                                                                                                                                                                                                                                                                                                           |
| M6 (Shawn)   | Scam glossary + admin pages (dashboard, moderation, user & report management)                                                                                                                                                                                                                                                                                      |

Only edit shared files (`db/schema.sql`, `views/layout.ejs`, `views/partials/game-nav.ejs`)
**additively**, and flag the owner (M1).

---

## Infrastructure as Code (M2 — Rebecca)

The production server is prepared repeatably with the Ansible project in
[`ansible/`](ansible/README.md). It installs Docker and Compose, creates swap,
generates the protected runtime `.env`, starts Shawn's production Compose stack,
checks database readiness, and includes a two-run `changed=0` idempotency test.

The team responsibility boundary and deployment order are documented in
[`DEPLOYMENT_INTEGRATION.md`](DEPLOYMENT_INTEGRATION.md). Rebecca's contribution
notes are in [`M2_INFRASTRUCTURE_AS_CODE.md`](M2_INFRASTRUCTURE_AS_CODE.md).

---

## Adding a feature with the unified styling

Every page renders through `views/layout.ejs`, so it gets the theme, top nav, HUD, fonts, footer,
sound and SPA scripts **automatically**. Follow these rules:

1. **Render an EJS view — don't build a full page.**

   ```js
   res.render("cases/list", { title: "Community · Scam Patrol", activePage: "cases" });
   ```

   Not `res.send("<html>…")`, and don't create your own layout.

2. **Your `.ejs` contains only page content** — no `<html>`, `<head>`, or `<body>`.
   The layout provides those and applies `<body class="game-world">` (the theme) to everything inside.

3. **Always pass `title` and `activePage`** in `res.render` — `activePage` highlights the nav link.

4. **Reuse shared component classes** instead of writing new styles:

   | Class                                          | Use                             |
   | ---------------------------------------------- | ------------------------------- |
   | `.panel`                                       | card / section box              |
   | `.gw-hero`                                     | page header with icon + heading |
   | `.gw-btn` (`.gold` `.ghost` `.safe` `.danger`) | buttons                         |
   | `.gw-grid` + `.col-7` / `.col-5` / `.col-12`   | responsive columns              |
   | `.gw-risk` (`.low` / `.medium` / `.high`)      | status badges                   |
   | `.lb`                                          | tables (leaderboard style)      |
   | `.gw-chip` `.muted` `.center` `.gw-muted-link` | chips / helper text             |

5. **Client JS goes in `public/js/yourfile.js`**, loaded at the end of the view:
   `<script src="/js/yourfile.js" defer></script>`.
   Use plain `fetch()` — **no** Bootstrap / Tailwind / React, and **no** extra `<link>` to another
   CSS framework (it clashes with the theme).

### File templates

**Page route** — `src/routes/cases.pages.routes.js`

```js
const express = require("express");
const router = express.Router();
const { requireAuthPage } = require("../middleware/auth.middleware");

router.get("/", requireAuthPage, (req, res) =>
  res.render("cases/list", { title: "Community · Scam Patrol", activePage: "cases" }),
);

module.exports = router;
```

**API route** — `src/routes/cases.api.routes.js`

```js
const express = require("express");
const c = require("../controllers/cases.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const router = express.Router();

router.get("/", h(c.list));
router.post("/", requireAuth, h(c.create));

module.exports = router;
```

**Controller** — `src/controllers/cases.controller.js`

```js
const Case = require("../models/case.model");

async function list(req, res) {
  res.json({ cases: await Case.all(20) });
}
async function create(req, res) {
  const { title, description } = req.body || {};
  if (!title || title.trim().length < 3) return res.status(400).json({ error: "Title too short." });
  const id = await Case.create({ title, description, userId: req.user.id });
  res.status(201).json({ id });
}
module.exports = { list, create };
```

**Model** — `src/models/case.model.js`

```js
const { pool } = require("../db");

async function all(limit = 20) {
  const [rows] = await pool.query("SELECT * FROM scam_cases ORDER BY created_at DESC LIMIT ?", [
    limit,
  ]);
  return rows;
}
async function create({ title, description, userId }) {
  const [r] = await pool.query(
    "INSERT INTO scam_cases (title, description, user_id) VALUES (?, ?, ?)",
    [title, description, userId],
  );
  return r.insertId;
}
module.exports = { all, create };
```

**View — list** — `views/cases/list.ejs`

```ejs
<section class="gw-hero">
  <div><h1>📋 Community Cases</h1><p>Scams reported by the community.</p></div>
</section>
<div class="panel">
  <h2>Latest <a href="/cases/new" class="gw-btn gold" style="float:right">Report →</a></h2>
  <div id="case-list" class="gw-grid"><p class="muted">Loading…</p></div>
</div>
<script src="/js/case-list.js" defer></script>
```

**View — form** — `views/cases/new.ejs`

```ejs
<section class="gw-hero"><div><h1>🚩 Report a Scam</h1></div></section>
<div class="panel">
  <form id="case-form">
    <div id="form-error" class="alert alert-danger" style="display:none"></div>
    <label>Title</label>
    <input type="text" name="title" />
    <div class="field-error" data-for="title" style="color:var(--gw-red)"></div>
    <label>What happened?</label>
    <textarea name="description" rows="5"></textarea>
    <button class="gw-btn gold" type="submit">Submit</button>
  </form>
</div>
<script src="/js/case-form.js" defer></script>
```

**View — detail** — `views/cases/detail.ejs`

```ejs
<section class="gw-hero"><div><h1 id="case-title">Case</h1></div></section>
<div class="panel">
  <span class="gw-risk high" id="case-status">Pending</span>
  <p id="case-desc" style="margin-top:.6rem"></p>
  <a href="/cases" class="gw-btn ghost">← Back</a>
</div>
<script src="/js/case-detail.js" defer></script>
```

**View — table (admin)** — `views/admin/list.ejs`

```ejs
<section class="gw-hero"><div><h1>🛡️ Admin</h1></div></section>
<div class="panel">
  <table class="lb">
    <thead><tr><td>Title</td><td>Status</td></tr></thead>
    <tbody id="admin-rows"><tr><td class="muted">Loading…</td></tr></tbody>
  </table>
</div>
<script src="/js/admin.js" defer></script>
```

**View — static content (glossary)** — `views/glossary.ejs`

```ejs
<section class="gw-hero"><div><h1>📖 Scam Glossary</h1></div></section>
<div class="panel">
  <h2>Phishing</h2>
  <p class="muted">Fake messages that trick you into revealing passwords or OTPs.</p>
</div>
```

**Client JS** — `public/js/case-list.js`

```js
(function () {
  "use strict";
  const box = document.getElementById("case-list");
  if (!box) return;
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  (async () => {
    const r = await fetch("/api/cases");
    const d = await r.json();
    box.innerHTML =
      (d.cases || [])
        .map((c) => '<div class="panel col-6"><h3>' + esc(c.title) + "</h3></div>")
        .join("") || '<p class="muted">No cases yet.</p>';
  })();
})();
```

**Mount your routers** in `src/server.js` at the marked mount points:

```js
app.use("/api/cases", require("./routes/cases.api.routes")); // API
app.use("/cases", require("./routes/cases.pages.routes")); // pages
```

**Add new tables** additively at the bottom of `db/schema.sql` (flag M1).

---

## Deployment

The application is no longer deployed by hand. It is built, published and released by the
pipeline onto AWS EC2. See **Phase 2: DevOps** further down for how that works.

---

## Troubleshooting

| Symptom                                           | Cause & fix                                                                                                                                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Plugin 'mysql_native_password' is not loaded`    | `.env` isn't loading, so mysql2 connects to a local MySQL. On Windows, check the file isn't secretly `.env.txt` (turn on file extensions), and that it sits next to `package.json`. |
| `Email not configured …` at startup               | The `.env` has no `MAILJET_*` / `SMTP_*` — it's the wrong/old `.env`. Recreate it with the correct values.                                                                          |
| `ER_USER_LIMIT_REACHED (max_user_connections: 5)` | filess.io caps at 5 connections. Don't run local `npm run dev` **and** Render at the same time; keep `DB_CONNECTION_LIMIT` low.                                                     |
| `SMTP verify FAILED (ETIMEDOUT)` on Render        | Render blocks SMTP — set `MAILJET_API_KEY`/`MAILJET_SECRET_KEY` so email uses the HTTP API instead.                                                                                 |
| Reset email not in inbox                          | Sending from a `@gmail.com` address via an ESP fails DMARC → often lands in **Spam**. Check spam / verify a real domain for inbox delivery.                                         |
| CSS/JS changes not showing                        | Browser cache — hard refresh (Ctrl+Shift+R). The stylesheet uses a `?v=N` cache-buster.                                                                                             |

---

## Scripts

| Command          | Does                           |
| ---------------- | ------------------------------ |
| `npm run dev`    | Run with nodemon (auto-reload) |
| `npm start`      | Run once (production)          |
| `npm run lint`   | ESLint                         |
| `npm run format` | Prettier                       |

---

# Phase 2: DevOps

Everything below is the DevOps layer added in Phase 2. The application itself is unchanged.

## Run the whole stack locally

This is the fastest way to get a working copy, and the only one that needs no accounts, no
shared credentials and no database of your own.

```bash
cp .env.local.example .env.local
docker compose -f docker-compose.local.yml up
```

Then open <http://localhost:3000>.

That one command starts two containers, MySQL and the application. On first run the database
container loads `db/schema.sql` and creates all 25 tables by itself, and the application waits
until MySQL reports healthy before starting, rather than racing it and crashing.

Data lives in a **named volume**, so `docker compose down` and back up keeps everything. Use
`down -v` when you actually want a clean database.

`AI_FAKE=1` is set in the example file, so the AI features answer from built-in offline logic
and no Gemini key is needed.

### Why there are three compose files

| File | Used by | Database |
|---|---|---|
| `docker-compose.local.yml` | developers, this machine | MySQL container + volume |
| `docker-compose.prod.yml` | the EC2 host, via Ansible | managed database |
| `docker-compose.yml` | the app container on its own | whatever `.env` points at |

Production deliberately does **not** run its database in a container. A database in a
container on a single instance dies with that instance; a managed one does not. The container
and volume exist so that every developer and every pipeline run gets an identical environment
with no shared credentials.

## The pipeline

Three workflows, each doing one job.

| Workflow | Runs on | What it does |
|---|---|---|
| **CI** (`ci.yml`) | every pull request | The gate. Nothing merges without it. |
| **CD** (`cd.yml`) | merge to `main` | Builds, publishes and verifies the image. |
| **Deploy** (`deploy.yml`) | after a successful CD | Releases that image to EC2. |

### CI, the gate

Five jobs, ordered cheapest and most serious first.

- **`secret-scan`** — gitleaks, pinned to a fixed version, scanning both the working tree and
  the pull request's own commits, with output redacted so a build log can never print the
  secret it just found. **This one blocks.**
- **`lint-and-test`** — style, then the configuration contract, then the schema, then the full
  suite against a **real MySQL service container**. 76 tests, none skipped.
- **`docker-build`** — builds the image *and boots it*, because a built image is not a working
  image. Also reports the image size change onto the pull request.
- **`ansible-validate`** — rejects duplicate legacy roles, checks the Ansible environment
  template, performs a syntax check, and runs `ansible-lint`.
- **`ci-summary`** — one check for branch protection to require, so adding a job later cannot
  silently stop being enforced.

Two steps are worth calling out, because both found real defects the moment they were switched
on.

**The schema idempotency gate** applies `db/schema.sql` to an empty database, then applies it
*again* and requires success. Every deploy after the first runs the schema against a populated
database, so a statement that is not idempotent fails at release time rather than in testing.
It immediately found three tables using bare `CREATE TABLE`, and applying it to an empty
database at all revealed eight foreign keys that could never have worked: the file produced 2
of 25 tables, and nobody knew because it had only ever been run against a database that
already existed.

**The configuration contract gate** fails the build if `src/` reads a variable that
`.env.example` does not document, or documents one that nothing reads. Drift in either
direction is how one person's change silently breaks another person's component.

### CD, publishing something you can trust

Builds the image, attaches an **SBOM** and **signed build provenance**, pushes it to GHCR, then
**pulls it back and boots it**. A build and a push can both succeed while the thing in the
registry is not what you think; the only honest check is to fetch it and run it.

Images are tagged `sha-<commit>`, which is immutable. `latest` moves, so rolling back to
`latest` could fetch the broken image straight back.

The package is public, so the artifact can be verified by anyone with no credentials:

```bash
docker pull ghcr.io/shaniaong25026302/scampatrol:sha-REPLACE_WITH_VERIFIED_COMMIT
```

### Deploy, releasing it

Builds nothing. It can only release an image that CD has already verified, which is what makes
a rollback meaningful: if deploying could also build, "go back to the previous version" would
mean rebuilding it and hoping.

It health-checks `/api/health` from outside the host, so a pass proves the application, the
port mapping and the firewall together, not just that a container started.

Runs automatically after a successful CD when the repository variable `AUTO_DEPLOY` is `true`,
and by hand from the Actions tab otherwise.

## Infrastructure

| Layer | Tool | Owns |
|---|---|---|
| The server | **Terraform** (`terraform/`) | EC2 instance, security group, network placement and SSH key association |
| Its configuration | **Ansible** (`ansible/`) | Docker, swap, `.env`, pulling and starting the image |
| Releases | **GitHub Actions** | everything after a merge |

Ansible generates the runtime `.env` on the host from vault-encrypted variables, so no
credential is ever committed, baked into an image, or hand-edited on the server. The playbook
is idempotent, and `ansible/tests/verify-idempotency.sh` proves it by running the whole thing
twice and requiring the second run to change nothing.

## Health checks

Two endpoints, deliberately different.

| Endpoint | Checks | Used by |
|---|---|---|
| `/api/health/live` | the process is up. **No database.** | the container `HEALTHCHECK` |
| `/api/health` | the process **and** the database | the deploy gate, monitoring |

Using the deep one as a container probe would turn a brief database blip into a restart loop.
Using the shallow one as a release gate would report a deploy successful when the application
cannot reach its database.

## Configuration

`.env.example` is the contract. It lists **every** variable the application reads, not only the
ones you happen to need, and CI enforces it in both directions.

| File | Contains | Committed |
|---|---|---|
| `.env.example` | every setting, documented, no values | yes |
| `.env.local.example` | working values for the local container stack | yes |
| `.env` / `.env.local` | real values | **never** |

## Security

- A **blocking** secret scan on every pull request, added after a credentials file reached the
  repository. `.gitignore` stops the file by name; the scanner stops the contents by shape.
  Neither is sufficient alone.
- The container runs as an **unprivileged user**, not root.
- Images carry an SBOM and signed provenance, so what is inside them and where they came from
  are both answerable questions.
- Publishing uses a short-lived token that expires with the job, so no long-lived registry
  credential is stored anywhere.

## Branch protection

`main` cannot be pushed to directly. Every change goes through a pull request and must pass
`secret-scan`, `lint-and-test`, `docker-build` and `ci-summary`.

---

# Docker files

| File | Purpose |
|---|---|
| `Dockerfile` | the application image: slim base, production dependencies only, non-root, health check |
| `.dockerignore` | keeps `node_modules`, credentials and keys out of the build context |
| `docker-compose.local.yml` | local stack: application, MySQL and a volume |
| `docker-compose.prod.yml` | production: the published image against the managed database |
