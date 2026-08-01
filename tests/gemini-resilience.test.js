// <Shania Start>
// tests/gemini-resilience.test.js — the quota-survival behaviour of gemini.service.js.
//
// The free Gemini quota ran out during a presentation once and the AI features could not
// be shown. The fallback that fixes that is only useful if it still works months later,
// and it is invisible in normal use: everything looks fine right up until the quota is
// gone, which is the worst possible moment to find out it regressed.
//
// So the Gemini API itself is replaced with a stub that can be told how to fail. No key,
// no network, no quota spent, and every branch reachable on demand.
//
// This file tests M1's own service. Coverage of the app's endpoints belongs to the main
// suite; this is here because the behaviour it protects cannot be exercised any other way.
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");

const SERVICE = require.resolve("../src/services/gemini.service.js");
const GENAI = require.resolve("@google/genai");

let calls = [];
let behaviour = () => ({ text: "{}" });

// Type is only used to build response schemas, so any object that yields a name per
// property is enough for the service to construct its requests.
const Type = new Proxy({}, { get: (_t, k) => String(k) });

class StubGenAI {
  constructor(opts) {
    this.key = opts.apiKey;
  }
  get models() {
    const key = this.key;
    return {
      generateContent: async (req) => {
        calls.push({ key, model: req.model });
        return behaviour(key, req);
      },
    };
  }
}

// Seed the module cache so the service receives the stub instead of the real client.
require.cache[GENAI] = {
  id: GENAI,
  filename: GENAI,
  loaded: true,
  exports: { GoogleGenAI: StubGenAI, Type },
};

// The service reads its configuration once, when it loads, so each scenario needs a
// freshly loaded copy rather than a shared one.
function load(env) {
  delete require.cache[SERVICE];
  for (const k of ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GEMINI_MODEL", "GEMINI_MODELS", "AI_FAKE"]) {
    delete process.env[k];
  }
  Object.assign(process.env, env);
  calls = [];
  return require(SERVICE);
}

function quotaError() {
  const e = new Error("429 RESOURCE_EXHAUSTED: quota exceeded");
  e.status = 429;
  return e;
}

const REAL = '{"risk_level":"low","explanation":"a real answer","signals":[]}';

test("a missing key is a configuration error, not a quota event", async () => {
  const g = load({});
  // This is the distinction the whole design rests on. If an unset key degraded quietly
  // the app would look healthy while never calling Gemini at all, which is precisely the
  // kind of silent misconfiguration that is impossible to notice in a demo.
  await assert.rejects(() => g.analyzeText("hello"), /is not set/);
});

test("when every key and model is spent, the feature degrades instead of failing", async () => {
  const g = load({ GEMINI_API_KEYS: "k1,k2", GEMINI_MODELS: "m1,m2" });
  behaviour = () => {
    throw quotaError();
  };
  const r = await g.analyzeText("URGENT: click http://x.co to claim your prize now");
  assert.strictEqual(r.degraded, true, "the result must declare itself a fallback");
  assert.ok(["low", "medium", "high"].includes(r.risk_level), "still a usable answer");
  assert.strictEqual(calls.length, 4, "every key must be tried on every model");
});

test("an exhausted key is skipped and the next one is used", async () => {
  const g = load({ GEMINI_API_KEYS: "spent,fresh" });
  behaviour = (key) => {
    if (key === "spent") throw quotaError();
    return { text: REAL };
  };
  const r = await g.analyzeText("a message the cache has not seen");
  assert.strictEqual(r.degraded, undefined, "a real answer is not a fallback");
  assert.deepStrictEqual(
    calls.map((c) => c.key),
    ["spent", "fresh"],
  );
});

test("a model exhausted on every key falls through to the next model", async () => {
  // Quota is scoped per project AND per model, so a key spent on one model may still
  // have a full allowance on another. Parking the key itself rather than the pairing
  // would skip it everywhere at once and this fallback could never happen.
  const g = load({ GEMINI_API_KEYS: "k1", GEMINI_MODELS: "big,small" });
  behaviour = (_key, req) => {
    if (req.model === "big") throw quotaError();
    return { text: REAL };
  };
  await g.analyzeText("another message the cache has not seen");
  assert.deepStrictEqual(
    calls.map((c) => c.model),
    ["big", "small"],
  );
});

test("an identical repeat request is served from cache and spends no quota", async () => {
  // Several people rehearsing the same few sample scams is exactly what exhausted the
  // quota last time.
  const g = load({ GEMINI_API_KEYS: "k1" });
  behaviour = () => ({ text: REAL });
  const first = await g.analyzeText("the same rehearsal message twice");
  const second = await g.analyzeText("the same rehearsal message twice");
  assert.strictEqual(calls.length, 1, "the second call must not reach the API");
  assert.deepStrictEqual(first, second);
});

test("a genuine error still surfaces rather than hiding behind the fallback", async () => {
  const g = load({ GEMINI_API_KEYS: "k1" });
  behaviour = () => {
    throw new Error("malformed request");
  };
  await assert.rejects(() => g.analyzeText("x"), /malformed request/);
});

test("each function degrades into its own shape", async () => {
  const g = load({ GEMINI_API_KEYS: "k1" });
  behaviour = () => {
    throw quotaError();
  };

  // chatReply answers with a string and must keep doing so; the others answer with an
  // object and gain the degraded flag. A fallback that changes the shape of the answer
  // breaks the caller instead of rescuing it.
  const chat = await g.chatReply([{ role: "user", text: "i think i was scammed" }]);
  assert.strictEqual(typeof chat, "string");
  assert.ok(chat.length > 0);

  const roast = await g.roastScam("you have won a free iphone, click here");
  assert.strictEqual(roast.degraded, true);
  assert.ok(typeof roast.roast === "string" && roast.roast.length > 0);

  const rel = await g.analyzeRelationship("Day 1: you are special. Day 40: send money.");
  assert.strictEqual(rel.degraded, true);
  assert.ok(Array.isArray(rel.timeline));
});
// <Shania End>
