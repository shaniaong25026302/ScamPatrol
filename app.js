const express = require("express");
const path = require("path");

// Feature services are kept separate from app.js so teammates can integrate
// their own routes without needing to understand every ScamLah feature.
const pointsService = require("./services/pointsService");
const authService = require("./services/authService");
const scamWeatherService = require("./services/scamWeatherService");

const authRoutes = require("./routes/authRoutes");
const scamWeatherRoutes = require("./routes/scamWeatherRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files (serves public/css/styles.css at /css/styles.css)
app.use(express.static(path.join(__dirname, "public")));

// Body parsers
// urlencoded = normal HTML form submissions
// json = future teammate APIs can send JSON bodies cleanly
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Attach the logged-in user to every request and every EJS page.
// This is what lets the navbar show Login/Logout/Admin actions consistently.
app.use(authService.attachCurrentUser);

// Auth routes: /login, /signup, /logout
app.use("/", authRoutes);

// Scam Weather routes: /scam-weather, /scam-weather/new, /scam-weather/:id/edit
app.use("/scam-weather", scamWeatherRoutes);

// Home route
app.get("/", (req, res) => {
  const leaderboard = pointsService.getLeaderboard();
  const topLeaderboard = Array.isArray(leaderboard) ? leaderboard.slice(0, 3) : [];

  // Scam Weather preview gives the home page a live-ish snapshot of the feature.
  const scamWeatherForecast = scamWeatherService.getForecast();
  const latestScamWeatherPosts = scamWeatherService.getPosts().slice(0, 2);

  res.render("index", {
    activePage: "home",
    leaderboard: topLeaderboard,
    scamWeatherForecast,
    latestScamWeatherPosts
  });
});

// Leaderboard page
app.get("/leaderboard", (req, res) => {
  const leaderboard = pointsService.getLeaderboard();
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  res.render("leaderboard", {
    activePage: "leaderboard",
    leaderboard: safeLeaderboard
  });
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
