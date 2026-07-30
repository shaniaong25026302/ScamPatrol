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
const username = `gameextra_${SUF}`;
const email = `gameextra_${SUF}@example.com`;
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
      await pool.query("DELETE FROM users WHERE email = ?", [email]);
    } catch (_) {}
  }

  if (server) {
    await new Promise((r) => server.close(r));
  }

  await pool.end();
});

const guest = () => makeClient(base);

test("game: profile requires login", async () => {
  const { status } = await guest().call("GET", "/api/game/profile");
  assert.strictEqual(status, 401);
});

test("game: leaderboard requires login", async () => {
  const { status } = await guest().call("GET", "/api/game/leaderboard");
  assert.strictEqual(status, 401);
});

test("game: mission start without kind still returns a mission", async (t) => {
    if (!dbUp) return t.skip("database unavailable");

    const { status, data } = await shared.call(
        "POST",
        "/api/game/mission/start",
        {}
    );

    assert.strictEqual(status, 200);
    assert.ok(data.mission);
});

test("game: invalid mission id returns error", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status } = await shared.call(
    "POST",
    "/api/game/mission/check",
    {
      missionId: 999999,
      answer: "scam",
    }
  );

  assert.ok(status === 400 || status === 404);
});

test("game: roast requires login", async () => {
  const { status } = await guest().call(
    "POST",
    "/api/game/roast",
    {
      text: "You won $1,000,000!",
    }
  );

  assert.strictEqual(status, 401);
});

test("game: roast rejects empty text", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const { status } = await shared.call(
    "POST",
    "/api/game/roast",
    {
      text: "",
    }
  );

  assert.strictEqual(status, 400);
});

test("game: mission check without answer returns response", async (t) => {
    if (!dbUp) return t.skip("database unavailable");

    const start = await shared.call(
        "POST",
        "/api/game/mission/start",
        {
            kind: "Email",
        }
    );

    assert.strictEqual(start.status, 200);

    const check = await shared.call(
        "POST",
        "/api/game/mission/check",
        {
            missionId: start.data.mission.id,
        }
    );

    assert.strictEqual(check.status, 200);
    assert.strictEqual(typeof check.data.correct, "boolean");
});

test("game: repeated profile requests remain successful", async (t) => {
  if (!dbUp) return t.skip("database unavailable");

  const first = await shared.call("GET", "/api/game/profile");
  const second = await shared.call("GET", "/api/game/profile");

  assert.strictEqual(first.status, 200);
  assert.strictEqual(second.status, 200);
});
//CG End//