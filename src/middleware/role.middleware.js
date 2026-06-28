// <Shania Start>
// src/middleware/role.middleware.js — role gate. Use AFTER requireAuth.
//   requireRole("admin")          → admin only
//   requireRole("user", "admin")  → any authenticated role
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden." });
    next();
  };
}

module.exports = { requireRole };
// <Shania End>
