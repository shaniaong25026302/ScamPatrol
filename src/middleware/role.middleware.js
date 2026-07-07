// <Shania Start>
// src/middleware/role.middleware.js — a role check to put AFTER requireAuth on admin-only routes.
//   requireRole("admin")          → only admins allowed
//   requireRole("user", "admin")  → any logged-in role allowed
function requireRole(...roles) { // ...roles = collect all arguments into an array, e.g. ["admin"]
  return (req, res, next) => { // return the actual middleware function Express will run
    if (!req.user) return res.status(401).json({ error: "Authentication required." }); // not logged in at all → 401
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden." }); // wrong role → 403 (Forbidden)
    next(); // role is in the allowed list → continue
  };
}

module.exports = { requireRole }; // exported for admin routes to import
// <Shania End>
