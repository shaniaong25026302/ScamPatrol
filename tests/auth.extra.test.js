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

const SUF = Math.floor(Math.random() * 1e9);
const username = `extra_${SUF}`;
const email = `extra_${SUF}@example.com`;
const PW = "Passw0rd!1";

test.before(async () => {
  try {
    await ping();
  } catch {
    dbUp = false;
  }

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });

  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (dbUp) {
    try {
      await pool.query("DELETE FROM users WHERE email = ?", [email]);
      await pool.query("DELETE FROM users WHERE username = ?", [username]);
    } catch (_) {}
  }

  if (server) await new Promise((r) => server.close(r));
  await pool.end();
});

const auth = () => makeClient(base);

test("auth: password confirmation mismatch returns 400", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status, data } = await auth().call("POST", "/api/auth/register", {
    username,
    email,
    password: PW,
    confirmPassword: "WrongPassword123!"
  });

  assert.strictEqual(status, 400);
  assert.ok(data.errors);
});

test("auth: missing email returns 400", async () => {
  const { status } = await auth().call("POST", "/api/auth/register", {
    username,
    password: PW,
    confirmPassword: PW
  });

  assert.strictEqual(status, 400);
});

test("auth: missing username returns 400", async () => {
  const { status } = await auth().call("POST", "/api/auth/register", {
    email,
    password: PW,
    confirmPassword: PW
  });

  assert.strictEqual(status, 400);
});

test("auth: login with unknown account returns 401", async () => {
  const { status } = await auth().call("POST", "/api/auth/login", {
    email: "doesnotexist@example.com",
    password: PW
  });

  assert.strictEqual(status, 401);
});

test("auth: /me without login returns 401", async () => {
  const { status } = await auth().call("GET", "/api/auth/me");
  assert.strictEqual(status, 401);
});
//CG End//