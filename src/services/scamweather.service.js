const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// <Liam Member 5 Start>
// src/services/scamweather.service.js
// -----------------------------------------------------------------------------
// Scam Weather service
// -----------------------------------------------------------------------------
// This service is intentionally verbose and annotated because Scam Weather is a
// presentation feature. The goal is that a reader can understand the flow:
//
// 1. Keep a curated allow-list of reputable sources.
// 2. Pull RSS/Atom feeds from those sources when the app is online.
// 3. Classify each article into Scam Patrol's "scam types" using transparent
//    keyword scoring. This acts as a local, no-cost AI-style classifier.
// 4. Cache results in JSON so the Scam Weather page loads instantly.
// 5. Build a Daily Report from the cached article pool.
// 6. Keep admin editorial posts as a separate feature for manual announcements.
//
// Important design decision:
// The page does NOT block while fetching live news. It renders from cache first,
// then /api/scam-weather/daily-report can refresh the cache in the background.
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, "..", "data");
const POSTS_FILE = path.join(DATA_DIR, "scamWeatherPosts.json");
const ARTICLES_FILE = path.join(DATA_DIR, "scamWeatherArticles.json");

// Cache duration for live feeds. This prevents every page refresh from hammering
// RSS feeds. Set SCAM_WEATHER_REFRESH_MINUTES=0 in .env if you want to force
// refreshes during demos.
const REFRESH_MINUTES = Number(process.env.SCAM_WEATHER_REFRESH_MINUTES || 30);
const CACHE_TTL_MS = Math.max(0, REFRESH_MINUTES) * 60 * 1000;

// How long one source is allowed to hang before it is skipped. RSS feeds are
// optional; Scam Weather falls back to cached/seed data if a feed is down.
const SOURCE_TIMEOUT_MS = Number(process.env.SCAM_WEATHER_SOURCE_TIMEOUT_MS || 7000);

// The assignment's scam-type vocabulary. Every article can receive one or more
// of these labels. This is intentionally centralised so it can be shown during
// presentation and adjusted without changing route/view code.
const SCAM_TYPES = [
  "Phishing",
  "Pretext",
  "Identity Theft",
  "Spear-Phishing",
  "Vishing",
  "Tailgate",
  "Dumpster Diving",
  "Shoulder Surfing",
  "Baiting",
  "Virus",
  "Worm",
  "Rootkit",
  "Trojan",
  "Adware",
  "Spyware",
  "Botnet",
  "Scareware",
  "Logic Bomb",
  "Ransomware",
  "Zero Day"
];

// Scam Weather manual post categories. These are for admin/editorial posts, not
// automated news articles.
const POST_CATEGORIES = ["news", "advice"];

// Reputable source registry based on the provided project document.
// - sourceUrl is always shown to users for traceability.
// - feedUrl is used when the source exposes a simple RSS/Atom feed.
// - Some government pages do not provide a stable public RSS feed; those are
//   still included as reputable sources and can be added manually or wired later.
const TRUSTED_SOURCES = [
  {
    name: "FTC Consumer Advice — Scams",
    sourceUrl: "https://consumer.ftc.gov/scams",
    feedUrl: "https://consumer.ftc.gov/consumer-alerts/rss",
    region: "US",
    type: "public-safety"
  },
  {
    name: "Australian Scamwatch",
    sourceUrl: "https://www.scamwatch.gov.au/",
    feedUrl: "https://www.scamwatch.gov.au/news-alerts/rss",
    region: "AU",
    type: "public-safety"
  },
  {
    name: "Singapore ScamShield",
    sourceUrl: "https://www.scamshield.gov.sg/",
    feedUrl: "",
    region: "SG",
    type: "public-safety"
  },
  {
    name: "Singapore Police Force — Scams",
    sourceUrl: "https://www.police.gov.sg/Advisories/Scams",
    feedUrl: "",
    region: "SG",
    type: "public-safety"
  },
  {
    name: "FBI Internet Crime Complaint Center — IC3",
    sourceUrl: "https://www.ic3.gov/",
    feedUrl: "",
    region: "US",
    type: "public-safety"
  },
  {
    name: "FBI Cyber Crime News",
    sourceUrl: "https://www.fbi.gov/investigate/cyber/news",
    feedUrl: "",
    region: "US",
    type: "law-enforcement"
  },
  {
    name: "UK Report Fraud",
    sourceUrl: "https://www.reportfraud.police.uk/",
    feedUrl: "",
    region: "UK",
    type: "public-safety"
  },
  {
    name: "UK Report Fraud Alert",
    sourceUrl: "https://reportfraudalert.co.uk/",
    feedUrl: "https://reportfraudalert.co.uk/feed/",
    region: "UK",
    type: "public-safety"
  },
  {
    name: "UK NCSC Reports & Advisories",
    sourceUrl: "https://www.ncsc.gov.uk/section/keep-up-to-date/reports-advisories",
    feedUrl: "https://www.ncsc.gov.uk/api/1/services/v1/report-rss-feed.xml",
    region: "UK",
    type: "cyber-advisory"
  },
  {
    name: "UK NCSC News",
    sourceUrl: "https://www.ncsc.gov.uk/section/keep-up-to-date",
    feedUrl: "https://www.ncsc.gov.uk/api/1/services/v1/news-rss-feed.xml",
    region: "UK",
    type: "cyber-news"
  },
  {
    name: "Cyber Security Agency of Singapore — CSA",
    sourceUrl: "https://www.csa.gov.sg/",
    feedUrl: "",
    region: "SG",
    type: "cyber-agency"
  },
  {
    name: "CSA Singapore Advisories",
    sourceUrl: "https://www.csa.gov.sg/alerts-advisories/advisories",
    feedUrl: "",
    region: "SG",
    type: "cyber-advisory"
  },
  {
    name: "CISA Cybersecurity Advisories",
    sourceUrl: "https://www.cisa.gov/news-events/cybersecurity-advisories",
    feedUrl: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    region: "US",
    type: "cyber-advisory"
  },
  {
    name: "CISA News & Events",
    sourceUrl: "https://www.cisa.gov/news-events/news",
    feedUrl: "https://www.cisa.gov/news.xml",
    region: "US",
    type: "cyber-news"
  },
  {
    name: "INTERPOL Cybercrime",
    sourceUrl: "https://www.interpol.int/Crimes/Cybercrime",
    feedUrl: "",
    region: "Global",
    type: "law-enforcement"
  },
  {
    name: "Europol Cyber-attacks / EC3",
    sourceUrl: "https://www.europol.europa.eu/crime-areas/cyber-attacks",
    feedUrl: "",
    region: "EU",
    type: "law-enforcement"
  },
  {
    name: "BleepingComputer",
    sourceUrl: "https://www.bleepingcomputer.com/",
    feedUrl: "https://www.bleepingcomputer.com/feed/",
    region: "Global",
    type: "cyber-news"
  },
  {
    name: "The Hacker News",
    sourceUrl: "https://thehackernews.com/",
    feedUrl: "https://feeds.feedburner.com/TheHackersNews",
    region: "Global",
    type: "cyber-news"
  },
  {
    name: "KrebsOnSecurity",
    sourceUrl: "https://krebsonsecurity.com/",
    feedUrl: "https://krebsonsecurity.com/feed/",
    region: "Global",
    type: "investigative"
  },
  {
    name: "The Record by Recorded Future News",
    sourceUrl: "https://therecord.media/",
    feedUrl: "https://therecord.media/feed/",
    region: "Global",
    type: "cyber-news"
  },
  {
    name: "Help Net Security",
    sourceUrl: "https://www.helpnetsecurity.com/",
    feedUrl: "https://www.helpnetsecurity.com/feed/",
    region: "Global",
    type: "cyber-news"
  }
];

// Keywords used by the local classifier. This is transparent enough for class
// presentation and does not depend on paid AI keys. Later, your team can replace
// classifyArticle() with Gemini if desired.
const KEYWORDS_BY_SCAM_TYPE = {
  Phishing: ["phishing", "credential", "login page", "fake login", "spoofed", "email scam", "sms link", "smishing"],
  Pretext: ["pretext", "impersonat", "pretend", "fake officer", "fake bank", "fake agency"],
  "Identity Theft": ["identity theft", "personal data", "passport", "nric", "social security", "id document", "data stolen"],
  "Spear-Phishing": ["spear phishing", "targeted phishing", "business email compromise", "bec", "executive impersonation"],
  Vishing: ["vishing", "phone scam", "call scam", "voice phishing", "robocall"],
  Tailgate: ["tailgating", "physical access", "badge access"],
  "Dumpster Diving": ["dumpster", "discarded documents", "trash"],
  "Shoulder Surfing": ["shoulder surfing", "screen peek", "pin observed"],
  Baiting: ["baiting", "free download", "fake giveaway", "usb drop", "prize scam"],
  Virus: ["virus", "infected"],
  Worm: ["worm", "self-propagating"],
  Rootkit: ["rootkit", "bootkit"],
  Trojan: ["trojan", "banking trojan", "remote access trojan", "rat malware"],
  Adware: ["adware", "malvertising", "pop-up ads"],
  Spyware: ["spyware", "stalkerware", "keylogger", "surveillance malware"],
  Botnet: ["botnet", "ddos", "zombie network"],
  Scareware: ["scareware", "fake antivirus", "fake warning", "tech support scam"],
  "Logic Bomb": ["logic bomb", "time bomb malware"],
  Ransomware: ["ransomware", "encrypted files", "ransom demand", "extortion"],
  "Zero Day": ["zero-day", "zero day", "0-day", "actively exploited vulnerability"]
};

const RELEVANCE_KEYWORDS = [
  "scam", "fraud", "phishing", "cyber", "malware", "ransomware", "impersonation",
  "identity theft", "otp", "singpass", "bank", "parcel", "delivery", "investment",
  "job scam", "romance scam", "vulnerability", "data breach", "credential", "spoof"
];

const ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " "
};

let refreshInFlight = null;

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function ensureEditorialPostsFile() {
  ensureDataDirectory();
  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(getSeedPosts(), null, 2));
  }
}

function ensureArticleCacheFile() {
  ensureDataDirectory();
  if (!fs.existsSync(ARTICLES_FILE)) {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(getSeedArticleCache(), null, 2));
  }
}

function decodeEntities(text = "") {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (_, name) => ENTITY_MAP[name] || `&${name};`);
}

function stripTags(text = "") {
  return decodeEntities(text)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, names) {
  for (const name of names) {
    const direct = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (direct) return stripTags(direct[1]);

    // Atom links often look like <link href="https://..." />
    const href = block.match(new RegExp(`<${name}[^>]*href=["']([^"']+)["'][^>]*>`, "i"));
    if (href) return decodeEntities(href[1]).trim();
  }
  return "";
}

function parseDateMaybe(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function hashId(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 16);
}

function isRelevantArticle(article) {
  const haystack = `${article.title} ${article.summary}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function classifyArticle(article) {
  const haystack = `${article.title} ${article.summary}`.toLowerCase();
  const scamTypes = [];

  for (const [type, keywords] of Object.entries(KEYWORDS_BY_SCAM_TYPE)) {
    if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      scamTypes.push(type);
    }
  }

  // If a relevant article does not trigger a precise type, categorise it under
  // Phishing as the safest broad social-engineering default for scam news.
  if (scamTypes.length === 0 && isRelevantArticle(article)) scamTypes.push("Phishing");

  const riskLevel = scamTypes.includes("Ransomware") || scamTypes.includes("Zero Day")
    ? "high"
    : scamTypes.length >= 3
      ? "high"
      : scamTypes.length >= 1
        ? "medium"
        : "low";

  return {
    scamTypes,
    riskLevel,
    relevanceScore: scamTypes.length + (isRelevantArticle(article) ? 1 : 0)
  };
}

function normaliseArticle(raw, source) {
  const classified = classifyArticle(raw);
  return {
    id: hashId(`${source.name}|${raw.link || raw.title}`),
    title: raw.title || "Untitled cyber/scam article",
    summary: raw.summary || "No summary was provided by the source feed.",
    link: raw.link || source.sourceUrl,
    sourceName: source.name,
    sourceUrl: source.sourceUrl,
    sourceRegion: source.region,
    sourceType: source.type,
    publishedAt: parseDateMaybe(raw.publishedAt).toISOString(),
    fetchedAt: new Date().toISOString(),
    scamTypes: classified.scamTypes,
    riskLevel: classified.riskLevel,
    relevanceScore: classified.relevanceScore
  };
}

function parseFeed(xml, source) {
  const blocks = [
    ...xml.matchAll(/<item[\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)
  ].map((m) => m[0]);

  return blocks.map((block) => {
    const raw = {
      title: extractTag(block, ["title"]),
      link: extractTag(block, ["link", "guid"]),
      summary: extractTag(block, ["description", "summary", "content", "content:encoded"]),
      publishedAt: extractTag(block, ["pubDate", "published", "updated", "dc:date"])
    };
    return normaliseArticle(raw, source);
  });
}

async function fetchTextWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ScamPatrolStudentProject/1.0 (+https://github.com/shaniaong25026302/ScamPatrol)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSource(source) {
  if (!source.feedUrl) {
    return {
      source: source.name,
      ok: false,
      skipped: true,
      reason: "No stable RSS/Atom feed configured for this source yet.",
      articles: []
    };
  }

  try {
    const xml = await fetchTextWithTimeout(source.feedUrl);
    const articles = parseFeed(xml, source).filter(isRelevantArticle);
    return { source: source.name, ok: true, articles };
  } catch (err) {
    return { source: source.name, ok: false, reason: err.message, articles: [] };
  }
}

function readArticleCache() {
  ensureArticleCacheFile();
  return JSON.parse(fs.readFileSync(ARTICLES_FILE, "utf8"));
}

function writeArticleCache(cache) {
  ensureDataDirectory();
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(cache, null, 2));
}

function getSeedArticleCache() {
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  const seed = [
    normaliseArticle({
      title: "Police warn of parcel delivery phishing links during shopping season",
      summary: "Public advisories warn that scammers are sending fake parcel fee messages that lead victims to spoofed payment pages.",
      link: "https://www.police.gov.sg/Advisories/Scams",
      publishedAt: hoursAgo(2)
    }, TRUSTED_SOURCES.find((s) => s.name === "Singapore Police Force — Scams")),
    normaliseArticle({
      title: "ScamShield reminder: never share OTPs or Singpass details through message links",
      summary: "Users are reminded that banks and government agencies will not ask for OTPs, passwords, or Singpass details through unsolicited links.",
      link: "https://www.scamshield.gov.sg/",
      publishedAt: hoursAgo(4)
    }, TRUSTED_SOURCES.find((s) => s.name === "Singapore ScamShield")),
    normaliseArticle({
      title: "CISA adds actively exploited vulnerability to advisory catalogue",
      summary: "Cyber defenders are urged to patch a zero-day vulnerability that is being actively exploited by threat actors.",
      link: "https://www.cisa.gov/news-events/cybersecurity-advisories",
      publishedAt: hoursAgo(7)
    }, TRUSTED_SOURCES.find((s) => s.name === "CISA Cybersecurity Advisories")),
    normaliseArticle({
      title: "BleepingComputer reports ransomware campaign targeting organisations",
      summary: "A ransomware operation is using phishing and trojan malware to gain access before encrypting files.",
      link: "https://www.bleepingcomputer.com/",
      publishedAt: hoursAgo(11)
    }, TRUSTED_SOURCES.find((s) => s.name === "BleepingComputer")),
    normaliseArticle({
      title: "FTC warns consumers about impersonation and fake bank alerts",
      summary: "Consumers are told to verify suspicious bank messages directly through official channels instead of clicking links.",
      link: "https://consumer.ftc.gov/scams",
      publishedAt: hoursAgo(16)
    }, TRUSTED_SOURCES.find((s) => s.name === "FTC Consumer Advice — Scams")),
    normaliseArticle({
      title: "The Hacker News tracks phishing kit used for credential theft",
      summary: "Researchers observed a phishing kit designed to steal usernames, passwords, and session cookies.",
      link: "https://thehackernews.com/",
      publishedAt: hoursAgo(20)
    }, TRUSTED_SOURCES.find((s) => s.name === "The Hacker News"))
  ];

  return {
    articles: seed,
    lastFetchedAt: now.toISOString(),
    sourceRuns: [],
    mode: "seed",
    note: "Seed cache used before the first successful live RSS refresh."
  };
}

function cacheIsFresh(cache) {
  if (!cache.lastFetchedAt) return false;
  if (CACHE_TTL_MS === 0) return false;
  return Date.now() - new Date(cache.lastFetchedAt).getTime() < CACHE_TTL_MS;
}

function dedupeArticles(articles) {
  const seen = new Set();
  const out = [];

  for (const article of articles) {
    const key = article.link || `${article.sourceName}:${article.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(article);
  }

  return out.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

async function refreshArticles({ force = false } = {}) {
  const cache = readArticleCache();

  if (!force && cacheIsFresh(cache)) {
    return { ...cache, refreshed: false };
  }

  // Avoid launching multiple simultaneous feed fetches if several users open
  // Scam Weather at once.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const sourceRuns = await Promise.all(TRUSTED_SOURCES.map(fetchSource));
    const liveArticles = dedupeArticles(sourceRuns.flatMap((run) => run.articles || []));

    const previousArticles = Array.isArray(cache.articles) ? cache.articles : [];
    const combined = dedupeArticles([...liveArticles, ...previousArticles]).slice(0, 120);

    const nextCache = {
      articles: combined.length ? combined : getSeedArticleCache().articles,
      lastFetchedAt: new Date().toISOString(),
      sourceRuns,
      mode: liveArticles.length ? "live+cache" : "cache/fallback",
      note: liveArticles.length
        ? "Live RSS/Atom data was fetched from configured trusted sources."
        : "No live feed returned relevant data; Scam Weather is showing cached/fallback articles."
    };

    writeArticleCache(nextCache);
    refreshInFlight = null;
    return { ...nextCache, refreshed: true };
  })().catch((err) => {
    refreshInFlight = null;
    const fallback = readArticleCache();
    return {
      ...fallback,
      refreshed: false,
      mode: "cache/error",
      note: `Live refresh failed; showing cache. ${err.message}`
    };
  });

  return refreshInFlight;
}

function startBackgroundRefresh() {
  // Fire-and-forget: useful for page render. Errors are swallowed because the
  // page can still show cached news.
  refreshArticles().catch(() => {});
}

function withinLast24Hours(article, now = new Date()) {
  return articleWithinHours(article, 24, now);
}

function articleWithinHours(article, hours, now = new Date()) {
  const published = new Date(article.publishedAt);
  if (Number.isNaN(published.getTime())) return false;
  return now - published <= hours * 60 * 60 * 1000;
}

function articleWithinCurrentMonth(article, now = new Date()) {
  const published = new Date(article.publishedAt);
  if (Number.isNaN(published.getTime())) return false;
  return published.getFullYear() === now.getFullYear() && published.getMonth() === now.getMonth();
}

function getFilteredArticles({ scamType = "all", source = "all" } = {}) {
  const cache = readArticleCache();
  let articles = Array.isArray(cache.articles) ? cache.articles : [];

  if (scamType !== "all") {
    articles = articles.filter((article) => article.scamTypes.includes(scamType));
  }

  if (source !== "all") {
    articles = articles.filter((article) => article.sourceName === source);
  }

  return {
    cache,
    articles: dedupeArticles(articles)
  };
}

function decorateNewsArticle(article, now = new Date()) {
  const isFresh24h = withinLast24Hours(article, now);
  return {
    ...article,
    // Used by the UI to be honest about freshness. The article is still from a
    // reputable configured source; it is simply older than today's window.
    freshnessLabel: isFresh24h ? "Last 24h" : "Trusted recent fallback",
    isFresh24h
  };
}

function getArticlesFromCache({ page = 1, limit = 6, scamType = "all", source = "all" } = {}) {
  const { cache, articles } = getFilteredArticles({ scamType, source });
  const now = new Date();

  // Scam News should not look empty just because fewer than 6 trusted sources
  // published scam/cyber articles today. The policy is:
  // 1. Prefer articles from the last 24 hours.
  // 2. If fewer than the requested limit exist, backfill with the latest older
  //    articles from the same trusted source pool and selected filters.
  // 3. Label backfilled items clearly so users are not misled.
  const fresh24h = articles.filter((article) => withinLast24Hours(article, now));
  const olderTrusted = articles.filter((article) => !withinLast24Hours(article, now));
  const orderedArticles = dedupeArticles([...fresh24h, ...olderTrusted]);

  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.max(1, Number(limit));
  const total = orderedArticles.length;
  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  const pageArticles = orderedArticles.slice(start, end).map((article) => decorateNewsArticle(article, now));

  return {
    articles: pageArticles,
    total,
    page: safePage,
    limit: safeLimit,
    hasMore: end < total,
    freshnessPolicy: "prefer-24h-backfill-latest-trusted",
    recent24hCount: fresh24h.length,
    backfilledCount: pageArticles.filter((article) => !article.isFresh24h).length,
    cacheMeta: {
      lastFetchedAt: cache.lastFetchedAt,
      mode: cache.mode,
      note: cache.note
    }
  };
}

function getArticlesForReportWindow({ label, candidates, fallbackSteps, maxArticles = 12, now = new Date() }) {
  // A report should always explain what window it used. This avoids the bad
  // engineering choice of silently pretending old articles are "today's" news.
  for (const step of fallbackSteps) {
    const picked = candidates.filter(step.predicate).slice(0, maxArticles);
    if (picked.length > 0) {
      return {
        reportArticles: picked,
        windowLabel: step.label,
        fallbackReason: step.fallbackReason || "Fresh trusted-source data was available."
      };
    }
  }

  const fallback = candidates.slice(0, maxArticles);
  return {
    reportArticles: fallback,
    windowLabel: "Latest trusted cached articles",
    fallbackReason: fallback.length
      ? `No ${label} articles were available in the preferred windows, so this report uses the latest reputable cached items.`
      : `No trusted articles are currently cached for ${label}; use the seasonal advice panel until feeds refresh.`
  };
}

function summariseReportArticles(reportArticles) {
  const sourceCounts = {};
  const scamTypeCounts = {};
  const riskCounts = { high: 0, medium: 0, low: 0 };

  for (const article of reportArticles) {
    sourceCounts[article.sourceName] = (sourceCounts[article.sourceName] || 0) + 1;
    riskCounts[article.riskLevel] = (riskCounts[article.riskLevel] || 0) + 1;

    for (const type of article.scamTypes) {
      scamTypeCounts[type] = (scamTypeCounts[type] || 0) + 1;
    }
  }

  const sortedTypes = Object.entries(scamTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const sortedSources = Object.entries(sourceCounts)
    .map(([sourceName, count]) => ({ sourceName, count }))
    .sort((a, b) => b.count - a.count || a.sourceName.localeCompare(b.sourceName));

  return {
    sortedTypes,
    sortedSources,
    riskCounts,
    leadingType: sortedTypes[0] || { type: "No strong signal", count: 0 },
    leadingRisk: riskCounts.high > 0 ? "high" : riskCounts.medium > 0 ? "medium" : "low"
  };
}

function buildReportPayload({ reportKind, windowLabel, fallbackReason, reportArticles, cache }) {
  const summary = summariseReportArticles(reportArticles);

  return {
    reportKind,
    generatedAt: new Date().toISOString(),
    windowLabel,
    fallbackReason,
    totalArticles: reportArticles.length,
    leadingType: summary.leadingType,
    leadingRisk: summary.leadingRisk,
    typeCounts: summary.sortedTypes,
    sourceCounts: summary.sortedSources,
    riskCounts: summary.riskCounts,
    articlesUsed: reportArticles.map((article) => ({
      id: article.id,
      title: article.title,
      link: article.link,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      scamTypes: article.scamTypes,
      riskLevel: article.riskLevel,
      freshnessLabel: withinLast24Hours(article) ? "Last 24h" : "Trusted recent fallback"
    })),
    cacheMeta: {
      lastFetchedAt: cache.lastFetchedAt,
      mode: cache.mode,
      note: cache.note
    }
  };
}

function buildDailyReport() {
  const cache = readArticleCache();
  const now = new Date();
  const candidates = dedupeArticles(cache.articles || []);

  const { reportArticles, windowLabel, fallbackReason } = getArticlesForReportWindow({
    label: "daily report",
    candidates,
    now,
    maxArticles: 12,
    fallbackSteps: [
      {
        label: "Last 24 hours",
        predicate: (article) => articleWithinHours(article, 24, now),
        fallbackReason: "Using trusted articles published in the last 24 hours."
      },
      {
        label: "Last 7 days",
        predicate: (article) => articleWithinHours(article, 24 * 7, now),
        fallbackReason: "Not enough/no trusted articles appeared in the last 24 hours, so the Daily Report widened to the last 7 days."
      },
      {
        label: "Last 30 days",
        predicate: (article) => articleWithinHours(article, 24 * 30, now),
        fallbackReason: "No useful trusted articles appeared in the last 24 hours or 7 days, so the Daily Report widened to the last 30 days."
      }
    ]
  });

  return buildReportPayload({
    reportKind: "daily",
    windowLabel,
    fallbackReason,
    reportArticles,
    cache
  });
}

function buildMonthlyReport() {
  const cache = readArticleCache();
  const now = new Date();
  const candidates = dedupeArticles(cache.articles || []);

  const { reportArticles, windowLabel, fallbackReason } = getArticlesForReportWindow({
    label: "monthly report",
    candidates,
    now,
    maxArticles: 18,
    fallbackSteps: [
      {
        label: "Current month",
        predicate: (article) => articleWithinCurrentMonth(article, now),
        fallbackReason: "Using trusted articles published during the current calendar month."
      },
      {
        label: "Last 30 days",
        predicate: (article) => articleWithinHours(article, 24 * 30, now),
        fallbackReason: "No trusted articles were found in the current calendar month, so the Monthly Report widened to the last 30 days."
      },
      {
        label: "Last 90 days",
        predicate: (article) => articleWithinHours(article, 24 * 90, now),
        fallbackReason: "Not enough monthly data was available, so the Monthly Report widened to the last 90 days."
      }
    ]
  });

  const season = getCurrentSeasonRule(now);
  const payload = buildReportPayload({
    reportKind: "monthly",
    windowLabel,
    fallbackReason,
    reportArticles,
    cache
  });

  return {
    ...payload,
    seasonalBackup: {
      label: season.label,
      headline: season.headline,
      advice: season.advice
    }
  };
}

function getCurrentSeasonRule(date = new Date()) {
  const currentMonth = date.getMonth() + 1;
  return SEASONAL_RULES.find((rule) => rule.months.includes(currentMonth)) || SEASONAL_RULES[0];
}

function getForecast() {
  const season = getCurrentSeasonRule();
  const news = getArticlesFromCache({ limit: 3 }).articles;

  return {
    season,
    latestNews: news,
    dailyReport: buildDailyReport(),
    updatedAt: new Date().toISOString()
  };
}

function getScamWeatherPageData({ selectedScamType = "all", selectedSource = "all" } = {}) {
  ensureArticleCacheFile();
  ensureEditorialPostsFile();

  return {
    forecast: getForecast(),
    news: getArticlesFromCache({
      page: 1,
      limit: 6,
      scamType: selectedScamType,
      source: selectedSource
    }),
    editorialPosts: getPosts("all"),
    trustedSources: TRUSTED_SOURCES,
    scamTypes: SCAM_TYPES,
    selectedScamType,
    selectedSource
  };
}

// -----------------------------------------------------------------------------
// Admin/editorial post helpers.
// These keep the previous manual Scam Weather feature working while the new
// automated news layer sits beside it.
// -----------------------------------------------------------------------------

function getSeedPosts() {
  const now = new Date().toISOString();
  return [
    {
      id: 1,
      title: "Festive period: parcel scam alerts",
      category: "advice",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80",
      caption: "Watch out for fake parcel fee messages during shopping seasons.",
      body: "Scammers often send SMS or chat messages claiming that a parcel is stuck until a small delivery fee is paid. Always check your order inside the official shopping or courier app instead of trusting random links.",
      authorId: 1,
      authorName: "Liam",
      createdAt: now,
      updatedAt: now
    },
    {
      id: 2,
      title: "Tax season: IRAS impersonation warning",
      category: "news",
      mediaType: "none",
      mediaUrl: "",
      caption: "Seasonal reminder: tax/refund scams can become more believable around filing periods.",
      body: "During tax-related periods, scam messages may pretend to be from official agencies. They may claim you owe money or are due a refund. Do not click suspicious links or provide Singpass, OTP, or banking details.",
      authorId: 1,
      authorName: "Liam",
      createdAt: now,
      updatedAt: now
    }
  ];
}

function readPosts() {
  ensureEditorialPostsFile();
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
}

function writePosts(posts) {
  ensureDataDirectory();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function getPosts(category = "all") {
  const posts = readPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (category === "news" || category === "advice") {
    return posts.filter((post) => post.category === category);
  }

  return posts;
}

function getPostById(id) {
  return readPosts().find((post) => String(post.id) === String(id));
}

function cleanPostInput(body) {
  return {
    title: String(body.title || "").trim(),
    category: POST_CATEGORIES.includes(body.category) ? body.category : "advice",
    mediaType: ["none", "image", "video"].includes(body.mediaType) ? body.mediaType : "none",
    mediaUrl: String(body.mediaUrl || "").trim(),
    caption: String(body.caption || "").trim(),
    body: String(body.body || "").trim()
  };
}

function validatePostInput(postInput) {
  if (!postInput.title) return "Title is required.";
  if (!postInput.body) return "Post body is required.";

  if (postInput.mediaType !== "none" && !postInput.mediaUrl) {
    return "Please provide an image/video URL, or set media type to None.";
  }

  return null;
}

function createPost(currentUser, body) {
  const postInput = cleanPostInput(body);
  const error = validatePostInput(postInput);
  if (error) return { success: false, message: error };

  const posts = readPosts();
  const nextId = posts.length ? Math.max(...posts.map((post) => Number(post.id))) + 1 : 1;
  const now = new Date().toISOString();

  const post = {
    id: nextId,
    ...postInput,
    authorId: currentUser.id,
    authorName: currentUser.username,
    createdAt: now,
    updatedAt: now
  };

  posts.push(post);
  writePosts(posts);

  return { success: true, post };
}

function canEditPost(currentUser, post) {
  if (!currentUser || !post) return false;

  // Admins can manage Scam Weather because the page is admin-updated.
  // The author check is kept so this file remains future-proof if your team
  // later allows trusted non-admin contributors.
  return currentUser.isAdmin || String(currentUser.id) === String(post.authorId);
}

function updatePost(currentUser, id, body) {
  const posts = readPosts();
  const index = posts.findIndex((post) => String(post.id) === String(id));
  if (index === -1) return { success: false, message: "Post not found." };

  if (!canEditPost(currentUser, posts[index])) {
    return { success: false, message: "You can only edit your own Scam Weather posts." };
  }

  const postInput = cleanPostInput(body);
  const error = validatePostInput(postInput);
  if (error) return { success: false, message: error };

  posts[index] = {
    ...posts[index],
    ...postInput,
    updatedAt: new Date().toISOString()
  };

  writePosts(posts);
  return { success: true, post: posts[index] };
}

function deletePost(currentUser, id) {
  const posts = readPosts();
  const post = posts.find((item) => String(item.id) === String(id));
  if (!post) return { success: false, message: "Post not found." };

  if (!canEditPost(currentUser, post)) {
    return { success: false, message: "You can only delete your own Scam Weather posts." };
  }

  writePosts(posts.filter((item) => String(item.id) !== String(id)));
  return { success: true };
}

// Seasonal rules are intentionally centralised so classmates can tweak the
// forecast without digging through route code.
const SEASONAL_RULES = [
  {
    months: [2, 3, 4],
    label: "Tax season watch",
    riskLevel: "High",
    headline: "IRAS and tax refund impersonation attempts may increase.",
    advice: [
      "Do not trust links claiming urgent tax refunds or penalties.",
      "Type official government URLs manually instead of clicking message links.",
      "Never share Singpass, bank OTPs, or card details through chat links."
    ]
  },
  {
    months: [11, 12, 1],
    label: "Festive parcel season",
    riskLevel: "High",
    headline: "Parcel delivery, shopping, and fake promotion scams are more likely.",
    advice: [
      "Verify delivery messages through the official shopping app or courier site.",
      "Be suspicious of tiny unpaid-fee links for parcels you did not expect.",
      "Avoid deals that pressure you to pay immediately outside the platform."
    ]
  },
  {
    months: [5, 6, 7, 8],
    label: "Mid-year opportunity scams",
    riskLevel: "Medium",
    headline: "Job, internship, tuition, and travel scams may appear more often.",
    advice: [
      "Check company domains and official job portals before sending details.",
      "Avoid jobs that require upfront payment or bank transfers to begin work.",
      "Confirm travel deals directly with official providers before paying."
    ]
  },
  {
    months: [9, 10],
    label: "Shopping campaign watch",
    riskLevel: "Medium",
    headline: "Fake vouchers and marketplace payment scams may rise during sales periods.",
    advice: [
      "Stay inside trusted marketplaces instead of moving to private payment links.",
      "Check seller history and reviews before paying.",
      "Be careful with QR codes claiming limited-time discounts."
    ]
  }
];

module.exports = {
  POST_CATEGORIES,
  SCAM_TYPES,
  TRUSTED_SOURCES,
  getForecast,
  getScamWeatherPageData,
  getArticlesFromCache,
  refreshArticles,
  startBackgroundRefresh,
  buildDailyReport,
  buildMonthlyReport,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  canEditPost
};
// <Liam Member 5 End>
