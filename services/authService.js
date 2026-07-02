const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// -----------------------------------------------------------------------------
// Simple project auth service
// -----------------------------------------------------------------------------
// This is intentionally lightweight for the school project: no external packages,
// no database dependency yet, and clear comments for integration.
//
// Later, Shania's auth/JWT system or the MySQL database can replace this file.
// The rest of the app only needs req.currentUser to keep working.
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const COOKIE_NAME = "scamPatrolUserId";

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_FILE)) {
    const admin = createUserRecord({
      username: "Liam",
      email: "25021923@admin.scampatrol.local",
      password: "25021923",
      role: "admin"
    });

    fs.writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2));
  }

  // Defensive check: if someone deletes the admin record from users.json,
  // this quietly restores the required demo admin account.
  const users = readUsers();
  const hasAdmin = users.some((user) => user.username.toLowerCase() === "liam");
  if (!hasAdmin) {
    users.push(createUserRecord({
      username: "Liam",
      email: "25021923@admin.scampatrol.local",
      password: "25021923",
      role: "admin"
    }));
    writeUsers(users);
  }
}

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function createUserRecord({ username, email, password, role = "user" }) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    role,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString()
  };
}

function hashPassword(password, salt) {
  // SHA-256 is used here only because it is built into Node.js.
  // In production, use bcrypt/argon2 instead.
  return crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    isAdmin: user.role === "admin"
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function findUserById(id) {
  return readUsers().find((user) => String(user.id) === String(id));
}

function findUserByUsername(username) {
  return readUsers().find(
    (user) => user.username.toLowerCase() === String(username).trim().toLowerCase()
  );
}

function findUserByEmail(email) {
  return readUsers().find(
    (user) => user.email.toLowerCase() === String(email).trim().toLowerCase()
  );
}

function signup({ username, email, password }) {
  ensureDataFile();

  if (!username || !email || !password) {
    return { success: false, message: "Username, email, and password are required." };
  }

  if (password.length < 4) {
    return { success: false, message: "Password must be at least 4 characters long." };
  }

  const users = readUsers();

  if (findUserByUsername(username)) {
    return { success: false, message: "That username is already taken." };
  }

  if (findUserByEmail(email)) {
    return { success: false, message: "That email is already registered." };
  }

  const user = createUserRecord({ username, email, password, role: "user" });
  users.push(user);
  writeUsers(users);

  return { success: true, user: publicUser(user) };
}

function login({ username, password }) {
  ensureDataFile();

  const user = findUserByUsername(username);
  if (!user) {
    return { success: false, message: "Invalid username or password." };
  }

  const attemptedHash = hashPassword(password, user.salt);
  if (attemptedHash !== user.passwordHash) {
    return { success: false, message: "Invalid username or password." };
  }

  return { success: true, user: publicUser(user) };
}

function setLoginCookie(res, user) {
  // Stores only the user ID in the browser cookie.
  // Full account details are still read server-side from data/users.json.
  const maxAgeSeconds = 60 * 60 * 24 * 7;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(user.id)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  );
}

function clearLoginCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  );
}

function getCurrentUser(req) {
  ensureDataFile();
  const cookies = parseCookies(req);
  const user = findUserById(cookies[COOKIE_NAME]);
  return publicUser(user);
}

function attachCurrentUser(req, res, next) {
  req.currentUser = getCurrentUser(req);
  res.locals.currentUser = req.currentUser;
  next();
}

function requireLogin(req, res, next) {
  if (!req.currentUser) {
    return res.redirect("/login?message=Please log in first.");
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.redirect("/login?message=Please log in first.");
  }

  if (!req.currentUser.isAdmin) {
    return res.status(403).render("scam-weather/forbidden", {
      activePage: "scam-weather",
      title: "Admin only"
    });
  }

  next();
}

ensureDataFile();

module.exports = {
  signup,
  login,
  setLoginCookie,
  clearLoginCookie,
  getCurrentUser,
  attachCurrentUser,
  requireLogin,
  requireAdmin
};
