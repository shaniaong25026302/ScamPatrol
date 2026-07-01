# scamlah — M1 Feature Summary (Shania)

**My module (M1):** Authentication · AI Scam Checker · Team Lead (app skeleton, shared layout/theme,
initial DB schema) — **plus** I took over **Leaderboard / gamification** from M5 and turned the whole
app into a retro-pixel game, **"Scam Patrol HQ."**

**Stack:** Node.js · Express 5 · EJS (server-rendered) · MySQL (`mysql2`, filess.io) ·
Google Gemini (`@google/genai`) · Nodemailer · `bcrypt` · `jsonwebtoken` · vanilla JS + Web Audio ·
plain CSS (retro/pixel theme) · ESLint + Prettier · `node --test`.

> Every feature below lists the **file path(s)** that implement it.

---

## 1. App skeleton & shared shell (Lead)
One Express app serving the JSON API (`/api/*`) and rendering EJS pages; health check; documented
mount points; 404/error handling; guest-gating middleware (guests only see the homepage).
**Files:** `src/server.js` · `src/db.js` · `views/layout.ejs` · `views/partials/header.ejs` ·
`views/partials/footer.ejs`

## 2. Authentication
Register / login / logout / forgot-password / reset-password / refresh; bcrypt (12 rounds);
JWT in httpOnly cookie (24h) + refresh token (7d); `attachUser` / `requireAuth` / `requireAuthPage`
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
saved history for users; `AI_FAKE` offline test mode.
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

## 7. Gamification engine (XP · levels · coins · streaks · badges)
Single `award()` engine; app-wide passive XP observer rewards teammates' actions (report/vote/flag/
comment) without touching their code.
**Files:** `src/services/gamification.service.js` · `src/models/game.model.js` ·
`src/controllers/game.controller.js` · `src/routes/game.routes.js` ·
`src/middleware/gamification.middleware.js` · tables in `db/schema.sql`
(`game_profiles`, `xp_events`, `user_badges`, `game_scores`)

## 8. World Leaderboard (taken over from M5)
Score + streak tabs; your global rank.
**Files:** `src/controllers/game.controller.js` (`leaderboard`) · `views/game/leaderboard.ejs` ·
`public/js/game-leaderboard.js`

## 9. ⚡ Energy system
5 max, −1 per mission run, +1 every hour (server-computed regen); shown in the HUD with a live
countdown to the next refill; gates missions.
**Files:** `src/services/gamification.service.js` (`computeEnergy`) ·
`src/controllers/game.controller.js` (`readEnergy`/`spendEnergy`) · `src/models/game.model.js`
(`setEnergy`) · `db/schema.sql` (`game_profiles.energy`, `energy_updated_at`)

## 10. 🗺️ Field Missions + clickable operations map
Click locations on a map board (Email · SMS · Website · Call · Boss, joined by a path) with ★ ratings
and a locked Boss (unlocks after 6 clears); each run costs energy and shows a full-screen
Correct/Not-quite popup with the explanation.
**Files:** `src/data/missions.js` · `src/controllers/game.controller.js`
(`missionStart`/`missionCheck`/`missionsProgress`) · `views/game/missions.ejs` ·
`public/js/game-missions.js`

## 11. 🛒 Gold Shop + character avatars
Spend gold on characters (Recruit/Detective/Chief/Inspector Hoot + the 4 villains); equip one as
your profile picture (updates the HUD).
**Files:** `src/data/shop.js` · `src/controllers/game.controller.js`
(`getShop`/`buyItem`/`equipItem`) · `src/models/game.model.js`
(`spendCoins`/`addPurchase`/`getPurchases`/`setAvatar`) · `views/game/shop.ejs` ·
`public/js/game-shop.js` · `db/schema.sql` (`user_purchases`, `game_profiles.avatar`)

## 12. 📖 Story mode (interactive origin story)
"Second Chance": Uncle Tan gets scammed → Inspector Hoot → portal rewinds time → branching scammer
chat (choices → endings, owl second-chance rewind). Guests are prompted to sign up.
**Files:** `views/game/story.ejs` · `public/js/game-story.js` ·
`src/controllers/game.controller.js` (`storyComplete`)

## 13. 🦉 Scam Patrol HQ dashboard + interactive mentor
HQ hub (analyzer, rank journey, streak, missions/leaderboard/villains panels, daily challenge,
onboarding quest); poke Inspector Hoot → "ow"/coins/SG scam fun facts.
**Files:** `views/game/hq.ejs` · `public/js/game-hq.js`

## 14. 🎨 Retro/pixel theme, game shell & HUD
One unified retro theme (Press Start 2P + VT323, CRT scanlines, pixel borders); single game navbar;
live HUD (level/energy/coins/streak/avatar); full-screen Correct popup.
**Files:** `public/css/game.css` · `views/layout.ejs` · `views/partials/game-nav.ejs` ·
`public/js/game-hud.js`

## 15. 🔊 Sound (SFX + theme song)
Synthesized retro SFX (click/XP/level/badge/win/error/hoot) + the **Tetris** theme song; 🔊/🎵 toggles.
**Files:** `public/js/sound.js` · `public/audio/theme.mp3`

## 16. ↔️ Seamless navigation (SPA soft-nav)
Internal links swap content via fetch (no full reload) so the music never stops; graceful fallback
to full navigation.
**Files:** `public/js/spa.js`

## 17. 🖼️ Game art (cropped from the mockup)
Logo, owl mentor, 4 villain portraits, character avatars.
**Files:** `public/img/logo-cropped.png` · `public/img/owl-mentor.png` ·
`public/img/villains/{fakebank,parcel,loveliar,crypto}.png` ·
`public/img/avatars/{recruit,detective,chief}.png`

## 18. 🔒 Guest-gating
Logged-out users can only see the gamified homepage; everything else requires login.
**Files:** `src/server.js` (guest-gate middleware)

## 19. ✅ Tests & tooling
`node --test` suite (unit + integration, self-cleaning, DB-skip-safe, `AI_FAKE`).
**Files:** `tests/api.test.js` · `tests/validate.test.js` · `tests/jwt.test.js` · `tests/helpers.js` ·
`eslint.config.js` · `.prettierrc.json` · `package.json`

---

## Database tables I own (`db/schema.sql`)
`users` · `password_resets` · `ai_analyses` · `game_profiles` · `xp_events` · `user_badges` ·
`game_scores` · `user_purchases`

## How to run
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # automated tests
npm run lint
```

## One-liner for the panel
> "I built authentication and the AI Scam Checker, and as team lead I created the app skeleton,
> shared theme, database schema and tests — then took over the leaderboard and turned the whole app
> into a retro-pixel game (Scam Patrol HQ) with XP, energy, a gold shop, field missions, an
> interactive story, sound and seamless navigation."
