# Scam Patrol — M1 Feature Summary (Shania)

**My module (M1):** Authentication · AI Scam Checker · Team Lead (app skeleton, shared layout/theme,
initial DB schema) — **plus** I took over **Leaderboard / gamification** from M5 and turned the whole
app into a retro-pixel game, **"Scam Patrol HQ."**

**Stack:** Node.js · Express 5 · EJS (server-rendered) · MySQL (`mysql2`, filess.io) ·
Google Gemini (`@google/genai`) · Nodemailer · `bcrypt` · `jsonwebtoken` · vanilla JS + Web Audio ·
plain CSS (retro/pixel theme) · ESLint + Prettier.

> Every feature below lists the **file path(s)** that implement it.

---

## 1. App skeleton & shared shell (Lead)
One Express app serving the JSON API (`/api/*`) and rendering EJS pages; health check; documented
mount points; 404/error handling; guest-gating middleware (guests only see the homepage).
**Files:** `src/server.js` · `src/db.js` · `views/layout.ejs` · `views/partials/header.ejs` ·
`views/partials/footer.ejs`

## 2. Authentication
Register / login / logout / forgot-password / reset-password; bcrypt (12 rounds);
JWT in httpOnly cookie (24h) + refresh token (7d); `attachUser` / `requireAuth`
/ `requireRole` middleware; full server-side + inline validation; show/hide-password eye toggle;
3 roles (Guest/User/Admin).
**Files:** `src/controllers/auth.controller.js` · `src/routes/auth.routes.js` ·
`src/routes/auth.pages.routes.js` · `src/middleware/auth.middleware.js` ·
`src/middleware/role.middleware.js` · `src/utils/jwt.js` · `src/utils/validate.js` ·
`src/models/user.model.js` · `views/auth/login.ejs` · `views/auth/register.ejs` ·
`views/auth/forgot-password.ejs` · `views/auth/reset-password.ejs` · `public/js/auth.js`

## 3. Password-reset email (Gmail SMTP)
Sends real reset links via Nodemailer; falls back to an on-screen link in dev.
**Files:** `src/services/mail.service.js` (used by `src/controllers/auth.controller.js`)

## 4. AI Scam Checker
Paste a message → Gemini returns risk level (low/medium/high) + explanation + red-flag signals;
saved history for users; `AI_FAKE` offline mode (runs without a Gemini key, for demos).
**Files:** `src/controllers/ai.controller.js` · `src/routes/ai.routes.js` ·
`src/routes/ai.pages.routes.js` · `src/services/gemini.service.js` · `src/models/ai.model.js` ·
`views/ai-checker.ejs` · `public/js/ai-checker.js`

## 5. Long-Con / Romance scam detector
Paste a whole conversation → AI maps the manipulation **timeline** stage-by-stage.
**Files:** `src/services/gemini.service.js` (`analyzeRelationship`) ·
`src/controllers/ai.controller.js` (`relationship`) · `views/game/relationship.ejs` ·
`public/js/game-relationship.js`

## 6. Roast-the-Scam (Dojo)
AI roasts a pasted scam + gives a 1–10 "scam quality score."
**Files:** `src/services/gemini.service.js` (`roastScam`) · `src/controllers/game.controller.js` (`roast`) ·
`views/game/dojo.ejs` · `public/js/game-roast.js`

## 7. 💬 Ask Inspector Hoot — anti-scam chatbot
Floating chat bubble (top-right, on every logged-in page) that answers scam questions in a
Gemini-powered multi-turn conversation — the helpline (1799), what to do if you've been scammed,
how to spot phishing — grounded with real Singapore facts and safety guardrails (never asks for
OTP/passwords, only discusses scams). Quick-question chips + typing indicator.
**Files:** `src/services/gemini.service.js` (`chatReply`) · `src/controllers/ai.controller.js` (`chat`) ·
`src/routes/ai.routes.js` (`POST /api/ai/chat`) · `views/partials/chat-widget.ejs` ·
`public/js/chat-widget.js` · `views/layout.ejs` (mounts the widget)

## 8. Gamification engine (XP · levels · coins · streaks · badges)
Single `award()` engine; app-wide passive XP observer rewards teammates' actions (report/vote/flag/
comment) without touching their code.
**Files:** `src/services/gamification.service.js` · `src/models/game.model.js` ·
`src/controllers/game.controller.js` · `src/routes/game.routes.js` ·
`src/middleware/gamification.middleware.js` · tables in `db/schema.sql`
(`game_profiles`, `xp_events`, `user_badges`, `game_scores`)

## 9. World Leaderboard (taken over from M5)
Score + streak tabs; your global rank.
**Files:** `src/controllers/game.controller.js` (`leaderboard`) · `views/game/leaderboard.ejs` ·
`public/js/game-leaderboard.js`

## 10. ⚡ Energy system
5 max, −1 per mission run, +1 every hour (server-computed regen); shown in the HUD with a live
countdown to the next refill; gates missions.
**Files:** `src/services/gamification.service.js` (`computeEnergy`) ·
`src/controllers/game.controller.js` (`readEnergy`/`spendEnergy`) · `src/models/game.model.js`
(`setEnergy`) · `db/schema.sql` (`game_profiles.energy`, `energy_updated_at`)

## 11. 🗺️ Field Missions + clickable operations map
Click locations on a map board (Email · SMS · Website · Call · Boss, joined by a path) with ★ ratings
and a locked Boss (unlocks once each case type is cleared at least once); each run costs energy and
shows a full-screen Correct/Not-quite popup with the explanation.
**Files:** `src/data/missions.js` · `src/controllers/game.controller.js`
(`missionStart`/`missionCheck`/`missionsProgress`) · `views/game/missions.ejs` ·
`public/js/game-missions.js`

## 12. 🛒 Gold Shop + character avatars
Spend gold on characters (Recruit/Detective/Chief/Inspector Hoot + the 4 villains); equip one as
your profile picture (updates the HUD).
**Files:** `src/data/shop.js` · `src/controllers/game.controller.js`
(`getShop`/`buyItem`/`equipItem`) · `src/models/game.model.js`
(`spendCoins`/`addPurchase`/`getPurchases`/`setAvatar`) · `views/game/shop.ejs` ·
`public/js/game-shop.js` · `db/schema.sql` (`user_purchases`, `game_profiles.avatar`)

## 13. 📖 Story mode (interactive origin story)
"Second Chance": Uncle Ong gets scammed → Inspector Hoot → portal rewinds time → branching scammer
chat (choices → endings, owl second-chance rewind). Guests are prompted to sign up.
**Files:** `views/game/story.ejs` · `public/js/game-story.js` ·
`src/controllers/game.controller.js` (`storyComplete`)

## 14. 🦉 Scam Patrol HQ dashboard + interactive mentor
HQ hub (analyzer, rank journey, streak, missions/leaderboard/villains panels, daily challenge,
onboarding quest); poke Inspector Hoot → "ow"/coins/SG scam fun facts.
**Files:** `views/game/hq.ejs` · `public/js/game-hq.js`

## 15. 🎨 Retro/pixel theme, game shell & HUD
One unified retro theme (Press Start 2P + VT323, CRT scanlines, pixel borders); single game navbar;
live HUD (level/energy/coins/streak/avatar); full-screen Correct popup.
**Files:** `public/css/game.css` · `views/layout.ejs` · `views/partials/game-nav.ejs` ·
`public/js/game-hud.js`

## 16. 🔊 Sound (SFX + theme song)
Synthesized retro SFX (click/XP/level/badge/win/error/hoot) + the **Tetris** theme song; 🔊/🎵 toggles.
**Files:** `public/js/sound.js` · `public/audio/theme.mp3`

## 17. ↔️ Seamless navigation (SPA soft-nav)
Internal links swap content via fetch (no full reload) so the music never stops; graceful fallback
to full navigation.
**Files:** `public/js/spa.js`

## 18. 🖼️ Game art (cropped from the mockup)
Logo, owl mentor, 4 villain portraits, character avatars.
**Files:** `public/img/logo-cropped.png` · `public/img/owl-mentor.png` ·
`public/img/villains/{fakebank,parcel,loveliar,crypto}.png` ·
`public/img/avatars/{recruit,detective,chief}.png`

## 19. 🔒 Guest-gating
Logged-out users can only see the gamified homepage; everything else requires login.
**Files:** `src/server.js` (guest-gate middleware)

## 20. ✅ Tooling
ESLint + Prettier as a code-quality gate; npm scripts for dev / start / lint / format.
**Files:** `eslint.config.js` · `.prettierrc.json` · `package.json`

---

## 🛠️ DevOps practices I applied (M1)
This is a DevOps module, so I applied DevOps practices across my part of the codebase. Every one is
commented in-place with a `[DevOps: …]` tag so it can be traced to the exact line. All files below are
mine (M1). *(Docker + CI/CD are Final-Assessment scope, not CA2.)*

**1. Config & secrets management (12-factor)** — all config comes from environment variables; secrets
are never committed. `src/server.js:5` · `.gitignore:4`
```js
// [DevOps: Config & secrets management] all configuration comes from environment variables (.env)
require("dotenv").config();
```

**2. Environment consistency (Node version pinning)** — `package.json:8`
```json
"engines": { "node": ">=18" }
```

**3. Static analysis & formatting (quality gate)** — `package.json:13-14` · `eslint.config.js` · `.prettierrc.json`
```json
"lint": "eslint .",
"format": "prettier --write ."
```

**4. Monitoring / health check** — `src/server.js:68`
```js
// [DevOps: Monitoring / health check] liveness+readiness endpoint that also probes the DB
app.get("/api/health", async (req, res) => {
  try { await ping(); res.json({ status: "ok", db: "up" }); }
  catch (err) { res.status(503).json({ status: "degraded", db: "down", error: err.code }); }
});
```

**5. Centralized error handling + async wrappers** — one handler catches every fault so the process
never crashes. `src/server.js:123` · `src/routes/ai.routes.js:7`
```js
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Internal server error" }); });
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

**6. Graceful shutdown** — `src/server.js:143`
```js
// [DevOps: Graceful shutdown] close server + DB pool cleanly on termination signals
const shutdown = (sig) => { server.close(() => require("./db").pool.end().finally(() => process.exit(0))); };
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

**7. Resource management (tuned connection pool)** — `src/db.js:13`
```js
// [DevOps: Resource management] tuned pool (filess.io caps at 5 connections)
connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 4,
maxIdle: 2,
idleTimeout: 30000,
```

**8. Observability / structured logging** — `src/services/mail.service.js:145,189`
```js
console.log(`Email: ${provider} HTTP API configured (sender ${senderIdentity().email}).`);
console.log(`Password reset email sent via ... (id ${info.messageId}) -> ${toEmail}`);
```

**9. Reliability** — HTTP email API (Mailjet) with SMTP fallback. `src/services/mail.service.js`
```js
// [DevOps: Reliability]
if (hasMailjet()) { /* Mailjet HTTPS API — port 443, works even where SMTP is blocked */ }
// else fall back to plain SMTP
```

**10. Security by default (DevSecOps)**
- httpOnly + secure cookies — `src/utils/jwt.js:25` → `return { httpOnly: true, sameSite: "lax", secure: isProd(), maxAge: DAY };`
- password hashing — `src/controllers/auth.controller.js:18` → `const SALT_ROUNDS = 12;`
- server-side input validation — `src/utils/validate.js:5`
- auth guard / guest-gating — `src/server.js:64` → `return res.status(401).json({ error: "Login required." });`

**11. Config-driven deployment** — `src/server.js:21,25`
```js
const PORT = process.env.PORT || 3000;   // [12-factor] bind to the port the platform injects
app.set("trust proxy", 1);               // trust the platform's proxy (correct https + host)
```

---

## Database tables I own (`db/schema.sql`)
`users` · `password_resets` · `ai_analyses` · `game_profiles` · `xp_events` · `user_badges` ·
`game_scores` · `user_purchases`

## How to run
```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
```

## One-liner for the panel
> "I built authentication and the AI Scam Checker, and as team lead I created the app skeleton,
> shared theme, database schema and tests — then took over the leaderboard and turned the whole app
> into a retro-pixel game (Scam Patrol HQ) with XP, energy, a gold shop, field missions, an
> interactive story, sound and seamless navigation."
