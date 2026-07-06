const fs = require("fs");
const path = require("path");

// -----------------------------------------------------------------------------
// Scam Weather service
// -----------------------------------------------------------------------------
// This file keeps Scam Weather logic away from app.js.
// It handles:
// - reading/writing Scam Weather posts
// - generating seasonal scam forecasts
// - preparing future integration with real report data/news feeds
// -----------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, "..", "data");
const POSTS_FILE = path.join(DATA_DIR, "scamWeatherPosts.json");

// Easy-to-edit categories. If the team wants more later, add them here.
const POST_CATEGORIES = ["news", "advice"];

// These values simulate report-data trends until Rebecca/Nivi's report system
// exposes real scam report counts. Later, replace this array with DB queries.
const REPORT_SIGNALS = [
  { scamType: "Parcel delivery scams", reportCount: 42, trend: "up", riskLevel: "High" },
  { scamType: "IRAS/tax impersonation", reportCount: 31, trend: "seasonal", riskLevel: "Medium" },
  { scamType: "Job offer scams", reportCount: 24, trend: "steady", riskLevel: "Medium" }
];

// Seasonal rules are intentionally centralised so classmates can tweak the
// forecast without digging through route code.
const SEASONAL_RULES = [
  {
    months: [2, 3, 4],
    label: "Tax season watch",
    riskLevel: "High",
    headline: "IRAS and tax refund impersonation attempts may increase.",
    advice: [
      "Do not trust links claiming urgent tax refunds or penalties.",
      "Type official government URLs manually instead of clicking message links.",
      "Never share Singpass, bank OTPs, or card details through chat links."
    ]
  },
  {
    months: [11, 12, 1],
    label: "Festive parcel season",
    riskLevel: "High",
    headline: "Parcel delivery, shopping, and fake promotion scams are more likely.",
    advice: [
      "Verify delivery messages through the official shopping app or courier site.",
      "Be suspicious of tiny unpaid-fee links for parcels you did not expect.",
      "Avoid deals that pressure you to pay immediately outside the platform."
    ]
  },
  {
    months: [5, 6, 7, 8],
    label: "Mid-year opportunity scams",
    riskLevel: "Medium",
    headline: "Job, internship, tuition, and travel scams may appear more often.",
    advice: [
      "Check company domains and official job portals before sending details.",
      "Avoid jobs that require upfront payment or bank transfers to begin work.",
      "Confirm travel deals directly with official providers before paying."
    ]
  },
  {
    months: [9, 10],
    label: "Shopping campaign watch",
    riskLevel: "Medium",
    headline: "Fake vouchers and marketplace payment scams may rise during sales periods.",
    advice: [
      "Stay inside trusted marketplaces instead of moving to private payment links.",
      "Check seller history and reviews before paying.",
      "Be careful with QR codes claiming limited-time discounts."
    ]
  }
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(POSTS_FILE)) {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(getSeedPosts(), null, 2));
  }
}

function getSeedPosts() {
  return [
    {
      id: 1,
      title: "Festive period: parcel scam alerts",
      category: "advice",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80",
      caption: "Watch out for fake parcel fee messages during shopping seasons.",
      body: "Scammers often send SMS or chat messages claiming that a parcel is stuck until a small delivery fee is paid. Always check your order inside the official shopping or courier app instead of trusting random links.",
      authorId: 1,
      authorName: "Liam",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 2,
      title: "Tax season: IRAS impersonation warning",
      category: "news",
      mediaType: "none",
      mediaUrl: "",
      caption: "Seasonal reminder: tax/refund scams can become more believable around filing periods.",
      body: "During tax-related periods, scam messages may pretend to be from official agencies. They may claim you owe money or are due a refund. Do not click suspicious links or provide Singpass, OTP, or banking details.",
      authorId: 1,
      authorName: "Liam",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

function readPosts() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function getCurrentSeasonRule(date = new Date()) {
  const currentMonth = date.getMonth() + 1;
  return SEASONAL_RULES.find((rule) => rule.months.includes(currentMonth)) || SEASONAL_RULES[0];
}

function getForecast() {
  const season = getCurrentSeasonRule();
  const posts = readPosts();
  const latestNews = posts.filter((post) => post.category === "news").slice(0, 3);

  return {
    season,
    reportSignals: REPORT_SIGNALS,
    latestNews,
    updatedAt: new Date().toISOString()
  };
}

function getPosts(category = "all") {
  const posts = readPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (category === "news" || category === "advice") {
    return posts.filter((post) => post.category === category);
  }

  return posts;
}

function getPostById(id) {
  return readPosts().find((post) => String(post.id) === String(id));
}

function cleanPostInput(body) {
  return {
    title: String(body.title || "").trim(),
    category: POST_CATEGORIES.includes(body.category) ? body.category : "advice",
    mediaType: ["none", "image", "video"].includes(body.mediaType) ? body.mediaType : "none",
    mediaUrl: String(body.mediaUrl || "").trim(),
    caption: String(body.caption || "").trim(),
    body: String(body.body || "").trim()
  };
}

function validatePostInput(postInput) {
  if (!postInput.title) return "Title is required.";
  if (!postInput.body) return "Post body is required.";

  if (postInput.mediaType !== "none" && !postInput.mediaUrl) {
    return "Please provide an image/video URL, or set media type to None.";
  }

  return null;
}

function createPost(currentUser, body) {
  const postInput = cleanPostInput(body);
  const error = validatePostInput(postInput);
  if (error) return { success: false, message: error };

  const posts = readPosts();
  const nextId = posts.length ? Math.max(...posts.map((post) => Number(post.id))) + 1 : 1;
  const now = new Date().toISOString();

  const post = {
    id: nextId,
    ...postInput,
    authorId: currentUser.id,
    authorName: currentUser.username,
    createdAt: now,
    updatedAt: now
  };

  posts.push(post);
  writePosts(posts);

  return { success: true, post };
}

function canEditPost(currentUser, post) {
  if (!currentUser || !post) return false;

  // Admins can manage Scam Weather because the page is admin-updated.
  // The author check is kept so this file remains future-proof if your team
  // later allows trusted non-admin contributors.
  return currentUser.isAdmin || String(currentUser.id) === String(post.authorId);
}

function updatePost(currentUser, id, body) {
  const posts = readPosts();
  const index = posts.findIndex((post) => String(post.id) === String(id));
  if (index === -1) return { success: false, message: "Post not found." };

  if (!canEditPost(currentUser, posts[index])) {
    return { success: false, message: "You can only edit your own Scam Weather posts." };
  }

  const postInput = cleanPostInput(body);
  const error = validatePostInput(postInput);
  if (error) return { success: false, message: error };

  posts[index] = {
    ...posts[index],
    ...postInput,
    updatedAt: new Date().toISOString()
  };

  writePosts(posts);
  return { success: true, post: posts[index] };
}

function deletePost(currentUser, id) {
  const posts = readPosts();
  const post = posts.find((item) => String(item.id) === String(id));
  if (!post) return { success: false, message: "Post not found." };

  if (!canEditPost(currentUser, post)) {
    return { success: false, message: "You can only delete your own Scam Weather posts." };
  }

  writePosts(posts.filter((item) => String(item.id) !== String(id)));
  return { success: true };
}

module.exports = {
  POST_CATEGORIES,
  getForecast,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  canEditPost
};
