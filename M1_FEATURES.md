# scamlah — M1 Feature Summary (Presentation Guide)

**My module (M1):** Authentication + AI Scam Checker + Team Lead (project skeleton, shared
layout/theme, and the initial database schema).

**Stack:** Node.js · Express 5 · EJS (server-rendered) with `express-ejs-layouts` · MySQL
(`mysql2`, hosted on filess.io) · Google Gemini (`@google/genai`) · `bcrypt` · `jsonwebtoken` ·
plain CSS (navy theme) · vanilla JS (`fetch`) · ESLint + Prettier · `node --test`.

> One single Express app serves **both** the JSON API (`/api/*`) **and** renders the EJS pages.
> No separate frontend / React / build step.

---

## 1. What I built (at a glance)

| Area | Delivered |
|------|-----------|
| **App skeleton** (Lead) | `src/server.js`, `src/db.js`, health check, mount points for teammates |
| **Shared UI shell** (Lead) | `views/layout.ejs` + partials, navy government-service theme in `public/css/styles.css` |
| **Database schema** (Lead) | `db/schema.sql` — `users`, `password_resets`, `ai_analyses` |
| **Tooling** (Lead) | `.env.example`, ESLint, Prettier, npm scripts |
| **Authentication** | Register, login, logout, forgot/reset password, JWT sessions, middleware |
| **AI Scam Checker** | Gemini-powered risk analysis + saved history |
| **Tests** | 33 automated tests (unit + integration), `npm test` |
| **Deployment guide** | `DEPLOY.md` (Render) |

---

## 2. Authentication (core feature)

**Pages:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`
**API:** `POST /api/auth/register · /login · /logout · /forgot-password · /reset-password · /refresh`,
`GET /api/auth/me`

**How it works (talking points):**
- Passwords are **hashed with bcrypt** (12 salt rounds) — never stored in plain text.
- On login/register the server issues a **JWT** stored in an **httpOnly cookie** (24h), plus a
  **refresh token** (7d) so sessions can be renewed without re-login.
- The token is accepted from the cookie **or** an `Authorization: Bearer` header (so the same API
  works for the website and for tools like Postman).
- **Three roles:** Guest (not logged in), User (default on register), Admin (set manually).

**Validation — enforced on the server AND live in the browser:**
- **Email:** valid format, unique, ≤ 255 chars.
- **Username:** 3–30 chars, letters/numbers/underscore, unique.
- **Password:** ≥ 8 chars, ≥ 1 uppercase, ≥ 1 number, ≥ 1 special; confirm-password must match.

**Access guards (middleware other teammates reuse):**
- `attachUser` — identifies the logged-in user without blocking guests.
- `requireAuth` — protects API routes (returns **401** to guests).
- `requireAuthPage` — protects pages (**redirects** guests to login).
- `requireRole("admin")` — role-restricted routes.

---

## 3. AI Scam Checker (core feature)

**Page:** `/ai-checker` · **API:** `POST /api/ai/analyze`, `GET /api/ai/history`

**How it works (talking points):**
- The user pastes a suspicious message (email / SMS / WhatsApp / listing).
- The text is sent to **Google Gemini** (`gemini-2.5-flash`), which returns a structured result:
  - **risk level** — `high` / `medium` / `low` (colour-coded badge),
  - a plain-English **explanation**,
  - a list of specific **red-flag signals** it detected.
- **Guest vs User (the "limited" experience):**
  - **Guests** get **5 free checks** (tracked by cookie), results are **not saved**, and they're
    prompted to register.
  - **Users** get **unlimited checks** and a **saved history** of their past results.
- **Input validation:** 10–10,000 characters, must contain real text.

---

## 4. Project skeleton & shared theme (my Team-Lead deliverables)

- **`src/server.js`** — the one Express app: EJS layout engine, static files, cookie parsing,
  JSON/form body parsing, the `attachUser` middleware, a **health check** (`GET /api/health`
  returns DB status), documented **mount points** where every teammate plugs in their routes,
  and clean **404 / error handling** (JSON for `/api/*`, HTML page otherwise).
- **`src/db.js`** — a shared MySQL connection **pool** (kept small for the filess.io free tier).
- **`views/layout.ejs` + partials** — the shared page shell everyone renders into.
- **`public/css/styles.css`** — a **navy `#1E3A5F` government-service theme** with reusable design
  tokens; red is reserved for high-risk, amber for medium, green for safe.
- **`db/schema.sql`** — the three tables below; teammates extend this file additively.

### Database tables I created
| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | accounts | `username`, `email`, `password_hash`, `role`, `avatar_url`, `bio` |
| `password_resets` | reset tokens | `user_id`, `token`, `expires_at` |
| `ai_analyses` | checker history | `user_id` (null = guest), `input_text`, `risk_level`, `explanation` |

---

## 5. API endpoints (quick reference)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/health` | — | App + DB status |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Log in |
| POST | `/api/auth/logout` | — | Log out |
| GET | `/api/auth/me` | ✔ | Current user |
| POST | `/api/auth/forgot-password` | — | Request reset |
| POST | `/api/auth/reset-password` | — | Set new password |
| POST | `/api/auth/refresh` | cookie | Renew access token |
| POST | `/api/ai/analyze` | optional | Analyse a message |
| GET | `/api/ai/history` | ✔ | My past checks |

---

## 6. Testing & quality

- **33 automated tests, all passing** (`npm test`), via Node's built-in test runner:
  - **Unit tests** — validators and JWT helpers (no DB / no network).
  - **Integration tests** — real HTTP calls covering the full auth + AI flows.
- Tests are **self-cleaning** (they delete their own test data) and **skip gracefully** if the DB
  is offline, so they're safe to run in CI.
- A test mode (`AI_FAKE=1`) lets the AI tests run **offline and free** (no Gemini cost).
- **ESLint + Prettier** keep the code consistent across the whole team.

---

## 7. Security highlights (good slide)

- bcrypt password hashing (12 rounds) · JWT in **httpOnly** cookies (not readable by JS) ·
  refresh tokens · server-side validation on every endpoint · role-based access control ·
  secrets kept in `.env` (gitignored, never committed) · parameterised SQL (no injection).

---

## 8. How to run it (demo cheat-sheet)

```bash
npm install            # install dependencies (first time only)
npm run dev            # start with auto-reload (development)
npm start              # start normally
# then open http://localhost:3000
```

Other commands:
```bash
npm test               # run all 33 tests
npm run test:unit      # run only the no-DB unit tests
npm run lint           # check code style
npm run format         # auto-format with Prettier
```

**Config:** copy `.env.example` to `.env` and fill in the database + Gemini values. The app reads
`PORT`, `DB_*`, `JWT_SECRET`, and `GEMINI_API_KEY` from there.

**Deployment:** see `DEPLOY.md` for publishing to Render with a permanent public URL.

---

## 9. One-line summary for the panel

> "I built the authentication system and the AI Scam Checker, and as team lead I set up the app
> skeleton, the shared navy UI theme, the database schema, and the test suite that the whole team
> builds on."

---

## 10. Complete file inventory (every file I wrote)

> ~40 files, ~2,150 lines. Line counts are exact; line ranges point to each function/section.

### File tree (with line counts)
```
src/
  server.js .................. 92   app entry: middleware, health, mount points, errors
  db.js ...................... 29   MySQL connection pool + ping()
  middleware/
    auth.middleware.js ....... 42   attachUser / requireAuth / requireAuthPage
    role.middleware.js ....... 12   requireRole(...roles)
  utils/
    validate.js .............. 30   email / username / password validators
    jwt.js ................... 44   sign / verify / cookie options
  models/
    user.model.js ............ 65   users + password_resets queries
    ai.model.js .............. 26   ai_analyses queries
  controllers/
    auth.controller.js ...... 150   register/login/me/logout/forgot/reset/refresh
    ai.controller.js ......... 76   analyze + history
  services/
    gemini.service.js ....... 112   Google Gemini call + AI_FAKE test mode
  routes/
    auth.routes.js ........... 19   /api/auth/* API
    auth.pages.routes.js ..... 32   /auth/* pages
    ai.routes.js ............. 13   /api/ai/* API
    ai.pages.routes.js ....... 10   /ai-checker page
views/
  layout.ejs ................. 21   shared page shell
  partials/header.ejs ......... 6   <head>
  partials/navbar.ejs ........ 19   nav (auth-aware)
  partials/footer.ejs ......... 3   footer
  index.ejs .................. 25   home / hero
  auth/login.ejs ............. 26
  auth/register.ejs .......... 34
  auth/forgot-password.ejs ... 20
  auth/reset-password.ejs .... 26
  ai-checker.ejs ............. 46   checker form + result + history
public/
  css/styles.css ............ 352   navy theme (tokens + all components)
  js/main.js ................. 13   navbar logout
  js/auth.js ................ 203   auth forms: validation + fetch
  js/ai-checker.js .......... 148   checker: validate, analyze, history
db/
  schema.sql ................. 53   users, password_resets, ai_analyses
tests/
  helpers.js ................. 51   cookie-jar HTTP client
  validate.test.js ........... 54   unit: validators
  jwt.test.js ................ 49   unit: JWT
  api.test.js ............... 170   integration: auth + AI
.env.example ................. 24   config template
eslint.config.js ............. 46   lint rules
.prettierrc.json .............. 7   format rules
.prettierignore ............... 3
package.json ................. 35   deps + scripts (modified)
DEPLOY.md ......................    Render deployment guide
M1_FEATURES.md ................    this file
```

### Key chunks by line range

**`src/server.js`** — 1–14 imports & app setup · 16–20 EJS+layout · 22–36 core middleware + `attachUser` · 38–46 `GET /api/health` · 48–51 `GET /` home · 53–66 route mount points · 68–74 404 handler · 76–86 error handler · 88–92 listen-when-direct + export

**`src/middleware/auth.middleware.js`** — 8 `extractToken` · 15 `attachUser` · 31 `requireAuth` · 36 `requireAuthPage`

**`src/utils/jwt.js`** — 10 `signAccess` · 14 `signRefresh` · 18 `verify` · 25 `accessCookieOpts` · 29 `refreshCookieOpts` · 33 `clearCookieOpts`

**`src/utils/validate.js`** — 7 `validateEmail` · 14 `validateUsername` · 21 `validatePassword`

**`src/models/user.model.js`** — 6 `findByEmail` · 11 `findByUsername` · 16 `findPublicById` · 24 `createUser` · 32 `updatePassword` · 37 `createReset` · 44 `findReset` · 52 `deleteResetsForUser`

**`src/controllers/auth.controller.js`** — 20 `issueSession` · 26 `publicUser` · 31 `register` · 58 `login` · 74 `me` · 81 `logout` · 88 `forgotPassword` · 111 `resetPassword` · 131 `refresh`

**`src/controllers/ai.controller.js`** — 13 `validateInput` · 22 `analyze` (guest-limit + Gemini + save) · 71 `history`

**`src/services/gemini.service.js`** — 9 `getClient` · 15 `RESPONSE_SCHEMA` · 25 `buildPrompt` · 46 `safeParse` · 66 `fakeAnalyze` (test mode) · 85 `analyzeText`

**`src/models/ai.model.js`** — 4 `createAnalysis` · 12 `historyForUser`

**`public/js/auth.js`** — 9–28 client validators · 30–79 helpers (`setFieldError`/`banner`/`postJSON`) · 81 login submit · 103 register submit · 139 forgot submit · 167 reset submit

**`public/js/ai-checker.js`** — 19–44 helpers · 36 char counter · 45 `riskLabel` · 49 `renderResult` · 79 `escapeHtml` · 85 `loadHistory` · 114 analyze submit

**`public/css/styles.css`** — 7 design tokens · 60 navbar · 115 alerts · 133 hero · 167 cards · 199 buttons & inputs · 253 forms · 268 risk badges · 286 AI checker · 331 footer · 344 responsive

**`db/schema.sql`** — `users` (14–29) · `password_resets` (32–44) · `ai_analyses` (47–53)

**`tests/api.test.js`** — before/after setup + ephemeral server (28–55) · auth tests (57–122) · AI tests (124–170)
