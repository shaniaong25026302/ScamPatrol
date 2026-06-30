-- <Rebecca Member 2 Start>
-- Optional development seed data for Scam Cases.
-- Run after db/schema.sql if your database is empty.

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

INSERT INTO scam_cases (title, description, category_id, platform, scam_date, user_id, status)
SELECT
  'Fake delivery SMS asking for payment',
  'A scammer sent an SMS claiming that a parcel delivery failed and asked for a small payment through a suspicious link. The link led to a fake payment page asking for card details.',
  c.id,
  'SMS',
  CURDATE(),
  NULL,
  'pending'
FROM categories c
WHERE c.name = 'Phishing'
  AND NOT EXISTS (
    SELECT 1 FROM scam_cases WHERE title = 'Fake delivery SMS asking for payment'
  )
LIMIT 1;
-- <Rebecca Member 2 End>
