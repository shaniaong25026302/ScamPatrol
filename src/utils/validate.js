// src/utils/validate.js — server-side validation (mirrored client-side in public/js/auth.js).
// Each function returns an error string, or null when valid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

function validateEmail(email) {
  if (!email || typeof email !== "string") return "Email is required.";
  if (email.length > 255) return "Email must be 255 characters or fewer.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

function validateUsername(username) {
  if (!username || typeof username !== "string") return "Username is required.";
  if (!USERNAME_RE.test(username))
    return "Username must be 3–30 characters: letters, numbers or underscore only.";
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password needs at least one uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password needs at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs at least one special character.";
  return null;
}

module.exports = { validateEmail, validateUsername, validatePassword, EMAIL_RE, USERNAME_RE };
