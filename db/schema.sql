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
  user_id     INT UNSIGNED DEFAULT NULL,
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
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  platform    VARCHAR(100) DEFAULT NULL,
  scam_date   DATE DEFAULT NULL,
  user_id     INT UNSIGNED DEFAULT NULL,
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
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_game_profiles_xp (xp),
  CONSTRAINT fk_game_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
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
