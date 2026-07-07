// <Shania Start>
// src/utils/validate.js — the one place that defines what a valid email / username / password is.
// Used server-side by src/controllers/auth.controller.js, and mirrored client-side in public/js/auth.js.
// Each function returns an error string, or null if valid.

// [DevOps: Security] we ALWAYS validate on the server — the client checks can be bypassed, so they're UX only.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // regex: (chars)@(chars).(chars), no spaces — a basic email shape
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/; // regex: 3–30 characters, only letters, digits, or underscore

// Check an email. Returns an error message, or null if it passes every check.
function validateEmail(email) {
  if (!email || typeof email !== "string") return "Email is required."; // missing, or not text
  if (email.length > 255) return "Email must be 255 characters or fewer."; // 255 = the DB column's max length
  if (!EMAIL_RE.test(email)) return "Enter a valid email address."; // .test() = true if it matches the pattern
  return null; // passed all checks
}

// Check a username against USERNAME_RE (3–30 letters/numbers/underscore).
function validateUsername(username) {
  if (!username || typeof username !== "string") return "Username is required.";
  if (!USERNAME_RE.test(username))
    return "Username must be 3–30 characters: letters, numbers or underscore only.";
  return null;
}

// Check a password: minimum length + must contain each required character type.
function validatePassword(password) {
  if (!password || typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters."; // 8 = minimum length
  if (!/[A-Z]/.test(password)) return "Password needs at least one uppercase letter."; // [A-Z] = any capital
  if (!/[0-9]/.test(password)) return "Password needs at least one number."; // [0-9] = any digit
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs at least one special character."; // [^A-Za-z0-9] = a symbol
  return null;
}

module.exports = { validateEmail, validateUsername, validatePassword, EMAIL_RE, USERNAME_RE };
// <Shania End>
