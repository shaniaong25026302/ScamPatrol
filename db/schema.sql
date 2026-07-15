-- <Shania Start>
-- ============================================================
-- scamlah — database schema
-- Owner: M1 (auth + AI tables). M2 (Rebecca) adds scam case tables
-- additively below without rewriting existing auth/AI tables.
-- Engine: InnoDB, utf8mb4. Target: MySQL 8 / shared MySQL host.
-- ============================================================

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(30)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  avatar_url    VARCHAR(512) DEFAULT NULL,
  bio           VARCHAR(500) DEFAULT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- password_resets ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- ai_analyses ----------
CREATE TABLE IF NOT EXISTS ai_analyses (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT DEFAULT NULL,
  input_text  TEXT NOT NULL,
  risk_level  ENUM('low', 'medium', 'high') NOT NULL,
  explanation TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_analyses_user (user_id),
  CONSTRAINT fk_ai_analyses_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Shania End>

-- <Rebecca Member 2 Start>
-- ============================================================
-- Member 2 — Scam Cases Core CRUD + Image Upload
-- Owns: categories, scam_cases, case_images
-- Supports: POST /api/cases, PUT /api/cases/:id,
--           DELETE /api/cases/:id, GET /api/categories
-- ============================================================

-- ---------- categories ----------
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO categories (name) VALUES
  ('Phishing'),
  ('Investment Scam'),
  ('Job Scam'),
  ('Love Scam'),
  ('Loan Scam'),
  ('Online Shopping Scam'),
  ('Social Media Scam'),
  ('Fake Buyer'),
  ('Impersonation Scam'),
  ('Others');

-- ---------- scam_cases ----------
CREATE TABLE IF NOT EXISTS scam_cases (
  id          INT NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id INT DEFAULT NULL,
  platform    VARCHAR(100) DEFAULT NULL,
  scam_date   DATE DEFAULT NULL,
  user_id     INT DEFAULT NULL,
  status      ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scam_cases_category (category_id),
  KEY idx_scam_cases_user (user_id),
  KEY idx_scam_cases_created (created_at),
  CONSTRAINT fk_scam_cases_category
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_scam_cases_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ---------- scam_case_drafts ----------
CREATE TABLE IF NOT EXISTS scam_case_drafts (
  id          INT NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  platform    VARCHAR(100) DEFAULT NULL,
  scam_date   DATE DEFAULT NULL,
  user_id     INT DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scam_case_drafts_user (user_id),
  KEY idx_scam_case_drafts_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- case_images ----------
CREATE TABLE IF NOT EXISTS case_images (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id    INT UNSIGNED NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_case_images_case (case_id),
  CONSTRAINT fk_case_images_case
    FOREIGN KEY (case_id) REFERENCES scam_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Rebecca Member 2 End>

-- <Nivi Member 3 Support Start>
-- These two tables are kept here so Community Watch vote/flag buttons do not break.
-- They support Member 3's pages and are not the main Member 2 feature.
CREATE TABLE IF NOT EXISTS votes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED DEFAULT NULL,
  vote_type  ENUM('upvote', 'downvote') NOT NULL DEFAULT 'upvote',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_votes_case (case_id),
  CONSTRAINT fk_votes_case
    FOREIGN KEY (case_id) REFERENCES scam_cases (id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS flags (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  case_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED DEFAULT NULL,
  reason     VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_flags_case (case_id),
  CONSTRAINT fk_flags_case
    FOREIGN KEY (case_id) REFERENCES scam_cases (id) ON DELETE CASCADE,
  CONSTRAINT fk_flags_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Nivi Member 3 Support End>

-- <CG Member 4 Start>
-- ============================================================
-- Member 4 — Comments
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    case_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY idx_comments_case (case_id),
    KEY idx_comments_user (user_id),

    CONSTRAINT fk_comments_case
        FOREIGN KEY (case_id)
        REFERENCES scam_cases(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;

-- <CG Member 4 End>

-- <Shania Gamification Start>
-- ============================================================
-- Scam Patrol HQ — gamification (M1, took over Leaderboard from M5)
-- Owns: game_profiles, xp_events, user_badges, game_scores
-- ============================================================

-- ---------- game_profiles (one per user: XP, level, coins, streak) ----------
CREATE TABLE IF NOT EXISTS game_profiles (
  user_id          INT UNSIGNED NOT NULL,
  xp               INT UNSIGNED NOT NULL DEFAULT 0,
  coins            INT UNSIGNED NOT NULL DEFAULT 0,
  level            INT UNSIGNED NOT NULL DEFAULT 1,
  current_streak   INT UNSIGNED NOT NULL DEFAULT 0,
  longest_streak   INT UNSIGNED NOT NULL DEFAULT 0,
  last_active_date DATE DEFAULT NULL,
  energy           INT NOT NULL DEFAULT 5,
  energy_updated_at TIMESTAMP NULL DEFAULT NULL,
  avatar           VARCHAR(40) NOT NULL DEFAULT 'recruit',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_game_profiles_xp (xp),
  CONSTRAINT fk_game_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- user_purchases (shop: owned characters/cosmetics) ----------
CREATE TABLE IF NOT EXISTS user_purchases (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  item_key     VARCHAR(40) NOT NULL,
  purchased_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_item (user_id, item_key),
  CONSTRAINT fk_user_purchases_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- xp_events (log of every XP/coin award; also the points contract for M5) ----------
CREATE TABLE IF NOT EXISTS xp_events (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  action     VARCHAR(50) NOT NULL,
  xp         INT NOT NULL DEFAULT 0,
  coins      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_xp_events_user (user_id),
  KEY idx_xp_events_action (action),
  CONSTRAINT fk_xp_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- user_badges (earned milestones/achievements) ----------
CREATE TABLE IF NOT EXISTS user_badges (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  badge_key  VARCHAR(50) NOT NULL,
  earned_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_badge (user_id, badge_key),
  CONSTRAINT fk_user_badges_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------- game_scores (mini-game scores: missions, spot-the-scam, etc.) ----------
CREATE TABLE IF NOT EXISTS game_scores (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  game       VARCHAR(40) NOT NULL,
  score      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_game_scores_user (user_id),
  CONSTRAINT fk_game_scores_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Shania Gamification End>


-- <Liam Scam Weather Start>
-- ============================================================
-- Member 5 — Scam Weather future MySQL tables
-- Current implementation uses JSON cache files so the feature works before
-- final database integration. These tables are ready for the team to migrate
-- the cache into MySQL later.
-- ============================================================

CREATE TABLE IF NOT EXISTS scam_weather_sources (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(160) NOT NULL,
  source_url  VARCHAR(512) NOT NULL,
  feed_url    VARCHAR(512) DEFAULT NULL,
  region      VARCHAR(40) DEFAULT NULL,
  source_type VARCHAR(60) DEFAULT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scam_weather_sources_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS scam_weather_articles (
  id            CHAR(16) NOT NULL,
  source_name   VARCHAR(160) NOT NULL,
  source_url    VARCHAR(512) NOT NULL,
  title         VARCHAR(512) NOT NULL,
  summary       TEXT,
  link          VARCHAR(768) NOT NULL,
  risk_level    ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  scam_types    JSON NOT NULL,
  published_at  TIMESTAMP NULL DEFAULT NULL,
  fetched_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scam_weather_articles_published (published_at),
  KEY idx_scam_weather_articles_source (source_name),
  KEY idx_scam_weather_articles_risk (risk_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS scam_weather_refresh_runs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP NULL DEFAULT NULL,
  mode          VARCHAR(40) DEFAULT NULL,
  articles_seen INT UNSIGNED NOT NULL DEFAULT 0,
  notes         TEXT,
  PRIMARY KEY (id),
  KEY idx_scam_weather_runs_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Liam Scam Weather End>

-- <Liam Daily Quiz Start>
-- ============================================================
-- Member 5 — Daily Quiz future MySQL tables
-- Current implementation persists to JSON cache files so the feature works
-- immediately in demos. These tables document the migration path for production.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_quiz_sets (
  quiz_date      DATE NOT NULL,
  generated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_policy  VARCHAR(255) NOT NULL,
  question_count INT UNSIGNED NOT NULL DEFAULT 10,
  PRIMARY KEY (quiz_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daily_quiz_questions (
  id             CHAR(32) NOT NULL,
  quiz_date       DATE NOT NULL,
  question_order  INT UNSIGNED NOT NULL,
  kind           VARCHAR(40) NOT NULL,
  prompt         TEXT NOT NULL,
  article_title  VARCHAR(512) DEFAULT NULL,
  article_link   VARCHAR(768) DEFAULT NULL,
  source_name    VARCHAR(160) DEFAULT NULL,
  options_json   JSON NOT NULL,
  correct_index  INT UNSIGNED NOT NULL,
  explanation    TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_daily_quiz_questions_date (quiz_date),
  CONSTRAINT fk_daily_quiz_questions_set
    FOREIGN KEY (quiz_date) REFERENCES daily_quiz_sets (quiz_date) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_date     DATE NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  TIMESTAMP NULL DEFAULT NULL,
  score         INT UNSIGNED NOT NULL DEFAULT 0,
  reward_xp     INT UNSIGNED NOT NULL DEFAULT 0,
  reward_coins  INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_quiz_attempt_user_day (quiz_date, user_id),
  CONSTRAINT fk_daily_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS daily_quiz_answers (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id      INT UNSIGNED NOT NULL,
  question_id     CHAR(32) NOT NULL,
  selected_index  INT UNSIGNED NOT NULL,
  correct_index   INT UNSIGNED NOT NULL,
  is_correct      TINYINT(1) NOT NULL DEFAULT 0,
  answered_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daily_quiz_answer_once (attempt_id, question_id),
  CONSTRAINT fk_daily_quiz_answers_attempt FOREIGN KEY (attempt_id) REFERENCES daily_quiz_attempts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
-- <Liam Daily Quiz End>

-- <Shawn Glossary Start>
-- ============================================================
-- Member 6 — Scam Glossary tables
-- Stores glossary terms, definitions, categories, and related
-- metadata used by the Scam Glossary feature. Supports CRUD
-- operations through the glossary management system.
-- ============================================================

CREATE TABLE glossary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    prevention TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- <Shawn Chat History Start>
-- ============================================================
-- Member 6 — Chat History tables
-- Stores Inspector Hoot chat sessions and messages, allowing
-- users to revisit previous conversations and continue chats
-- across multiple sessions.
-- ============================================================

-- CREATE TABLE chat_sessions ...
-- CREATE TABLE chat_messages ...

CREATE TABLE chat_sessions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE chat_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id INT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES chat_sessions(id)
        ON DELETE CASCADE
);
