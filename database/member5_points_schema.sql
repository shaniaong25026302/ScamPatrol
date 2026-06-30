-- Member 5 (Liam) suggested MySQL schema for later integration.
-- This file is NOT required for the current mock-data version to run.
-- Use/adapt it when the team merges the final database schema.

CREATE TABLE IF NOT EXISTS user_points (
  user_id INT PRIMARY KEY,
  points INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  verified_case_count INT NOT NULL DEFAULT 0,
  account_created BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS badges (
  code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  threshold_value INT NOT NULL,
  icon VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id INT NOT NULL,
  badge_code VARCHAR(50) NOT NULL,
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_code),
  FOREIGN KEY (badge_code) REFERENCES badges(code)
);

CREATE TABLE IF NOT EXISTS point_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  points_delta INT NOT NULL,
  related_type VARCHAR(50),
  related_id INT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
