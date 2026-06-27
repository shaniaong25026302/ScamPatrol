// src/services/gemini.service.js — Google Gemini scam analysis via @google/genai.
// Returns { risk_level: 'low'|'medium'|'high', explanation, signals[] }.
const { GoogleGenAI, Type } = require("@google/genai");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const RISK_LEVELS = ["low", "medium", "high"];

let client;
function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
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

async function analyzeText(text) {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: MODEL,
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

module.exports = { analyzeText, MODEL, RISK_LEVELS };
