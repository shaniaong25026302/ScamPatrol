const express = require("express");
const path = require("path");

const pointsService = require("./services/pointsService");
const pointsRoutes = require("./routes/pointsRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files (serves public/css/styles.css at /css/styles.css)
app.use(express.static(path.join(__dirname, "public")));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// API routes owned by Member 5 (Liam)
app.use("/api/points", pointsRoutes);

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

  res.render("leaderboard", {
    activePage: "leaderboard",
    leaderboard,
    pointsConfig: pointsService.getPointsConfig()
  });
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
