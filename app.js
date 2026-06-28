const express = require("express");
const path = require("path");
const pointsService = require("./services/pointsService");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files (serves public/css/styles.css at /css/styles.css)
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  const leaderboard = pointsService.getLeaderboard();
  const topLeaderboard = Array.isArray(leaderboard) ? leaderboard.slice(0, 3) : [];

  res.render("index", {
    activePage: "home",
    leaderboard: topLeaderboard
  });
});

app.get("/leaderboard", (req, res) => {
  const leaderboard = pointsService.getLeaderboard();
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  res.render("leaderboard", {
    activePage: "leaderboard",
    leaderboard: safeLeaderboard
  });
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
