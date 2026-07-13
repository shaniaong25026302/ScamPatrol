# Scam Weather Automation — Liam Member 5

## What this feature does

Scam Weather is a public-facing scam/cybersecurity briefing page.

It has two main parts:

1. **Daily Report**
   - Loads asynchronously at the top of `/scam-weather`.
   - Scans Scam Weather's trusted article cache.
   - Prefers articles from the last 24 hours.
   - If no daily articles exist, widens to 7 days, then 30 days, then latest cached trusted articles.
   - Groups articles by scam type and source.
   - Shows simple bar diagrams and a collapsible tray of every article used.

2. **Monthly Report**
   - Builds a wider month-level signal for presentations.
   - Uses the current calendar month first.
   - Falls back to last 30 days, then last 90 days, then latest trusted cached articles.
   - Includes seasonal advice as a backup when the trusted-source pool is quiet.

3. **Scam News**
   - Immediately shows up to 6 scam/cybersecurity articles from reputable sources.
- Prefers articles from the last 24 hours, but fills empty slots with the latest older trusted articles so the page does not go blank during slow news days.
   - Users can click **View another 6 articles** to paginate.
   - Articles are labelled with one or more scam types.
   - Every article links back to its original trusted source.

The page also keeps the previous **admin bulletin board** feature:
- Admins can manually create/edit/delete Scam Weather posts.
- Regular users and guests can view the page.

---

## Main files changed

### `src/services/scamweather.service.js`

This is the main brain of the feature.

It handles:

- trusted source registry
- RSS/Atom feed fetching
- article relevance filtering
- scam type classification
- JSON caching
- daily report generation with freshness fallback
- monthly report generation with 30/90-day fallback
- seasonal forecast rules
- admin editorial posts

The code is heavily commented for presentation.

### `src/routes/scamweather.pages.routes.js`

This handles browser pages:

- `GET /scam-weather`
- `GET /scam-weather/new`
- `POST /scam-weather`
- `GET /scam-weather/:id/edit`
- `POST /scam-weather/:id/edit`
- `POST /scam-weather/:id/delete`

### `src/routes/scamweather.api.routes.js`

This handles JSON automation endpoints:

- `GET /api/scam-weather/daily-report`
- `GET /api/scam-weather/monthly-report`
- `GET /api/scam-weather/news?page=1&limit=6`
- `GET /api/scam-weather/sources`
- `POST /api/scam-weather/refresh` — admin only

### `public/js/scam-weather.js`

This makes the page interactive:

- fetches Daily Report while user can scroll
- fetches Monthly Report independently
- renders chart bars
- renders the article tray
- loads another 6 articles on button click

### `views/scam-weather/index.ejs`

This is the Scam Weather UI.

It includes:

- hero section
- seasonal forecast
- daily report loading area
- monthly report loading area
- chart containers
- trusted source tray
- scam news cards
- load more button
- admin bulletin board

---

## Why JSON cache is used

The team’s database integration is still evolving.

So Scam Weather uses JSON cache files under:

```txt
src/data/
```

This allows the feature to work now without blocking on MySQL.

Future MySQL tables are drafted in:

```txt
db/schema.sql
```

Look for:

```sql
<Liam Scam Weather Start>
```

---

## How the automation works

```txt
User opens /scam-weather
↓
Page renders immediately using cached/seed articles
↓
Browser calls /api/scam-weather/daily-report and /api/scam-weather/monthly-report
↓
Backend refreshes RSS feeds if cache is stale
↓
Backend classifies scam types
↓
Daily Report uses 24h → 7d → 30d → latest trusted cache fallback
↓
Monthly Report uses current month → 30d → 90d → latest trusted cache fallback
↓
Backend returns chart-ready JSON
↓
Browser renders report diagrams
```

This matches the requirement that users should not wait to read Scam News while Daily Report is being prepared.


---

## Freshness and fallback policy

This feature deliberately avoids the bad edge case where Scam Weather becomes empty when fewer than 6 trusted articles were published today.

### Scam News

```txt
Preferred: last 24 hours
Fallback: latest older articles from the same reputable source pool
Result: the page always tries to show 6 trusted articles, unless the selected filter genuinely has fewer than 6 total articles.
```

Backfilled articles are labelled as `Trusted recent fallback` in the UI. This keeps the page useful without pretending older articles are breaking news.

### Daily Report

```txt
1. Last 24 hours
2. Last 7 days
3. Last 30 days
4. Latest trusted cached articles
```

The report includes a `fallbackReason` explaining which window was used.

### Monthly Report

```txt
1. Current calendar month
2. Last 30 days
3. Last 90 days
4. Latest trusted cached articles + seasonal advice
```

Monthly Report intentionally does **not** depend on the last 24 hours. It is meant to show broader scam patterns.

---

## Scam type classifier

The classifier is transparent and local.

Instead of relying on a paid AI API, it checks article title/summary keywords against the project’s scam types:

- Phishing
- Pretext
- Identity Theft
- Spear-Phishing
- Vishing
- Tailgate
- Dumpster Diving
- Shoulder Surfing
- Baiting
- Virus
- Worm
- Rootkit
- Trojan
- Adware
- Spyware
- Botnet
- Scareware
- Logic Bomb
- Ransomware
- Zero Day

This makes the system reliable for demos and easy to explain during presentation.

If the team later wants Gemini classification, replace or extend `classifyArticle()` in `scamweather.service.js`.

---

## Trusted source policy

The feature only pulls from a curated allow-list in `TRUSTED_SOURCES`.

Every source has:

- `name`
- `sourceUrl`
- optional `feedUrl`
- `region`
- `type`

Sources without stable RSS feeds are still shown in the source list and can be wired later.

---

## Demo tips

1. Start the app:

```powershell
npm start
```

2. Visit:

```txt
http://localhost:3000/scam-weather
```

3. Watch Daily Report show a loading animation first.

4. Scroll down immediately to Scam News.

5. Click **View another 6 articles**.

6. Open **Show articles used to build this report** to prove traceability.

7. If logged in as admin, go to:

```txt
/scam-weather/new
```

to create a manual admin bulletin.

---

## Useful endpoints for presentation

### Daily Report

```txt
GET /api/scam-weather/daily-report
```

### Monthly Report

```txt
GET /api/scam-weather/monthly-report
```

### Scam News pagination

```txt
GET /api/scam-weather/news?page=1&limit=6
```

### Trusted source list

```txt
GET /api/scam-weather/sources
```

### Admin refresh

```txt
POST /api/scam-weather/refresh
```

Requires admin login.

---

## Important limitations

- Live RSS fetching depends on the source website being reachable.
- Some reputable government sites do not expose stable RSS feeds.
- If live fetching fails, Scam Weather falls back to cached/seed articles so the demo still works.
- The current storage is JSON-based. MySQL migration tables are already drafted for final integration.
