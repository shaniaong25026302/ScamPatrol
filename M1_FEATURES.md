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
