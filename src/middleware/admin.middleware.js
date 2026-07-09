// Shawn Member 6 Start
function requireAdmin(req, res, next) {

    if (!req.user) {
        return res.redirect("/auth/login");
    }

    if (req.user.role !== "admin") {
        return res.status(403).send("403 Forbidden - Admin access only.");
    }

    next();

}

module.exports = {
    requireAdmin
};
// Shawn Member 6 End