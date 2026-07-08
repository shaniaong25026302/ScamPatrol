-- Rebecca Member 2: Saved Drafts table
-- Run this once if /cases/drafts shows Internal Server Error because the table is missing.

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
