# Daily Quiz Automation — Member 5 Liam

## What this feature does

Daily Quiz adds a new logged-in navbar feature where each user gets exactly **10 scam-awareness questions per day**. The quiz is generated automatically from the same trusted Scam News article pool used by Scam Weather.

The feature satisfies the task statement by providing:

- a new **Daily Quiz** navbar option;
- 10 questions per day;
- saved per-user progress;
- automatic question generation from Scam Weather / Scam News data;
- scam-type, precaution, source-check, and data-signal questions;
- EXP and coin rewards based on score;
- visual navbar states for ready, in-progress, and completed quizzes;
- annotated code for presentation.

## Main files

| File | Purpose |
|---|---|
| `src/services/dailyquiz.service.js` | Core automation, quiz generation, progress saving, rewards |
| `src/routes/dailyquiz.api.routes.js` | JSON API used by page JavaScript and navbar status |
| `src/routes/dailyquiz.pages.routes.js` | EJS route for `/daily-quiz` |
| `views/daily-quiz/index.ejs` | Daily Quiz page layout |
| `public/js/daily-quiz.js` | Interactive quiz controller |
| `public/js/daily-quiz-nav.js` | Navbar ready/in-progress/completed state controller |
| `public/css/game.css` | Daily Quiz styles under `dq-*` classes |
| `db/schema.sql` | Future MySQL migration tables |

## How automation works

1. Scam Weather fetches and caches trusted scam/cybersecurity articles.
2. Daily Quiz reads that article cache.
3. It filters toward scam-case-like articles using keywords such as scam, fraud, phishing, impersonation, ransomware, stolen, victim, warning, campaign, bank, parcel, and job scam.
4. It creates a deterministic quiz for the current local date.
5. The quiz is cached in `src/data/dailyQuizQuestions.json` so questions do not change mid-day.
6. Each user's progress is saved in `src/data/dailyQuizProgress.json`.

## Question types

Daily Quiz generates a mix of:

- **Scam type questions** — guess the scam/cyber threat type from a Scam News article.
- **Precaution questions** — choose the safest response to the scam type mentioned.
- **Source-check questions** — identify the trusted source that published the article.
- **Data-signal questions** — answer questions based on the article pool, such as the most common scam type.

## Navbar states

The navbar link is loaded after page load through `/api/daily-quiz/status`:

- **Ready**: bright green and blinks briefly when a page loads.
- **In progress**: gold, indicating the user has started but not finished.
- **Completed**: greyed out, with a hover/click message saying the quiz is already completed.

The blinking is intentionally temporary: CSS animation runs only for a short time, then JavaScript removes the blink class while keeping the link green.

## Rewards

Rewards are awarded once, when all 10 questions are completed:

- +10 EXP per correct answer
- +5 coins per correct answer
- +20 EXP completion bonus
- +10 coins completion bonus

The service updates the existing gamification profile and logs an `xp_events` row using `daily_quiz_completed`. If the user scores 10/10, it also logs `daily_quiz_perfect` so the badge system can award the Perfect Patrol badge.

## Why JSON persistence is used now

Like the current Scam Weather implementation, this feature works immediately with JSON files so the demo does not depend on new database setup. Future MySQL tables are included in `db/schema.sql` for production migration.

## API summary

| Endpoint | Method | Description |
|---|---:|---|
| `/daily-quiz` | GET | Renders the Daily Quiz page |
| `/api/daily-quiz/status` | GET | Returns navbar-ready quiz status |
| `/api/daily-quiz/today` | GET | Returns today's quiz questions without answer keys |
| `/api/daily-quiz/answer` | POST | Grades one answer, saves progress, awards reward on completion |

## Presentation talking point

Daily Quiz is not manually populated. It is a second layer built on Scam Weather: Scam Weather gathers trusted scam/cyber news, then Daily Quiz turns that same article pool into a gamified learning activity.
