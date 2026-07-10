// Shawn Member 6 Start
function requireAdmin(req, res, next) {

    if (!req.user) {
        return res.redirect("/auth/login");
    }

    if (req.user.role !== "admin") {

        console.log(
            `[${new Date().toISOString()}] [DENIED] ${req.user.username} attempted to access ${req.originalUrl}`
        );

        return res.status(403).render("error403", {
            title: "Access Denied",
            activePage: ""
        });
    }

    console.log(
        `[${new Date().toISOString()}] [ADMIN] ${req.user.username} accessed ${req.originalUrl}`
    );

    next();

}

module.exports = {
    requireAdmin
};
// Shawn Member 6 End