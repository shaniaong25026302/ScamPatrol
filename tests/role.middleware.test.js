const test = require("node:test");
const assert = require("node:assert");

const { requireRole } = require("../src/middleware/role.middleware");

test("role middleware: allows permitted role", () => {
  let nextCalled = false;

  const req = {
    user: {
      role: "admin",
    },
  };

  const res = {};

  requireRole("admin")(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
});

test("role middleware: blocks guest", () => {
  let statusCode;
  let body;

  const req = {};

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      body = obj;
      return this;
    },
  };

  requireRole("admin")(req, res, () => {});

  assert.strictEqual(statusCode, 401);
  assert.strictEqual(body.error, "Authentication required.");
});

test("role middleware: blocks wrong role", () => {
  let statusCode;
  let body;

  const req = {
    user: {
      role: "user",
    },
  };

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      body = obj;
      return this;
    },
  };

  requireRole("admin")(req, res, () => {});

  assert.strictEqual(statusCode, 403);
  assert.strictEqual(body.error, "Forbidden.");
});