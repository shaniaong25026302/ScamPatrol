// <Liam Member 5 Daily Quiz Start>
// src/services/dailyquiz.service.js
// -----------------------------------------------------------------------------
// Daily Quiz service
// -----------------------------------------------------------------------------
// This feature is intentionally based on Scam Weather:
// 1. Scam Weather already pulls/caches reputable scam/cyber articles.
// 2. Daily Quiz reuses that trusted article pool instead of asking an admin to
//    write quiz questions manually.
// 3. A deterministic daily seed means all users see the same 10-question quiz
//    for the day, while each user's answer progress is saved separately.
// 4. Rewards are awarded only once, when the user completes all 10 questions.
//
// Current persistence choice:
// - Questions and progress are saved in JSON files under src/data so the feature
//   works immediately in the student demo without requiring a fresh DB migration.
// - Future MySQL table definitions are documented in db/schema.sql.
// -----------------------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const scamWeather = require("./scamweather.service");
const Game = require("../models/game.model");
const gamification = require("./gamification.service");

const DATA_DIR = path.join(__dirname, "..", "data");
const QUIZ_CACHE_FILE = path.join(DATA_DIR, "dailyQuizQuestions.json");
const PROGRESS_FILE = path.join(DATA_DIR, "dailyQuizProgress.json");
const QUESTIONS_PER_DAY = 10;

// Question rewards are deliberately centralised for easy presentation.
// The final reward scales with the user's score, satisfying the requirement that
// better quiz performance gives more coins + EXP.
const REWARD_RULES = {
  xpPerCorrect: 10,
  coinsPerCorrect: 5,
  completionBonusXp: 20,
  completionBonusCoins: 10
};

const PRECAUTIONS_BY_TYPE = {
  Phishing: "Verify the sender and type the official website manually instead of clicking message links.",
  Pretext: "Pause and verify the caller or sender through an official channel before giving information.",
  "Identity Theft": "Never share NRIC, passport, Singpass, OTP, or card details through unsolicited messages.",
  "Spear-Phishing": "Be extra careful with targeted messages that mention your school, workplace, role, or recent activity.",
  Vishing: "Hang up and call the organisation using the official phone number from its website or app.",
  Tailgate: "Do not let unknown people follow you into restricted areas without proper verification.",
  "Dumpster Diving": "Shred sensitive papers and avoid throwing passwords or account details into ordinary bins.",
  "Shoulder Surfing": "Cover your screen or keypad when entering passwords, PINs, or OTPs in public.",
  Baiting: "Do not plug in unknown USB drives or trust free downloads/giveaways from random links.",
  Virus: "Keep devices patched and avoid running suspicious attachments or executable files.",
  Worm: "Patch systems quickly and avoid leaving devices exposed with weak network settings.",
  Rootkit: "Use trusted security tools and rebuild infected systems when deep system compromise is suspected.",
  Trojan: "Download software only from official sources and be suspicious of cracked apps or fake installers.",
  Adware: "Avoid bundled installers and remove suspicious browser extensions or pop-up-heavy apps.",
  Spyware: "Review app permissions and avoid installing tools that ask for unnecessary access.",
  Botnet: "Secure routers and IoT devices with updates and strong unique passwords.",
  Scareware: "Do not pay or call numbers shown by pop-up warnings; close the page and run a trusted scan.",
  "Logic Bomb": "Limit privileged access and review suspicious scheduled tasks or unauthorised scripts.",
  Ransomware: "Keep offline backups, patch quickly, and do not open suspicious attachments.",
  "Zero Day": "Apply vendor mitigations quickly and watch official advisories until a patch is available."
};

const WRONG_PRECAUTIONS = [
  "Forward the suspicious link to more friends so they can judge whether it is real.",
  "Reply quickly with your OTP so the request does not expire.",
  "Install the unknown attachment first and delete it later if it seems suspicious.",
  "Trust the message if the logo looks correct and the sender sounds urgent.",
  "Move the conversation to a private payment link to complete the deal faster.",
  "Share your password once and change it only if something bad happens.",
  "Ignore official channels and rely on the link sent in the message.",
  "Disable security alerts so the pop-ups stop interrupting your work."
];

const GENERIC_SCAM_TYPES = [
  "Phishing",
  "Pretext",
  "Identity Theft",
  "Spear-Phishing",
  "Vishing",
  "Baiting",
  "Trojan",
  "Spyware",
  "Ransomware",
  "Zero Day"
];

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(QUIZ_CACHE_FILE)) {
    fs.writeFileSync(QUIZ_CACHE_FILE, JSON.stringify({ quizzes: {} }, null, 2));
  }
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ attempts: {} }, null, 2));
  }
}

function readJson(file, fallback) {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function localDateKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hash(input, length = 16) {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, length);
}

function seededNumber(seed) {
  // Simple deterministic pseudo-random number between 0 and 1.
  const h = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return parseInt(h, 16) / 0xffffffffffff;
}

function seededPick(list, seed, fallback = null) {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  const idx = Math.floor(seededNumber(seed) * list.length) % list.length;
  return list[idx];
}

function seededShuffle(list, seed) {
  const copy = [...list];
  copy.sort((a, b) => seededNumber(`${seed}:${a}`) - seededNumber(`${seed}:${b}`));
  return copy;
}

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function shortSnippet(value = "", max = 210) {
  const clean = cleanText(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function articleLooksScamCase(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  return [
    "scam", "fraud", "phishing", "impersonat", "ransomware", "malware", "stolen",
    "victim", "campaign", "warning", "warn", "alert", "fake", "theft", "credential",
    "bank", "parcel", "romance", "investment", "job scam"
  ].some((keyword) => text.includes(keyword));
}

function getArticlePool() {
  const news = scamWeather.getArticlesFromCache({ page: 1, limit: 80, scamType: "all", source: "all" });
  const articles = Array.isArray(news.articles) ? news.articles : [];
  const scamCaseArticles = articles.filter(articleLooksScamCase);
  return (scamCaseArticles.length >= 3 ? scamCaseArticles : articles).slice(0, 60);
}

function getTypePool(articlePool) {
  const fromArticles = articlePool.flatMap((article) => article.scamTypes || []);
  const unique = [...new Set([...fromArticles, ...GENERIC_SCAM_TYPES])];
  return unique.length ? unique : GENERIC_SCAM_TYPES;
}

function makeOptions({ correct, pool, seed, size = 4 }) {
  const cleanedCorrect = cleanText(correct);
  const candidates = [...new Set((pool || []).map(cleanText).filter(Boolean))]
    .filter((item) => item.toLowerCase() !== cleanedCorrect.toLowerCase());
  const shuffled = seededShuffle(candidates, `${seed}:distractors`).slice(0, Math.max(0, size - 1));
  const options = seededShuffle([cleanedCorrect, ...shuffled].slice(0, size), `${seed}:options`);

  // If the pool was tiny, pad with generic but clearly different choices.
  while (options.length < size) {
    const filler = `None of the above ${options.length}`;
    if (!options.includes(filler)) options.push(filler);
  }

  return {
    options,
    correctIndex: options.findIndex((option) => option === cleanedCorrect)
  };
}

function mostCommonType(articlePool) {
  const counts = {};
  for (const article of articlePool) {
    for (const type of article.scamTypes || []) counts[type] = (counts[type] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return sorted[0] ? { type: sorted[0][0], count: sorted[0][1] } : { type: "Phishing", count: 0 };
}

function countFresh24h(articlePool) {
  const now = Date.now();
  return articlePool.filter((article) => {
    const published = new Date(article.publishedAt).getTime();
    return !Number.isNaN(published) && now - published <= 24 * 60 * 60 * 1000;
  }).length;
}

function buildTypeQuestion(article, index, dateKey, typePool) {
  const correct = (article.scamTypes && article.scamTypes[0]) || "Phishing";
  const seed = `${dateKey}:type:${index}:${article.id}`;
  const { options, correctIndex } = makeOptions({ correct, pool: typePool, seed });
  return {
    id: `dq-${dateKey}-${index + 1}-${hash(`${article.id}:type:${index}`, 8)}`,
    kind: "scam-type",
    prompt: "Based on this Scam News article, which scam/cyber threat type fits best?",
    articleTitle: article.title,
    articleSnippet: shortSnippet(article.summary),
    articleLink: article.link,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    options,
    correctIndex,
    explanation: `This article was classified as ${correct} by the same keyword-scoring logic used by Scam Weather. Source: ${article.sourceName}.`
  };
}

function buildPrecautionQuestion(article, index, dateKey, typePool) {
  const type = (article.scamTypes && article.scamTypes[0]) || "Phishing";
  const correct = PRECAUTIONS_BY_TYPE[type] || PRECAUTIONS_BY_TYPE.Phishing;
  const seed = `${dateKey}:precaution:${index}:${article.id}`;
  const { options, correctIndex } = makeOptions({
    correct,
    pool: [...WRONG_PRECAUTIONS, ...Object.values(PRECAUTIONS_BY_TYPE)],
    seed
  });
  return {
    id: `dq-${dateKey}-${index + 1}-${hash(`${article.id}:precaution:${index}`, 8)}`,
    kind: "precaution",
    prompt: `Which precaution best matches the ${type} risk described in this article?`,
    articleTitle: article.title,
    articleSnippet: shortSnippet(article.summary),
    articleLink: article.link,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    options,
    correctIndex,
    explanation: `${type} is best handled by this precaution because it reduces the chance of trusting fake links, identities, files, or urgent requests.`
  };
}

function buildSourceQuestion(article, index, dateKey, articlePool) {
  const correct = article.sourceName || "Trusted source";
  const pool = [...new Set(articlePool.map((a) => a.sourceName).filter(Boolean))];
  const seed = `${dateKey}:source:${index}:${article.id}`;
  const { options, correctIndex } = makeOptions({ correct, pool, seed });
  return {
    id: `dq-${dateKey}-${index + 1}-${hash(`${article.id}:source:${index}`, 8)}`,
    kind: "source",
    prompt: "Which trusted source did Scam Weather use for this article?",
    articleTitle: article.title,
    articleSnippet: shortSnippet(article.summary),
    articleLink: article.link,
    sourceName: article.sourceName,
    publishedAt: article.publishedAt,
    options,
    correctIndex,
    explanation: `The article card in Scam News traces this item back to ${correct}. Daily Quiz keeps that source visible for trust and presentation transparency.`
  };
}

function buildStatisticQuestion(articlePool, index, dateKey) {
  const signal = mostCommonType(articlePool);
  const pool = getTypePool(articlePool);
  const seed = `${dateKey}:stat:${index}:${signal.type}`;
  const { options, correctIndex } = makeOptions({ correct: signal.type, pool, seed });
  return {
    id: `dq-${dateKey}-${index + 1}-${hash(`${signal.type}:stat:${index}`, 8)}`,
    kind: "statistic",
    prompt: "According to today's Scam News article pool, which scam type appears most often?",
    articleTitle: "Scam Weather data signal",
    articleSnippet: `Daily Quiz counted scam-type labels across ${articlePool.length} trusted articles cached by Scam Weather.`,
    articleLink: "/scam-weather",
    sourceName: "Scam Weather automation",
    publishedAt: new Date().toISOString(),
    options,
    correctIndex,
    explanation: `${signal.type} appeared ${signal.count} time(s) in the current trusted article pool used by Scam Weather.`
  };
}

function buildFreshnessQuestion(articlePool, index, dateKey) {
  const freshCount = countFresh24h(articlePool);
  const correct = String(freshCount);
  const guesses = [0, 1, 2, 3, 4, 5, 6, Math.max(0, freshCount - 1), freshCount + 1]
    .map(String);
  const seed = `${dateKey}:fresh:${index}:${freshCount}`;
  const { options, correctIndex } = makeOptions({ correct, pool: guesses, seed });
  return {
    id: `dq-${dateKey}-${index + 1}-${hash(`${freshCount}:fresh:${index}`, 8)}`,
    kind: "statistic",
    prompt: "How many articles in today's Scam News pool were published within the last 24 hours?",
    articleTitle: "Scam Weather freshness policy",
    articleSnippet: "Scam Weather prefers 24-hour articles, then backfills with the latest older trusted articles so the page never looks empty.",
    articleLink: "/scam-weather",
    sourceName: "Scam Weather automation",
    publishedAt: new Date().toISOString(),
    options,
    correctIndex,
    explanation: `${freshCount} article(s) in the current quiz pool are within the last 24 hours. Older trusted items are allowed as fallback.`
  };
}

function fallbackArticle() {
  return {
    id: "daily-quiz-fallback",
    title: "ScamShield reminder: never share OTPs or Singpass details through message links",
    summary: "Users are reminded that banks and government agencies will not ask for OTPs, passwords, or Singpass details through unsolicited links.",
    link: "https://www.scamshield.gov.sg/",
    sourceName: "Singapore ScamShield",
    publishedAt: new Date().toISOString(),
    scamTypes: ["Phishing", "Identity Theft"],
    riskLevel: "medium"
  };
}

function generateQuizForDate(dateKey) {
  const articlePool = getArticlePool();
  const sourceArticles = articlePool.length ? articlePool : scamWeather.getForecast().latestNews;
  const articles = sourceArticles.length ? sourceArticles : [fallbackArticle()];
  const typePool = getTypePool(articles);
  const questions = [];

  // Two dataset/stat questions make the quiz feel "daily" and article-driven,
  // while the remaining eight questions are tied directly to Scam News articles.
  questions.push(buildStatisticQuestion(articles, 0, dateKey));
  questions.push(buildFreshnessQuestion(articles, 1, dateKey));

  for (let i = questions.length; i < QUESTIONS_PER_DAY; i += 1) {
    const article = seededPick(articles, `${dateKey}:article:${i}`, articles[i % articles.length]);
    const pattern = i % 3;
    if (pattern === 0) questions.push(buildTypeQuestion(article, i, dateKey, typePool));
    else if (pattern === 1) questions.push(buildPrecautionQuestion(article, i, dateKey, typePool));
    else questions.push(buildSourceQuestion(article, i, dateKey, articles));
  }

  return {
    date: dateKey,
    generatedAt: new Date().toISOString(),
    sourcePolicy: "Generated automatically from Scam Weather Scam News trusted articles.",
    totalQuestions: QUESTIONS_PER_DAY,
    questions: questions.slice(0, QUESTIONS_PER_DAY)
  };
}

function ensureQuizForDate(dateKey = localDateKey()) {
  const cache = readJson(QUIZ_CACHE_FILE, { quizzes: {} });
  if (!cache.quizzes) cache.quizzes = {};

  if (!cache.quizzes[dateKey] || !Array.isArray(cache.quizzes[dateKey].questions) || cache.quizzes[dateKey].questions.length !== QUESTIONS_PER_DAY) {
    cache.quizzes[dateKey] = generateQuizForDate(dateKey);
    writeJson(QUIZ_CACHE_FILE, cache);
  }

  return cache.quizzes[dateKey];
}

async function prepareTodayQuiz({ forceRefresh = false } = {}) {
  // Reuse Scam Weather's refresh strategy. If live feeds are down, Scam Weather
  // already falls back to cached/seed articles, so the quiz still works for demos.
  await scamWeather.refreshArticles({ force: forceRefresh }).catch(() => null);
  return ensureQuizForDate(localDateKey());
}

function getAttempt(dateKey, userId) {
  const progress = readJson(PROGRESS_FILE, { attempts: {} });
  const key = `${dateKey}:${userId}`;
  return progress.attempts[key] || null;
}

function saveAttempt(dateKey, userId, attempt) {
  const progress = readJson(PROGRESS_FILE, { attempts: {} });
  if (!progress.attempts) progress.attempts = {};
  progress.attempts[`${dateKey}:${userId}`] = attempt;
  writeJson(PROGRESS_FILE, progress);
  return attempt;
}

function ensureAttempt(dateKey, userId) {
  let attempt = getAttempt(dateKey, userId);
  if (attempt) return attempt;

  attempt = {
    date: dateKey,
    userId: String(userId),
    startedAt: new Date().toISOString(),
    completedAt: null,
    answers: [],
    score: 0,
    reward: null
  };
  return saveAttempt(dateKey, userId, attempt);
}

function sanitiseQuestion(question) {
  const { correctIndex, explanation, ...safe } = question;
  return safe;
}

function statusFromAttempt(quiz, attempt) {
  const answeredCount = attempt ? attempt.answers.length : 0;
  const completed = Boolean(attempt && attempt.completedAt);
  const state = completed ? "completed" : answeredCount > 0 ? "in-progress" : "ready";

  return {
    date: quiz.date,
    state,
    completed,
    canTake: !completed,
    totalQuestions: quiz.totalQuestions,
    answeredCount,
    remainingCount: Math.max(0, quiz.totalQuestions - answeredCount),
    score: attempt ? attempt.score : 0,
    reward: attempt ? attempt.reward : null,
    navLabel: state === "completed" ? "Daily Quiz ✓" : state === "in-progress" ? "Daily Quiz …" : "Daily Quiz ✨",
    navTitle: state === "completed"
      ? "Today's quiz is already completed. Come back tomorrow."
      : state === "in-progress"
        ? "Daily Quiz is unfinished. Continue your 10-question run."
        : "New Daily Quiz ready: 10 scam-news questions."
  };
}

function getStatus(userId, dateKey = localDateKey()) {
  // Navbar status should be lightweight and should not accidentally freeze the
  // day's generated questions before Scam Weather has had a chance to refresh.
  // If today's quiz has not been generated yet, use a small placeholder shape.
  const cache = readJson(QUIZ_CACHE_FILE, { quizzes: {} });
  const quiz = (cache.quizzes && cache.quizzes[dateKey]) || {
    date: dateKey,
    totalQuestions: QUESTIONS_PER_DAY
  };
  const attempt = getAttempt(dateKey, userId);
  return statusFromAttempt(quiz, attempt);
}

async function getTodayForUser(userId, { forceRefresh = false } = {}) {
  const quiz = await prepareTodayQuiz({ forceRefresh });
  const attempt = ensureAttempt(quiz.date, userId);
  const status = statusFromAttempt(quiz, attempt);

  return {
    ...status,
    generatedAt: quiz.generatedAt,
    sourcePolicy: quiz.sourcePolicy,
    questions: quiz.questions.map(sanitiseQuestion),
    answers: attempt.answers,
    nextQuestionIndex: Math.min(attempt.answers.length, quiz.totalQuestions - 1)
  };
}

function calculateReward(score) {
  const gainedXp = score * REWARD_RULES.xpPerCorrect + REWARD_RULES.completionBonusXp;
  const gainedCoins = score * REWARD_RULES.coinsPerCorrect + REWARD_RULES.completionBonusCoins;
  return { gainedXp, gainedCoins };
}

async function awardCompletionReward(userId, score) {
  const { gainedXp, gainedCoins } = calculateReward(score);

  await Game.ensureProfile(userId);
  await Game.addXp(userId, gainedXp, gainedCoins);
  await Game.logEvent(userId, "daily_quiz_completed", gainedXp, gainedCoins);
  if (score === QUESTIONS_PER_DAY) {
    await Game.logEvent(userId, "daily_quiz_perfect", 0, 0);
  }
  await Game.recordScore(userId, "daily_quiz", score);

  let profile = await Game.getProfile(userId);
  const info = gamification.levelInfo(profile.xp);
  const leveledUp = info.level !== profile.level;
  if (leveledUp) await Game.setLevel(userId, info.level);
  profile = { ...profile, level: info.level };
  const newBadges = await gamification.checkBadges(userId, profile);

  return {
    action: "daily_quiz_completed",
    label: "Daily Quiz completed",
    gainedXp,
    gainedCoins,
    level: info.level,
    rank: info.rank,
    leveledUp,
    newBadges
  };
}

async function answerQuestion(userId, questionId, selectedIndex) {
  const quiz = ensureQuizForDate(localDateKey());
  const attempt = ensureAttempt(quiz.date, userId);

  if (attempt.completedAt) {
    return {
      ok: false,
      status: 409,
      error: "Today's Daily Quiz is already completed. Come back tomorrow for a new one.",
      quizStatus: statusFromAttempt(quiz, attempt)
    };
  }

  const nextIndex = attempt.answers.length;
  const question = quiz.questions[nextIndex];
  if (!question || question.id !== questionId) {
    return {
      ok: false,
      status: 400,
      error: "Please answer the current quiz question in order. Refresh the quiz page if your screen is out of sync.",
      quizStatus: statusFromAttempt(quiz, attempt)
    };
  }

  const chosen = Number(selectedIndex);
  if (!Number.isInteger(chosen) || chosen < 0 || chosen >= question.options.length) {
    return { ok: false, status: 400, error: "Please choose one of the answer options." };
  }

  const correct = chosen === question.correctIndex;
  const answerRecord = {
    questionId,
    selectedIndex: chosen,
    correctIndex: question.correctIndex,
    correct,
    answeredAt: new Date().toISOString(),
    explanation: question.explanation
  };

  attempt.answers.push(answerRecord);
  if (correct) attempt.score += 1;

  let reward = null;
  if (attempt.answers.length >= quiz.totalQuestions) {
    attempt.completedAt = new Date().toISOString();
    reward = await awardCompletionReward(userId, attempt.score);
    attempt.reward = reward;
  }

  saveAttempt(quiz.date, userId, attempt);

  return {
    ok: true,
    result: answerRecord,
    correctAnswer: question.options[question.correctIndex],
    selectedAnswer: question.options[chosen],
    quizStatus: statusFromAttempt(quiz, attempt),
    reward
  };
}

module.exports = {
  QUESTIONS_PER_DAY,
  REWARD_RULES,
  localDateKey,
  getStatus,
  getTodayForUser,
  answerQuestion,
  prepareTodayQuiz,
  ensureQuizForDate
};
// <Liam Member 5 Daily Quiz End>
