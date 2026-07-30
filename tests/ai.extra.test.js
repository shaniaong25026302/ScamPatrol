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
const username = `aiextra_${SUF}`;
const email = `aiextra_${SUF}@example.com`;
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

  if (server) await new Promise((r) => server.close(r));
  await pool.end();
});

const guest = () => makeClient(base);

test("ai: empty input returns 400", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status } = await shared.call("POST", "/api/ai/analyze", {
    text: "",
  });

  assert.strictEqual(status, 400);
});

test("ai: whitespace input returns 400", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status } = await shared.call("POST", "/api/ai/analyze", {
    text: "      ",
  });

  assert.strictEqual(status, 400);
});

test("ai: relationship detector requires login", async () => {
  const { status } = await guest().call("POST", "/api/ai/relationship", {
    text: "hello",
  });

  assert.strictEqual(status, 401);
});

test("ai: relationship detector rejects short text", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status } = await shared.call("POST", "/api/ai/relationship", {
    text: "hi",
  });

  assert.strictEqual(status, 400);
});

test("ai: history for new user returns an array", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await shared.call("GET", "/api/ai/history");

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(data.history));
});

test("ai: analyze accepts normal safe text", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await shared.call("POST", "/api/ai/analyze", {
    text: "Hi Sarah, thanks for meeting me today. I'll send the slides tonight after dinner.",
  });

  assert.strictEqual(status, 200);
  assert.ok(["low", "medium", "high"].includes(data.risk_level));
});
//CG End//