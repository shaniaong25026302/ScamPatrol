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


-- <Liam Scam Weather Start>
-- Optional seed rows for the future MySQL source registry.
-- The running feature currently reads this list from src/services/scamweather.service.js.
INSERT IGNORE INTO scam_weather_sources (name, source_url, feed_url, region, source_type) VALUES
  ('FTC Consumer Advice — Scams', 'https://consumer.ftc.gov/scams', 'https://consumer.ftc.gov/consumer-alerts/rss', 'US', 'public-safety'),
  ('Australian Scamwatch', 'https://www.scamwatch.gov.au/', 'https://www.scamwatch.gov.au/news-alerts/rss', 'AU', 'public-safety'),
  ('Singapore ScamShield', 'https://www.scamshield.gov.sg/', NULL, 'SG', 'public-safety'),
  ('Singapore Police Force — Scams', 'https://www.police.gov.sg/Advisories/Scams', NULL, 'SG', 'public-safety'),
  ('CISA Cybersecurity Advisories', 'https://www.cisa.gov/news-events/cybersecurity-advisories', 'https://www.cisa.gov/cybersecurity-advisories/all.xml', 'US', 'cyber-advisory'),
  ('BleepingComputer', 'https://www.bleepingcomputer.com/', 'https://www.bleepingcomputer.com/feed/', 'Global', 'cyber-news'),
  ('The Hacker News', 'https://thehackernews.com/', 'https://feeds.feedburner.com/TheHackersNews', 'Global', 'cyber-news'),
  ('KrebsOnSecurity', 'https://krebsonsecurity.com/', 'https://krebsonsecurity.com/feed/', 'Global', 'investigative');
-- <Liam Scam Weather End>
