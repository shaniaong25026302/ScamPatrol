//CG Start//
process.env.JWT_SECRET = "unit-test-secret";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert");
const mockery = require("mockery");

let controller;

test.before(() => {
  mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false,
  });
});

test.after(() => {
  mockery.disable();
});

test.beforeEach(() => {
  mockery.deregisterAll();

  // User model
  mockery.registerMock("../models/user.model", {
    findByEmail: async () => null,
    findByUsername: async () => null,
    createUser: async () => 1,
    findPublicById: async () => ({
      id: 1,
      username: "alice",
      email: "alice@test.com",
      role: "user",
    }),
  });

  // bcrypt
  mockery.registerMock("bcrypt", {
    hash: async () => "hashed-password",
    compare: async () => true,
  });

  // mail
  mockery.registerMock("../services/mail.service", {
    isConfigured: () => true,
    sendPasswordReset: async () => {},
  });

  // validation
  mockery.registerMock("../utils/validate", {
    validateEmail: () => null,
    validateUsername: () => null,
    validatePassword: () => null,
  });

  // jwt
  mockery.registerMock("../utils/jwt", {
    signAccess: () => "access-token",
    signRefresh: () => "refresh-token",
    accessCookieOpts: () => ({}),
    refreshCookieOpts: () => ({}),
    clearCookieOpts: () => ({}),
  });

  delete require.cache[
    require.resolve("../src/controllers/auth.controller")
  ];

  controller = require("../src/controllers/auth.controller");
});

test("register returns 400 when passwords do not match", async () => {
  const req = {
    body: {
      username: "alice",
      email: "alice@test.com",
      password: "Passw0rd!",
      confirmPassword: "WrongPassword!",
    },
  };

  let statusCode;

  const res = {
    cookie() {},

    status(code) {
      statusCode = code;
      return this;
    },

    json(body) {
      this.body = body;
      return this;
    },
  };

  await controller.register(req, res);

  assert.strictEqual(statusCode, 400);
  assert.strictEqual(
    res.body.errors.confirmPassword,
    "Passwords do not match."
  );
});
//CG End//