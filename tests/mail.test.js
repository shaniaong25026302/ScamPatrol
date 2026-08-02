const test = require("node:test");
const assert = require("node:assert");

const mail = require("../src/services/mail.service");

test("mail: isConfigured returns a boolean", () => {
  assert.strictEqual(typeof mail.isConfigured(), "boolean");
});

test("mail: verifyConnection rejects when SMTP is not configured", async () => {
  const oldUser = process.env.SMTP_USER;
  const oldPass = process.env.SMTP_PASS;
  const oldKey = process.env.MAILJET_API_KEY;
  const oldSecret = process.env.MAILJET_SECRET_KEY;

  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.MAILJET_API_KEY;
  delete process.env.MAILJET_SECRET_KEY;

  await assert.rejects(
    () => mail.verifyConnection(),
    /SMTP is not configured/
  );

  process.env.SMTP_USER = oldUser;
  process.env.SMTP_PASS = oldPass;

  if (oldKey) process.env.MAILJET_API_KEY = oldKey;
  if (oldSecret) process.env.MAILJET_SECRET_KEY = oldSecret;
});

test("mail: warmUp returns a boolean", async () => {
  const result = await mail.warmUp();
  assert.strictEqual(typeof result, "boolean");
});