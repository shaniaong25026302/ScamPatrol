// <Shania Start>
// tests/api.test.js — integration tests for the auth + AI API.
// Imports the Express app (it won't self-listen), starts it on an ephemeral port,
// and drives it over HTTP. Gemini is stubbed via AI_FAKE so this is offline + free.
// Requires the database from .env; if it's unreachable the DB-dependent tests skip.
process.env.AI_FAKE = "1";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");

const app = require("../src/server");
const { pool, ping } = require("../src/db");
const { makeClient } = require("./helpers");

const SUF = Math.floor(Math.random() * 1e9);
const username = `nodetest_${SUF}`;
const email = `nodetest_${SUF}@example.com`;
const PW = "Passw0rd!1";
const MARKER = "ZZTESTMARKER";

let server;
let base;
let dbUp = true;
let shared; // authed session reused across tests (built once base is known)

test.before(async () => {
  try {
    await ping();
  } catch (_) {
    dbUp = false;
  }
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
  shared = makeClient(base);
});

test.after(async () => {
  if (dbUp) {
    try {
      await pool.query("DELETE FROM ai_analyses WHERE input_text LIKE ?", [`%${MARKER}%`]);
      await pool.query("DELETE FROM users WHERE email LIKE ?", ["nodetest_%@example.com"]);
    } catch (_) {
      /* best-effort cleanup */
    }
  }
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
});

const auth = () => makeClient(base);

test("health endpoint reports status", async () => {
  const { status, data } = await auth().call("GET", "/api/health");
  // 200 when DB up, 503 when down — either is a valid, handled response.
  assert.ok(status === 200 || status === 503, `unexpected status ${status}`);
  assert.ok(data.status);
});

test("auth: register creates a user and sets a cookie", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("POST", "/api/auth/register", {
    username,
    email,
    password: PW,
    confirmPassword: PW,
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(data.user.username, username);
  assert.ok(shared.jar().token, "token cookie set");
});

test("auth: /me returns the current user", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("GET", "/api/auth/me");
  assert.strictEqual(status, 200);
  assert.strictEqual(data.user.email, email);
});

test("auth: duplicate email is rejected with 409", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await auth().call("POST", "/api/auth/register", {
    username: username + "x",
    email,
    password: PW,
    confirmPassword: PW,
  });
  assert.strictEqual(status, 409);
  assert.ok(data.errors && data.errors.email);
});

test("auth: weak password is rejected with field errors", async () => {
  const { status, data } = await auth().call("POST", "/api/auth/register", {
    username: "weakling1",
    email: "weakling1@example.com",
    password: "weak",
    confirmPassword: "weak",
  });
  assert.strictEqual(status, 400);
  assert.ok(data.errors && data.errors.password);
});

test("auth: wrong password fails login with 401", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status } = await auth().call("POST", "/api/auth/login", {
    email,
    password: "WrongPass!9",
  });
  assert.strictEqual(status, 401);
});

test("auth: logout clears the session", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const c = makeClient(base);
  await c.call("POST", "/api/auth/login", { email, password: PW });
  assert.ok(c.jar().token, "logged in");
  const { status } = await c.call("POST", "/api/auth/logout");
  assert.strictEqual(status, 200);
  assert.ok(!c.jar().token, "token cleared");
  const me = await c.call("GET", "/api/auth/me");
  assert.strictEqual(me.status, 401);
});

test("ai: short input is rejected with 400", async () => {
  const { status, data } = await auth().call("POST", "/api/ai/analyze", { text: "scam" });
  assert.strictEqual(status, 400);
  assert.ok(data.error);
});

test("ai: history requires authentication", async () => {
  const { status } = await auth().call("GET", "/api/ai/history");
  assert.strictEqual(status, 401);
});

test("ai: guest analyze returns a risk read and guest flag", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await auth().call("POST", "/api/ai/analyze", {
    text: `URGENT ${MARKER}: your bank account is locked, verify your OTP at http://scam.xyz now`,
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(data.risk_level, "high"); // AI_FAKE heuristic
  assert.strictEqual(data.guest, true);
  assert.strictEqual(data.saved, false);
  assert.strictEqual(typeof data.remaining, "number");
});

test("ai: guest over the free limit gets 403", async () => {
  const c = makeClient(base);
  c.set("ai_guest_used", "5");
  const { status, data } = await c.call("POST", "/api/ai/analyze", {
    text: `another suspicious message ${MARKER} to check here`,
  });
  assert.strictEqual(status, 403);
  assert.strictEqual(data.limited, true);
});

test("ai: user analyze is saved and shows up in history", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const a = await shared.call("POST", "/api/ai/analyze", {
    text: `Hi ${MARKER}, reminder our meeting is at 3pm tomorrow in room 4. See you.`,
  });
  assert.strictEqual(a.status, 200);
  assert.strictEqual(a.saved === undefined ? true : a.saved, true);
  assert.strictEqual(a.data.saved, true);

  const h = await shared.call("GET", "/api/ai/history");
  assert.strictEqual(h.status, 200);
  assert.ok(h.data.history.some((row) => row.input_text.includes(MARKER)), "saved check in history");
});

test("game: profile reflects earned XP, badges and quest", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("GET", "/api/game/profile");
  assert.strictEqual(status, 200);
  assert.ok(data.xp > 0, "xp accrued from earlier analyze");
  assert.ok(Array.isArray(data.badges) && data.badges.length > 0);
  assert.ok(Array.isArray(data.quest) && data.quest.length === 4);
  assert.ok(data.challenge && data.challenge.label);
});

test("game: mission hides the answer; check returns a verdict + reward", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const g = await shared.call("GET", "/api/game/mission");
  assert.strictEqual(g.status, 200);
  assert.ok(g.data.mission && g.data.mission.id);
  assert.strictEqual(g.data.mission.answer, undefined, "answer must be hidden");
  const c = await shared.call("POST", "/api/game/mission/check", {
    missionId: g.data.mission.id,
    answer: "scam",
  });
  assert.strictEqual(c.status, 200);
  assert.strictEqual(typeof c.data.correct, "boolean");
  assert.ok(c.data.why && c.data.reward);
});

test("game: roast returns a 1-10 score + reward (AI_FAKE)", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("POST", "/api/game/roast", {
    text: "You won a prize, click here now to claim before it expires",
  });
  assert.strictEqual(status, 200);
  assert.ok(data.score >= 1 && data.score <= 10);
  assert.ok(data.reward);
});

test("game: leaderboard includes the player", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("GET", "/api/game/leaderboard");
  assert.strictEqual(status, 200);
  assert.ok(data.leaders.some((l) => l.isMe));
});

test("ai: long-con detector returns an ordered timeline", async (t) => {
  if (!dbUp) return t.skip("database unavailable");
  const { status, data } = await shared.call("POST", "/api/ai/relationship", {
    text: `Day 1 ${MARKER}: you are so special to me. Day 20: don't tell your family about us. Day 40: I have an emergency, please send money.`,
  });
  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data.timeline) && data.timeline.length > 0);
  assert.ok(["low", "medium", "high"].includes(data.risk_level));
});
// <Shania End>
