/*
  Member 5 (Liam) — Points + Badge service

  This service intentionally keeps all point/badge logic in one place so other
  teammates can integrate with it later without touching the leaderboard page.

  Current version: in-memory data for Phase 1/demo.
  Future MySQL version: replace the users Map + transactions array with DB queries,
  while keeping the exported function names the same.
*/

const POINT_VALUES = {
  ACCOUNT_CREATED: 0,
  REPORT_SUBMITTED: 10,
  COMMENT_POSTED: 2,
  CASE_VERIFIED: 20,
  UPVOTE_RECEIVED: 1,
  CONTENT_REMOVED: -10
};

// Backwards-compatible aliases in case teammates use slightly different names.
const EVENT_ALIASES = {
  SIGN_UP: "ACCOUNT_CREATED",
  USER_CREATED: "ACCOUNT_CREATED",
  CASE_SUBMITTED: "REPORT_SUBMITTED",
  COMMENT_CREATED: "COMMENT_POSTED",
  COMMENT_SUBMITTED: "COMMENT_POSTED",
  REPORT_VERIFIED: "CASE_VERIFIED",
  VOTE_RECEIVED: "UPVOTE_RECEIVED"
};

const BADGE_DEFINITIONS = [
  {
    code: "WELCOME",
    name: "Welcome to ScamLah",
    description: "Created a ScamLah account.",
    category: "Account",
    metric: "accountCreated",
    threshold: 1,
    icon: "👋"
  },
  {
    code: "FIRST_REPORT",
    name: "First Report!",
    description: "Submitted your first scam report.",
    category: "Reports",
    metric: "reportCount",
    threshold: 1,
    icon: "📝"
  },
  {
    code: "REPORT_SCOUT",
    name: "Report Scout",
    description: "Submitted 5 scam reports.",
    category: "Reports",
    metric: "reportCount",
    threshold: 5,
    icon: "🔎"
  },
  {
    code: "SCAM_HUNTER",
    name: "Scam Hunter",
    description: "Submitted 10 scam reports.",
    category: "Reports",
    metric: "reportCount",
    threshold: 10,
    icon: "🛡️"
  },
  {
    code: "CASE_CHAMPION",
    name: "Case Champion",
    description: "Submitted 25 scam reports.",
    category: "Reports",
    metric: "reportCount",
    threshold: 25,
    icon: "🏅"
  },
  {
    code: "FIRST_COMMENT",
    name: "First Comment!",
    description: "Posted your first comment on a scam case.",
    category: "Comments",
    metric: "commentCount",
    threshold: 1,
    icon: "💬"
  },
  {
    code: "HELPFUL_REPLY",
    name: "Helpful Reply",
    description: "Posted 5 comments.",
    category: "Comments",
    metric: "commentCount",
    threshold: 5,
    icon: "🤝"
  },
  {
    code: "COMMUNITY_VOICE",
    name: "Community Voice",
    description: "Posted 10 comments.",
    category: "Comments",
    metric: "commentCount",
    threshold: 10,
    icon: "📣"
  },
  {
    code: "DISCUSSION_LEADER",
    name: "Discussion Leader",
    description: "Posted 25 comments.",
    category: "Comments",
    metric: "commentCount",
    threshold: 25,
    icon: "🗣️"
  },
  {
    code: "GETTING_STARTED",
    name: "Getting Started",
    description: "Earned 10 points.",
    category: "Points",
    metric: "points",
    threshold: 10,
    icon: "🌱"
  },
  {
    code: "COMMUNITY_HELPER",
    name: "Community Helper",
    description: "Earned 50 points.",
    category: "Points",
    metric: "points",
    threshold: 50,
    icon: "⭐"
  },
  {
    code: "TOP_CONTRIBUTOR",
    name: "Top Contributor",
    description: "Earned 100 points.",
    category: "Points",
    metric: "points",
    threshold: 100,
    icon: "🏆"
  },
  {
    code: "SCAMLAH_HERO",
    name: "ScamLah Hero",
    description: "Earned 250 points.",
    category: "Points",
    metric: "points",
    threshold: 250,
    icon: "🦸"
  }
];

const seedUsers = [
  {
    id: 1,
    username: "Liam",
    points: 120,
    reportCount: 10,
    commentCount: 5,
    accountCreated: true
  },
  {
    id: 2,
    username: "Rebecca",
    points: 90,
    reportCount: 6,
    commentCount: 4,
    accountCreated: true
  },
  {
    id: 3,
    username: "Nivi",
    points: 70,
    reportCount: 3,
    commentCount: 8,
    accountCreated: true
  },
  {
    id: 4,
    username: "Shania",
    points: 50,
    reportCount: 1,
    commentCount: 2,
    accountCreated: true
  },
  {
    id: 5,
    username: "CG",
    points: 40,
    reportCount: 0,
    commentCount: 12,
    accountCreated: true
  },
  {
    id: 6,
    username: "Shawn",
    points: 30,
    reportCount: 2,
    commentCount: 1,
    accountCreated: true
  }
];

const users = new Map();
const transactions = [];
let transactionId = 1;

seedUsers.forEach((seedUser) => {
  const user = createUserRecord(seedUser.id, seedUser.username);
  user.points = seedUser.points;
  user.reportCount = seedUser.reportCount;
  user.commentCount = seedUser.commentCount;
  user.accountCreated = seedUser.accountCreated;
  awardEligibleBadges(user);
  users.set(Number(seedUser.id), user);
});

function normalizeEventType(eventType) {
  const normalized = String(eventType || "").trim().toUpperCase();
  return EVENT_ALIASES[normalized] || normalized;
}

function createUserRecord(userId, username = "Unknown User") {
  return {
    id: Number(userId),
    username,
    points: 0,
    reportCount: 0,
    commentCount: 0,
    verifiedCaseCount: 0,
    accountCreated: false,
    badges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function ensureUser(userId, username) {
  const numericUserId = Number(userId);

  if (!numericUserId || Number.isNaN(numericUserId)) {
    return null;
  }

  if (!users.has(numericUserId)) {
    users.set(numericUserId, createUserRecord(numericUserId, username));
  }

  const user = users.get(numericUserId);

  // Keep display name fresh when auth/profile feature starts passing username.
  if (username && user.username !== username) {
    user.username = username;
  }

  return user;
}

function getMetricValue(user, metric) {
  if (metric === "accountCreated") {
    return user.accountCreated ? 1 : 0;
  }

  return Number(user[metric]) || 0;
}

function awardEligibleBadges(user) {
  const existingBadgeCodes = new Set(user.badges.map((badge) => badge.code));
  const newlyAwarded = [];

  BADGE_DEFINITIONS.forEach((badgeDefinition) => {
    const metricValue = getMetricValue(user, badgeDefinition.metric);

    if (metricValue >= badgeDefinition.threshold && !existingBadgeCodes.has(badgeDefinition.code)) {
      const badge = {
        code: badgeDefinition.code,
        name: badgeDefinition.name,
        description: badgeDefinition.description,
        category: badgeDefinition.category,
        icon: badgeDefinition.icon,
        awardedAt: new Date().toISOString()
      };

      user.badges.push(badge);
      newlyAwarded.push(badge);
      existingBadgeCodes.add(badge.code);
    }
  });

  return newlyAwarded;
}

function addTransaction({ userId, eventType, pointsDelta, relatedType, relatedId, reason }) {
  const transaction = {
    id: transactionId++,
    userId: Number(userId),
    eventType,
    pointsDelta,
    relatedType: relatedType || null,
    relatedId: relatedId || null,
    reason: reason || null,
    createdAt: new Date().toISOString()
  };

  transactions.push(transaction);
  return transaction;
}

function handleEvent({ userId, username, eventType, relatedType, relatedId, reason }) {
  const normalizedEventType = normalizeEventType(eventType);
  const pointsDelta = POINT_VALUES[normalizedEventType];

  if (pointsDelta === undefined) {
    return {
      success: false,
      message: "Invalid points event type",
      validEventTypes: Object.keys(POINT_VALUES)
    };
  }

  const user = ensureUser(userId, username);

  if (!user) {
    return {
      success: false,
      message: "A valid userId is required"
    };
  }

  switch (normalizedEventType) {
    case "ACCOUNT_CREATED":
      user.accountCreated = true;
      break;
    case "REPORT_SUBMITTED":
      user.reportCount += 1;
      break;
    case "COMMENT_POSTED":
      user.commentCount += 1;
      break;
    case "CASE_VERIFIED":
      user.verifiedCaseCount += 1;
      break;
    default:
      break;
  }

  user.points += pointsDelta;

  if (user.points < 0) {
    user.points = 0;
  }

  user.updatedAt = new Date().toISOString();

  const transaction = addTransaction({
    userId: user.id,
    eventType: normalizedEventType,
    pointsDelta,
    relatedType,
    relatedId,
    reason
  });

  const newBadges = awardEligibleBadges(user);

  return {
    success: true,
    message: `${normalizedEventType} applied successfully`,
    eventType: normalizedEventType,
    pointsDelta,
    transaction,
    newBadges,
    user: formatUser(user)
  };
}

function registerUser({ userId, username }) {
  return handleEvent({ userId, username, eventType: "ACCOUNT_CREATED" });
}

function formatUser(user) {
  return {
    id: user.id,
    username: user.username,
    points: user.points,
    reportCount: user.reportCount,
    commentCount: user.commentCount,
    verifiedCaseCount: user.verifiedCaseCount,
    accountCreated: user.accountCreated,
    badges: [...user.badges],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getLeaderboard() {
  return [...users.values()]
    .map(formatUser)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      return a.username.localeCompare(b.username);
    });
}

function getUserProgress(userId) {
  const user = users.get(Number(userId));

  if (!user) {
    return null;
  }

  return formatUser(user);
}

function getTransactionsForUser(userId) {
  return transactions.filter((transaction) => transaction.userId === Number(userId));
}

function getPointsConfig() {
  return {
    pointValues: { ...POINT_VALUES },
    badgeDefinitions: [...BADGE_DEFINITIONS],
    eventTypes: Object.keys(POINT_VALUES)
  };
}

module.exports = {
  POINT_VALUES,
  BADGE_DEFINITIONS,
  getLeaderboard,
  getUserProgress,
  getTransactionsForUser,
  getPointsConfig,
  handleEvent,
  registerUser
};
