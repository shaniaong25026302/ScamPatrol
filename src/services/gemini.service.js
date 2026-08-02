// <Shania Start>
// src/services/gemini.service.js — Google Gemini scam analysis via @google/genai.
// Returns { risk_level: 'low'|'medium'|'high', explanation, signals[] }.
const { GoogleGenAI, Type } = require("@google/genai");
const crypto = require("crypto");

// ── Surviving the free tier ───────────────────────────────────────────────────
// The free Gemini quota ran out during a presentation once and the AI features could
// not be shown at all. Quota is scoped per PROJECT and per MODEL, which gives exactly
// two independent ways to get more of it: more keys, from different projects, and more
// models. Both are lists here. Both fall back to the old single-value names, so an
// existing .env keeps working untouched.
const KEYS = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MODELS = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || "gemini-2.5-flash")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MODEL = MODELS[0];
const RISK_LEVELS = ["low", "medium", "high"];

const clients = new Map(); // key -> one reused client
// Parked combinations, keyed on MODEL + KEY together rather than on the key alone.
// That pairing is the whole point: quota is scoped per project and per model, so a key
// that is spent on one model may still have a full allowance on another. Cooling the
// key by itself would park it everywhere at once and the model fallback below could
// never run, which is exactly the bug this started out with.
const cooling = new Map(); // "model::key" -> time until which we skip that combination
const cache = new Map(); // hash(request) -> { value, until }

// A 429 on the free tier usually means the DAILY allowance is gone rather than a short
// burst limit, so retrying the same key seconds later only spends another request.
// Park it for an hour instead.
const COOLDOWN_MS = 60 * 60 * 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 200; // bounded, so a long-running process cannot grow without limit

function clientFor(key) {
  if (!clients.has(key)) clients.set(key, new GoogleGenAI({ apiKey: key }));
  return clients.get(key);
}

// Gemini signals "out of quota" in several different shapes depending on where the
// request failed, so match all of them rather than trusting one field.
function isQuotaError(e) {
  const s = `${(e && e.status) || ""} ${(e && e.code) || ""} ${(e && e.message) || ""}`;
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(s);
}

// Try every (model, key) pair before giving up. Returns { text }, the same shape the
// callers already read, so none of them needed reshaping.
async function generate(payload) {
  // A MISSING key is a CONFIGURATION error, not a quota event, and it must never reach
  // the degraded path. Without this line an unset key would leave the app looking
  // perfectly healthy while silently never calling Gemini at all.
  if (!KEYS.length) throw new Error("GEMINI_API_KEYS / GEMINI_API_KEY is not set");

  // Keyed on the request and deliberately NOT on the model. Several people rehearsing
  // the same few sample scams is precisely what exhausted the quota last time, and the
  // answer to a prompt is the answer to that prompt whichever model produced it.
  const ck = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const hit = cache.get(ck);
  if (hit && hit.until > Date.now()) return { text: hit.value, cached: true };

  let lastErr;
  for (const model of MODELS) {
    for (const key of KEYS) {
      const parked = `${model}::${key}`;
      if ((cooling.get(parked) || 0) > Date.now()) continue; // spent on this model
      try {
        const res = await clientFor(key).models.generateContent({ ...payload, model });
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
        cache.set(ck, { value: res.text, until: Date.now() + CACHE_TTL_MS });
        return { text: res.text };
      } catch (e) {
        lastErr = e;
        if (isQuotaError(e)) {
          cooling.set(parked, Date.now() + COOLDOWN_MS);
          continue; // next key, then next model
        }
        throw e; // a genuine error (bad prompt, no network) must still surface loudly
      }
    }
  }

  // Only reached once every key on every model is spent. The flag is what tells the
  // wrapper below that degrading is the correct response here, rather than failing.
  throw Object.assign(lastErr || new Error("All Gemini keys and models are exhausted"), {
    quotaExhausted: true,
  });
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    risk_level: { type: Type.STRING, enum: RISK_LEVELS },
    explanation: { type: Type.STRING },
    signals: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["risk_level", "explanation"],
};

function buildPrompt(text) {
  return [
    "You are a scam-detection assistant for members of the public in Singapore.",
    "Assess how likely the following message is to be a scam (phishing, impersonation,",
    "fake prize, investment/job scam, payment fraud, etc.).",
    "",
    "Rate risk_level as:",
    "- high: clear, strong scam indicators.",
    "- medium: some suspicious signals but not conclusive.",
    "- low: looks legitimate / no strong indicators.",
    "",
    "explanation: 2-4 plain-English sentences a non-technical person can understand.",
    "signals: short phrases naming the specific red flags you found (empty if none).",
    "",
    "Message to assess:",
    '"""',
    text,
    '"""',
  ].join("\n");
}

function safeParse(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    // strip code fences / surrounding prose and grab the first JSON object
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (_) {
        /* fall through */
      }
    }
    return {};
  }
}

// Deterministic offline analysis (set AI_FAKE=1) so the app can run/demo with no Gemini key. Avoids real API
// calls + cost while exercising the full request path. Never used in normal runs.
function fakeAnalyze(text) {
  const t = String(text).toLowerCase();
  const askingCreds = /\b(otp|password|pin|cvv|bank details)\b/.test(t);
  const link = /(https?:\/\/|www\.|\.xyz|bit\.ly|tinyurl)/.test(t);
  const urgency = /\b(urgent|immediately|suspend|locked|verify now|act now)\b/.test(t);
  const bait = /\b(won|winner|prize|reward|gift card|claim|free|congratulations)\b/.test(t);

  const score = [askingCreds, link, urgency, bait].filter(Boolean).length;
  const risk = score >= 2 ? "high" : score === 1 ? "medium" : "low";

  const signals = [];
  if (askingCreds) signals.push("Requests sensitive credentials");
  if (link) signals.push("Contains a suspicious link");
  if (urgency) signals.push("Creates false urgency");
  if (bait) signals.push("Too-good-to-be-true reward");

  return { risk_level: risk, explanation: "[offline mode] Heuristic assessment from keywords.", signals };
}

async function analyzeText(text) {
  if (process.env.AI_FAKE === "1") return fakeAnalyze(text);
  const res = await generate({
    contents: buildPrompt(text),
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });

  const parsed = safeParse(res.text);

  let risk = String(parsed.risk_level || "").toLowerCase();
  if (!RISK_LEVELS.includes(risk)) risk = "medium";

  const explanation =
    String(parsed.explanation || "").trim() || "The checker could not produce a clear explanation.";
  const signals = Array.isArray(parsed.signals)
    ? parsed.signals.slice(0, 6).map((s) => String(s).trim()).filter(Boolean)
    : [];

  return { risk_level: risk, explanation, signals };
}

// ---- Roast the Scam (mini-game) ----
function fakeRoast(text) {
  return {
    score: Math.min(9, 3 + (text.length % 6)),
    roast: "[offline mode] A parcel scam? Groundbreaking. The typos alone deserve a refund.",
    redFlags: ["Generic greeting", "Suspicious link", "Fake urgency"],
  };
}

async function roastScam(text) {
  if (process.env.AI_FAKE === "1") return fakeRoast(text);
  const prompt = [
    "You are a witty comedian who ROASTS scam messages to teach people the red flags.",
    "Give a short, funny, PG-13 roast (2-3 sentences) mocking how lazy/obvious the scam is,",
    "a 'scam_quality_score' from 1 (pathetic) to 10 (scarily convincing), and the red flags.",
    "Roast the SCAMMER, never the victim.",
    "Message:", '"""', text, '"""',
  ].join("\n");
  const res = await generate({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scam_quality_score: { type: Type.INTEGER },
          roast: { type: Type.STRING },
          red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["scam_quality_score", "roast"],
      },
      temperature: 0.9,
    },
  });
  const p = safeParse(res.text);
  let score = parseInt(p.scam_quality_score, 10);
  if (!(score >= 1 && score <= 10)) score = 5;
  return {
    score,
    roast: String(p.roast || "").trim() || "This scam is so bad even my circuits cringed.",
    redFlags: Array.isArray(p.red_flags) ? p.red_flags.slice(0, 5).map(String) : [],
  };
}

// ---- Long-con / romance scam timeline ----
function fakeRelationship(text) {
  return {
    risk_level: /money|invest|crypto|gift|emergency|loan/i.test(text) ? "high" : "medium",
    summary: "[offline mode] Classic long-con grooming building toward a money request.",
    timeline: [
      { stage: "Love-bombing", quote: "You're so special to me", tactic: "Builds fast intimacy" },
      { stage: "Isolation", quote: "Don't tell your family", tactic: "Cuts off outside advice" },
      { stage: "The ask", quote: "I have an emergency", tactic: "Manufactured crisis + money request" },
    ],
    advice: "Never send money to someone you haven't met in person. Talk to someone you trust.",
  };
}

async function analyzeRelationship(text) {
  if (process.env.AI_FAKE === "1") return fakeRelationship(text);
  const prompt = [
    "You are an expert in romance/long-con scams. Analyze the WHOLE conversation below",
    "(it may span weeks) and map the manipulation TIMELINE in order.",
    "Each stage: stage name (love-bombing, isolation, future-faking, the money ask, etc.),",
    "a short representative quote from the text, and the tactic used.",
    "Then give overall risk_level (low/medium/high), a 2-3 sentence summary, and concrete advice.",
    "Conversation:", '"""', text, '"""',
  ].join("\n");
  const res = await generate({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          risk_level: { type: Type.STRING, enum: RISK_LEVELS },
          summary: { type: Type.STRING },
          advice: { type: Type.STRING },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stage: { type: Type.STRING },
                quote: { type: Type.STRING },
                tactic: { type: Type.STRING },
              },
              required: ["stage", "tactic"],
            },
          },
        },
        required: ["risk_level", "summary", "timeline"],
      },
      temperature: 0.3,
    },
  });
  const p = safeParse(res.text);
  let risk = String(p.risk_level || "").toLowerCase();
  if (!RISK_LEVELS.includes(risk)) risk = "medium";
  const timeline = Array.isArray(p.timeline)
    ? p.timeline.slice(0, 12).map((t) => ({
        stage: String(t.stage || "").trim(),
        quote: String(t.quote || "").trim(),
        tactic: String(t.tactic || "").trim(),
      }))
    : [];
  return {
    risk_level: risk,
    summary: String(p.summary || "").trim(),
    advice: String(p.advice || "").trim(),
    timeline,
  };
}

// ---- Chatbot: "Ask Inspector Hoot" (anti-scam Q&A assistant) ----
const CHAT_SYSTEM = [
  "You are Inspector Hoot, the friendly anti-scam assistant for 'Scam Patrol', a Singapore public-education app.",
  "Help everyday members of the public understand scams and know exactly what to do. Be warm, calm and practical.",
  "",
  "Ground your answers in these Singapore facts when relevant:",
  "- National Anti-Scam Helpline: 1799 (call to check if something is a scam or get advice).",
  "- Police emergency: 999. Police non-emergency: 1800-255-0000. Report scams at police.gov.sg.",
  "- If money was ALREADY sent: tell them to contact their bank immediately to freeze the account / stop the transfer, then make a police report and call 1799.",
  "- Banks and government agencies NEVER ask for your full PIN, password, OTP or Singpass via call, SMS or links.",
  "- Common local scams: phishing, e-commerce, job/task, investment, love/romance, bank & government impersonation, parcel/delivery.",
  "",
  "Rules:",
  "- Keep replies short and actionable — a few sentences or short bullet points.",
  "- If the person may have lost money or is in danger, lead with the urgent steps (bank + 999 / 1799).",
  "- Only discuss scams, online safety and this app. If asked something unrelated, gently steer back.",
  "- Never ask the user for passwords, OTPs, card numbers or Singpass. Don't give financial or legal advice beyond general safety.",
].join("\n");

// <CG Member 4 Start>
const CHAT_LANGUAGES = {
  en: "Reply ONLY in English.",
  zh: "Reply ONLY in Simplified Chinese.",
  ms: "Reply ONLY in Malay.",
  ta: "Reply ONLY in Tamil.",
  ja: "Reply ONLY in Japanese.",
  ko: "Reply ONLY in Korean.",
  es: "Reply ONLY in Spanish."
};
// <CG Member 4 End>

function fakeChat(messages) {
  const last = String((messages[messages.length - 1] || {}).text || "").toLowerCase();
  if (/helpline|number|hotline|call|contact/.test(last))
    return "[offline mode] Call the national Anti-Scam Helpline at 1799, or the Police at 999 in an emergency.";
  if (/lost money|transferred|sent money|scammed|paid/.test(last))
    return "[offline mode] Contact your bank immediately to freeze the transfer, make a police report, and call 1799.";
  return "[offline mode] I'm Inspector Hoot 🦉 — ask me about scams, what to do if scammed, or the anti-scam helpline.";
}

// messages: [{ role: 'user' | 'assistant', text }] — full conversation so far.
async function chatReply(messages,language = "en") {
  if (process.env.AI_FAKE === "1") return fakeChat(messages);
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.text || "") }],
  }));
  //CG Start: Add language instruction to the system prompt
  const languageInstruction =
    CHAT_LANGUAGES[language] || CHAT_LANGUAGES.en;

  const res = await generate({
    contents,
    config: {
        systemInstruction: `
        ${CHAT_SYSTEM}

        IMPORTANT:
        ${languageInstruction}

        DO NOT reply in any other language.
        If the user's message is in another language, STILL answer in the selected language only.`,

        temperature: 0.4,
        maxOutputTokens: 600
    },
  });
  //CG End
  return String(res.text || "").trim() || "Sorry, I couldn't answer that — try rephrasing?";
}

// Degrade to the offline twin ONLY when the quota is genuinely exhausted.
//
// Doing this at the export boundary rather than inside each function keeps the four
// implementations unchanged and makes the rule impossible to apply inconsistently:
// there is one place that decides what a fallback is.
//
// The distinction being drawn is the whole point. `quotaExhausted` is set only after
// every key on every model has been tried, and nothing else sets it. A missing key, a
// malformed prompt or a network failure carries no flag, so it is re-thrown, the
// controller returns its usual 502, and the real reason reaches the log. Out of quota
// degrades quietly; misconfigured fails loudly.
function withFallback(realFn, fakeFn) {
  return async (...args) => {
    try {
      return await realFn(...args);
    } catch (e) {
      if (!e || !e.quotaExhausted) throw e;
      const out = await fakeFn(...args);
      // chatReply answers with a string; the other three answer with an object, and
      // those get a flag so the interface can say the answer is a fallback.
      return typeof out === "string" ? out : { ...out, degraded: true };
    }
  };
}

module.exports = {
  analyzeText: withFallback(analyzeText, fakeAnalyze),
  roastScam: withFallback(roastScam, fakeRoast),
  analyzeRelationship: withFallback(analyzeRelationship, fakeRelationship),
  chatReply: withFallback(chatReply, fakeChat),
  MODEL,
  RISK_LEVELS,
};
// <Shania End>
