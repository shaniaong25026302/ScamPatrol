//CG Start//
process.env.AI_FAKE = "1";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");

const app = require("../src/server");
const { pool, ping } = require("../src/db");
const { makeClient } = require("./helpers");

let server;
let base;
let dbUp = true;
let shared;

const SUF = Math.floor(Math.random() * 1e9);
const username = `extraapi_${SUF}`;
const email = `extraapi_${SUF}@example.com`;
const PW = "Passw0rd!1";

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

  if (!dbUp) return;

  await shared.call("POST", "/api/auth/register", {
    username,
    email,
    password: PW,
    confirmPassword: PW,
  });
});

test.after(async () => {
  if (dbUp) {
    try {
      await pool.query("DELETE FROM ai_analyses WHERE user_id IS NOT NULL");
      await pool.query("DELETE FROM users WHERE email = ?", [email]);
    } catch (_) {}
  }

  if (server) {
    await new Promise((r) => server.close(r));
  }

  await pool.end();
});

const guest = () => makeClient(base);

test("health: live endpoint responds", async () => {
  const { status, data } = await guest().call(
    "GET",
    "/api/health/live"
  );

  assert.strictEqual(status, 200);
  assert.ok(data.status);
});

test("auth: logout without login returns success or unauthorized", async () => {
  const { status } = await guest().call(
    "POST",
    "/api/auth/logout"
  );

  assert.ok(status === 200 || status === 401);
});

test("auth: duplicate username returns 409", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const client = makeClient(base);

  const result = await client.call(
    "POST",
    "/api/auth/register",
    {
      username,
      email: `duplicate_${SUF}@example.com`,
      password: PW,
      confirmPassword: PW,
    }
  );

  assert.strictEqual(result.status, 409);
  assert.ok(result.data.errors.username);
});

test("ai: history endpoint always returns array", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await shared.call(
    "GET",
    "/api/ai/history"
  );

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data.history));
});

test("game: leaderboard returns array", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await shared.call(
    "GET",
    "/api/game/leaderboard"
  );

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data.leaders));
});

test("game: profile always contains xp", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await shared.call(
    "GET",
    "/api/game/profile"
  );

  assert.strictEqual(status, 200);
  assert.strictEqual(typeof data.xp, "number");
});

test("ai: analyze twice succeeds", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const first = await shared.call(
    "POST",
    "/api/ai/analyze",
    {
      text: "Reminder: meeting tomorrow at 9am in Meeting Room A.",
    }
  );

  const second = await shared.call(
    "POST",
    "/api/ai/analyze",
    {
      text: "Congratulations! Click here immediately to claim your reward.",
    }
  );

  assert.strictEqual(first.status, 200);
  assert.strictEqual(second.status, 200);
});

test("auth: login twice keeps authenticated session", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const client = makeClient(base);

  await client.call("POST", "/api/auth/login", {
    email,
    password: PW,
  });

  const second = await client.call("POST", "/api/auth/login", {
    email,
    password: PW,
  });

  assert.strictEqual(second.status, 200);

  const me = await client.call("GET", "/api/auth/me");

  assert.strictEqual(me.status, 200);
});
//CG End//