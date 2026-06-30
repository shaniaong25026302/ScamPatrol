# Member 5 Integration Guide — Points, Leaderboard, and Badges

Owner: Liam  
Feature branch: `feature/liam-points`

This feature provides:

- Leaderboard page sorted by total points, highest to lowest
- Internal points API for teammates to call from other features
- Badge system for account, report, comment, and point milestones

## Current implementation status

This version uses in-memory mock data so the feature can run before the team's MySQL schema is fully merged.

Later, replace the storage inside `services/pointsService.js` with MySQL queries while keeping the same exported functions and API routes.

## Main page

```txt
GET /leaderboard
```

Shows all tracked users sorted by points in descending order.

## Useful API endpoints

### Get leaderboard as JSON

```txt
GET /api/points/leaderboard
```

### Get points and badge rules

```txt
GET /api/points/config
```

### Get one user's progress

```txt
GET /api/points/users/:userId
```

### Get one user's points transaction history

```txt
GET /api/points/users/:userId/transactions
```

## Teammate integration endpoints

### When Shania's auth system creates a new account

```txt
POST /api/points/account-created
```

Example body:

```json
{
  "userId": 12,
  "username": "Aisha"
}
```

Awards the account badge: `Welcome to ScamLah`.

### When Rebecca's report form submits a scam case

```txt
POST /api/points/report-submitted
```

Example body:

```json
{
  "userId": 12,
  "username": "Aisha",
  "relatedType": "case",
  "relatedId": 88
}
```

Adds `+10` points and increments `reportCount`.

### When CG's comment feature posts a comment

```txt
POST /api/points/comment-posted
```

Example body:

```json
{
  "userId": 12,
  "username": "Aisha",
  "relatedType": "comment",
  "relatedId": 104
}
```

Adds `+2` points and increments `commentCount`.

### When Shawn's admin panel verifies a case

```txt
POST /api/points/case-verified
```

Example body:

```json
{
  "userId": 12,
  "username": "Aisha",
  "relatedType": "case",
  "relatedId": 88
}
```

Adds `+20` points and increments `verifiedCaseCount`.

## Generic event endpoint

If teammates prefer one endpoint for everything:

```txt
POST /api/points/event
```

Example body:

```json
{
  "userId": 12,
  "username": "Aisha",
  "eventType": "REPORT_SUBMITTED",
  "relatedType": "case",
  "relatedId": 88
}
```

Valid event types:

- `ACCOUNT_CREATED`
- `REPORT_SUBMITTED`
- `COMMENT_POSTED`
- `CASE_VERIFIED`
- `UPVOTE_RECEIVED`
- `CONTENT_REMOVED`

## Point values

These are stored at the top of `services/pointsService.js`:

```js
const POINT_VALUES = {
  ACCOUNT_CREATED: 0,
  REPORT_SUBMITTED: 10,
  COMMENT_POSTED: 2,
  CASE_VERIFIED: 20,
  UPVOTE_RECEIVED: 1,
  CONTENT_REMOVED: -10
};
```

To change point rewards later, edit this object only.

## Badge milestones

Badges are stored in `BADGE_DEFINITIONS` inside `services/pointsService.js`.

Current badge paths:

- Account created: `Welcome to ScamLah`
- First report: `First Report!`
- 5 reports: `Report Scout`
- 10 reports: `Scam Hunter`
- 25 reports: `Case Champion`
- First comment: `First Comment!`
- 5 comments: `Helpful Reply`
- 10 comments: `Community Voice`
- 25 comments: `Discussion Leader`
- 10 points: `Getting Started`
- 50 points: `Community Helper`
- 100 points: `Top Contributor`
- 250 points: `ScamLah Hero`

## PowerShell test commands

Start the app:

```powershell
npm start
```

Create account badge:

```powershell
curl -Method POST http://localhost:3000/api/points/account-created -Headers @{"Content-Type"="application/json"} -Body '{"userId":12,"username":"Aisha"}'
```

Submit report points:

```powershell
curl -Method POST http://localhost:3000/api/points/report-submitted -Headers @{"Content-Type"="application/json"} -Body '{"userId":12,"username":"Aisha","relatedType":"case","relatedId":88}'
```

Post comment points:

```powershell
curl -Method POST http://localhost:3000/api/points/comment-posted -Headers @{"Content-Type"="application/json"} -Body '{"userId":12,"username":"Aisha","relatedType":"comment","relatedId":104}'
```

Then refresh:

```txt
http://localhost:3000/leaderboard
```
