# Deploying scamlah to Render

A guide to publish the app at a permanent public URL (e.g. `https://scamlah.onrender.com`)
that teammates can open anytime — even when your laptop is off.

> Render builds the Node app natively from `package.json` (no Docker), so Liam's
> Docker/CI work stays untouched and still works later. Auto-deploys on every push to `main`.

> **Secrets:** all real values live in your local `.env` (gitignored). This guide never
> hardcodes them — copy each value from `.env` when filling in the Render dashboard.

---

## Step 1 — Push your code to GitHub

Render deploys from GitHub, so your latest code must be pushed. `.env` is gitignored,
so this will **not** leak your DB password or API key.

```bash
git add -A && git commit -m "feat: ..." && git push origin main
```

## Step 2 — Create the Render web service

1. Go to **https://render.com** → sign up / log in **with GitHub** (free).
2. Click **New +** → **Web Service**.
3. Connect your repo **`scamlah-devops-`** (authorize Render to see it if asked).
4. Fill in:
   - **Name:** `scamlah` (this becomes your URL: `https://scamlah.onrender.com`)
   - **Region:** Singapore
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**

## Step 3 — Add environment variables

Scroll to **Environment** → **Add Environment Variable**, and add the keys below, copying
each **value from your local `.env`**. **Do not set `PORT`** — Render injects its own and the
app reads it automatically.

| Key | Where the value comes from |
|-----|----------------------------|
| `NODE_ENV` | `production` |
| `DB_HOST` | from `.env` (filess.io host) |
| `DB_PORT` | from `.env` |
| `DB_USER` | from `.env` |
| `DB_PASSWORD` | from `.env` |
| `DB_NAME` | from `.env` |
| `DB_CONNECTION_LIMIT` | `3` (filess.io caps total connections at 5) |
| `JWT_SECRET` | from `.env` |
| `JWT_EXPIRES_IN` | `24h` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `GEMINI_API_KEY` | from `.env` |
| `GEMINI_MODEL` | `gemini-2.5-flash` |

## Step 4 — Deploy

Click **Create Web Service**. First build takes ~2–4 min. When it's live you'll get a public
link like **`https://scamlah.onrender.com`** — paste that to your teammates. Verify it with
`https://scamlah.onrender.com/api/health` → should say `{"status":"ok","db":"up"}`.

---

## Free-tier notes

- **DB connections:** filess.io free tier caps total connections at **5**
  (`max_user_connections`). Keep `DB_CONNECTION_LIMIT` low (3) so running on Render *and*
  locally at the same time doesn't blow the cap.
- **Cold starts:** after ~15 min of no traffic the Render service sleeps; the next visit
  takes ~50s to wake. Normal for free — warn teammates the first click may be slow.
- **Auto-deploy:** every future `git push` to `main` automatically redeploys, so merged
  teammate work goes live on its own.

## Troubleshooting

- **Build OK but `/api/health` shows `db: "down"`** → a DB env var is missing or wrong, or
  you hit the 5-connection cap. Recheck the `DB_*` values against your `.env`.
- **`MODULE_NOT_FOUND` during build** → ensure `package.json` + `package-lock.json` are
  committed and pushed.
- **App won't bind / "no open ports detected"** → make sure you did **not** hardcode `PORT`;
  the app must read `process.env.PORT` (it already does in `src/server.js`).
