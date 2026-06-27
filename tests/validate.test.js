// tests/validate.test.js — unit tests for server-side validators (no DB/network).
const test = require("node:test");
const assert = require("node:assert");
const { validateEmail, validateUsername, validatePassword } = require("../src/utils/validate");

test("validateEmail", async (t) => {
  await t.test("accepts a normal address", () => {
    assert.strictEqual(validateEmail("user@example.com"), null);
  });
  await t.test("rejects empty", () => {
    assert.ok(validateEmail(""));
  });
  await t.test("rejects malformed", () => {
    assert.ok(validateEmail("not-an-email"));
    assert.ok(validateEmail("a@b"));
  });
  await t.test("rejects > 255 chars", () => {
    assert.ok(validateEmail("a".repeat(250) + "@example.com"));
  });
});

test("validateUsername", async (t) => {
  await t.test("accepts 3–30 word chars", () => {
    assert.strictEqual(validateUsername("scam_buster_99"), null);
  });
  await t.test("rejects too short", () => {
    assert.ok(validateUsername("ab"));
  });
  await t.test("rejects too long", () => {
    assert.ok(validateUsername("a".repeat(31)));
  });
  await t.test("rejects illegal characters", () => {
    assert.ok(validateUsername("bad name"));
    assert.ok(validateUsername("bad-name!"));
  });
});

test("validatePassword", async (t) => {
  await t.test("accepts strong password", () => {
    assert.strictEqual(validatePassword("Passw0rd!"), null);
  });
  await t.test("rejects < 8 chars", () => {
    assert.ok(validatePassword("Pw0!"));
  });
  await t.test("requires uppercase", () => {
    assert.ok(validatePassword("passw0rd!"));
  });
  await t.test("requires a number", () => {
    assert.ok(validatePassword("Password!"));
  });
  await t.test("requires a special char", () => {
    assert.ok(validatePassword("Passw0rd"));
  });
});
