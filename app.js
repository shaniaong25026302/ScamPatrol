const express = require("express");
const path = require("path");

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
  res.render("index", { activePage: "home" });
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
