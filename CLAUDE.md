# ScamGuard SG — Claude Code context. Express + EJS (server-rendered) + MySQL, SINGLE Node app. I am M1 (Auth + AI Checker + Team Lead).

## Repo reality (important)
The repo is ALREADY an EJS app (app.js + views/ + public/css/styles.css) — that IS our stack. Evolve it into the real
skeleton; do NOT start a parallel React/frontend structure. There is NO separate frontend/ build. ONE Express app serves
the JSON API (/api/*) AND renders the EJS pages (res.render). Client interactivity = small scripts in public/js using fetch().

## Before every change (always)
- Inspect what exists first (git log, file tree, the file, db/schema.sql, .env.example, eslint/prettier, existing views/ + public/).
- If a file exists: read and update incrementally. NEVER overwrite or recreate from scratch.
- If a teammate already added work in my area, reconcile and FLAG conflicts to me.
- Match the existing stack/structure. Do NOT create or switch git branches. Do NOT auto-commit — I commit manually.

## External inputs — teach then ask (after every step)
When a step needs a value only I can provide — DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME, JWT_SECRET, GEMINI_API_KEY,
GitHub secrets — do NOT invent it or bake a fake value into real code. Instead: (1) tell me what's needed and why;
(2) teach me how to get it in 2-4 concrete steps (exact site/menu/command); (3) tell me the exact file + key it goes in
(e.g. .env -> JWT_SECRET); (4) STOP and ask me to paste it before continuing. If a step needs nothing, say "no inputs needed".

## My scope (M1)
Pages (EJS views my Express app renders): Login views/auth/login.ejs (/auth/login), Register views/auth/register.ejs
  (/auth/register), Forgot views/auth/forgot-password.ejs (/auth/forgot-password), Reset views/auth/reset-password.ejs,
  AI Checker views/ai-checker.ejs (/ai-checker).
JSON API: POST /api/auth/register, /login, /forgot-password, /reset-password; GET /api/auth/me; POST /api/auth/logout;
  POST /api/ai/analyze; GET /api/ai/history.
Skeleton I OWN (Lead, Week 1 — so I'm never blocked):
  - App skeleton: src/server.js (Express + EJS view engine + express.static('public') + cookie-parser + mysql2 pool in
    src/db.js + GET /api/health + documented mount points for teammates' routes/views).
  - Shared view shell: views/layout.ejs + views/partials/ (header/nav/footer) + public/css/styles.css (navy base theme).
    Everyone renders their pages into my layout.
  - Create db/schema.sql + seed the auth/AI tables; Rebecca (M2) extends it with case tables.
Client JS (mine): public/js/auth.js, public/js/ai-checker.js — light fetch() to /api + inline validation. NO React/axios/build.
Shared middleware: src/middleware/auth.middleware.js (requireAuth = API 401; attachUser = set req.user + res.locals.user,
  never blocks; requireAuthPage = redirect guests to /auth/login) + role.middleware.js (requireRole). Others import these.

## Do NOT touch (others build these INTO my skeleton)
Case write + case tables (Rebecca/M2 — adds tables to the schema.sql I create; adds her routes + views),
Case read/browse/vote/flag (Nivi/M3 — adds her routes + views into my layout),
Comments + Profile (CG/M4), Points/Leaderboard + Docker (Liam/M5),
Landing/Glossary/Admin + README (Shawn/M6 — mounts his routes + views on my server).
Only edit shared files (db/schema.sql, views/layout.ejs, nav partial) ADDITIVELY and flag the owner.

## Auth rules (from the spec)
- bcrypt salt rounds = 12. JWT issued on login, stored in an httpOnly cookie, 24h expiry + refresh token.
- Middleware accepts the JWT from the cookie (or Authorization: Bearer). Protected API routes require it; protected PAGES redirect.
- Roles: Guest (unauth — browse + LIMITED AI checker), User (default on register — full), Admin (set manually).

## Validation (enforce server-side in the API AND inline in the views via public/js)
- Email: valid format, unique, <=255.  Username: 3-30, [a-zA-Z0-9_], unique.
- Password: >=8, >=1 uppercase, >=1 number, >=1 special.  Confirm password must match.
- AI Checker input: >=10 and <=10000 chars, at least one non-whitespace char.

## DB tables I create in db/schema.sql (M2 owns the file after; add additively + flag M2)
users(id, username, email, password_hash, role, avatar_url, bio, created_at)
password_resets(id, user_id, token, expires_at)
ai_analyses(id, user_id, input_text, risk_level, explanation, created_at)

## AI Scam Checker provider
Google Gemini via the Node SDK @google/genai (npm i @google/genai; import { GoogleGenAI } from "@google/genai").
Key in env GEMINI_API_KEY. Model e.g. "gemini-2.5-flash". Do NOT use the deprecated google-generativeai.

## Frontend styling (I own the base theme)
Base theme in public/css/styles.css (source of truth): government-service look, navy #1E3A5F primary, white background,
red for high-risk. Plain CSS with custom properties teammates reuse. Replace the prototype's red/green theme. No Tailwind/React.

## Project structure (single app — NO separate frontend/)
scamguard-sg/
  src/        server.js, db.js, routes/, controllers/, middleware/, models/
  views/      layout.ejs, partials/ (header,nav,footer), auth/ (login,register,...), ai-checker.ejs, + teammates' views
  public/     css/styles.css, js/ (auth.js, ai-checker.js, + teammates' scripts)
  db/         schema.sql
  .env.example, package.json

## Commits (Conventional Commits)
<type>(<scope>): <desc>. Types: feat, fix, docs, style, refactor, test, chore. Scopes: auth, ai, env, ci, scaffold, db, views.