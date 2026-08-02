// <Shania Start>
// tests/jwt.test.js — unit tests for JWT helpers (no DB/network).
// Set a fixed secret BEFORE requiring the module (it caches the secret at load).
process.env.JWT_SECRET = "unit-test-secret-please-ignore";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");
const jwtLib = require("jsonwebtoken");
const {
  signAccess,
  signRefresh,
  verify,
  accessCookieOpts,
  refreshCookieOpts,
} = require("../src/utils/jwt");

test("access token round-trips its payload", () => {
  const token = signAccess({ sub: 7, username: "alice", role: "user" });
  const payload = verify(token);
  assert.strictEqual(payload.sub, 7);
  assert.strictEqual(payload.username, "alice");
  assert.strictEqual(payload.role, "user");
  assert.notStrictEqual(payload.type, "refresh");
});

test("refresh token is tagged with type=refresh", () => {
  const token = signRefresh({ sub: 7 });
  const payload = verify(token);
  assert.strictEqual(payload.type, "refresh");
});

test("verify rejects a tampered/invalid token", () => {
  assert.throws(() => verify("not.a.real.token"));
});

test("verify rejects a token signed with a different secret", () => {
  const foreign = jwtLib.sign({ sub: 1 }, "some-other-secret");
  assert.throws(() => verify(foreign));
});

test("cookie options are httpOnly and not secure outside production", () => {
  delete process.env.COOKIE_SECURE;
  const a = accessCookieOpts();
  const r = refreshCookieOpts();
  assert.strictEqual(a.httpOnly, true);
  assert.strictEqual(a.secure, false); // NODE_ENV=test
  assert.ok(a.maxAge > 0);
  assert.strictEqual(r.httpOnly, true);
  assert.ok(r.maxAge > a.maxAge); // refresh lives longer than access
});

test("COOKIE_SECURE=0 permits sessions on the HTTP EC2 demo", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCookieSecure = process.env.COOKIE_SECURE;
  process.env.NODE_ENV = "production";
  process.env.COOKIE_SECURE = "0";

  try {
    assert.strictEqual(accessCookieOpts().secure, false);
    assert.strictEqual(refreshCookieOpts().secure, false);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCookieSecure === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = originalCookieSecure;
  }
});

test("COOKIE_SECURE=1 protects sessions after HTTPS is enabled", () => {
  const original = process.env.COOKIE_SECURE;
  process.env.COOKIE_SECURE = "1";

  try {
    assert.strictEqual(accessCookieOpts().secure, true);
    assert.strictEqual(refreshCookieOpts().secure, true);
  } finally {
    if (original === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = original;
  }
});

test("an invalid COOKIE_SECURE value fails clearly", () => {
  const original = process.env.COOKIE_SECURE;
  process.env.COOKIE_SECURE = "sometimes";

  try {
    assert.throws(() => accessCookieOpts(), /COOKIE_SECURE/);
  } finally {
    if (original === undefined) delete process.env.COOKIE_SECURE;
    else process.env.COOKIE_SECURE = original;
  }
});
// <Shania End>
