# M5 Security Scans and Dependency Upkeep — Liam

## Purpose

This security layer runs beside the main CI merge gate. It reports known weaknesses and outdated libraries, but it is intentionally **warn-only** so a scanner failure or late security finding cannot block the team's merge. The blocking quality gate remains in `.github/workflows/ci.yml`.

## Files owned

- `.github/workflows/security.yml`
- `.github/dependabot.yml`
- `.github/workflows/monitoring.yml`

## What is scanned

### 1. npm audit

`npm audit --audit-level=high` checks the exact packages recorded in `package-lock.json` against npm's vulnerability advisory database. It reports high and critical dependency vulnerabilities.

### 2. Trivy

Trivy builds and scans the ScamPatrol Docker image. It checks the operating-system packages and application dependencies inside the finished image for known high and critical vulnerabilities. Results are exported as SARIF and uploaded to GitHub's **Security → Code scanning** page where repository permissions allow it.

### 3. CodeQL

CodeQL analyses the project's JavaScript source code for insecure coding patterns and data flows. This checks code written by the team rather than only third-party libraries.

### 4. Gitleaks

Gitleaks scans the repository's Git history for credentials accidentally committed as text, such as API keys, passwords, tokens, and private keys. A leaked real secret must be rotated even if it is later removed from the latest file because it may remain in Git history.

### 5. Dependabot

Dependabot checks three dependency ecosystems every week:

- npm packages from `package.json` and `package-lock.json`
- the base image referenced by `Dockerfile`
- GitHub Actions used by workflow files

When an update is available, Dependabot opens a pull request so the team can review, test, and merge it rather than changing versions blindly.

## What a warning means

A warning means the scanner found something requiring review. It does **not** prove that ScamPatrol is currently exploitable. The team should confirm:

1. whether the affected package or code path is actually used;
2. the severity and likely impact;
3. whether a safe patched version exists;
4. whether upgrading causes breaking changes.

## Fix priority

1. Exposed or committed real secrets: rotate immediately and remove them from current files; consider cleaning Git history.
2. Critical vulnerabilities that are reachable from the internet or authentication routes.
3. High vulnerabilities with a safe non-breaking update.
4. Lower-risk or unreachable findings, documented and scheduled for later maintenance.

## Why the jobs do not block merges

Every security job uses `continue-on-error: true`, and Trivy uses `exit-code: "0"`. This keeps the security workflow separate from Shania's merge gate. Findings remain visible for investigation without stopping the rest of the team.

## Demo checklist

- Open a pull request and show **Actions → Security Scans (Warn Only)**.
- Show the `npm audit` job output.
- Show the Trivy job and, when available, its result under **Security → Code scanning**.
- Open one real Dependabot pull request and explain what changed.
- Pick one finding and explain its severity, whether it is reachable, and the safest remediation.

## Why there are two Gitleaks checks

The two checks have different scopes and enforcement roles; they are not identical duplicate gates.

| Location | When it runs | What it scans | Result |
|---|---|---|---|
| `.github/workflows/ci.yml` | Pull requests to `main` | The proposed working tree and only the commits introduced by that pull request | **Blocking:** a newly introduced secret prevents the pull request from merging |
| `.github/workflows/security.yml` | Pushes to `main`, the weekly schedule, and manual runs | The repository's complete Git history | **Advisory:** detects older leaks or secrets recognised by newer Gitleaks rules without duplicating the PR scan |

The CI scan answers, **“Is this pull request introducing a secret?”** The security audit answers, **“Does any history already stored in the repository now match a secret-detection rule?”** The full-history audit is skipped on pull-request events so the same PR is not scanned twice for the same purpose.

## Production uptime monitoring

`.github/workflows/monitoring.yml` checks Scam Patrol's public `/api/health` endpoint every 15 minutes and can also be launched manually. This is the deep health endpoint: it returns success only when both the Express application and MySQL database are available.

The workflow:

1. uses the repository variable `MONITOR_URL` when configured, otherwise it falls back to `http://<EC2_HOST>/api/health` using the existing `EC2_HOST` secret;
2. retries brief network failures to reduce false alarms;
3. verifies both `status: "ok"` and `db: "up"` in the JSON response;
4. opens one GitHub issue when downtime is detected, adding comments to the same issue during continued failure rather than creating unlimited duplicates;
5. closes that issue automatically after the health check recovers; and
6. marks the workflow run as failed so downtime is visible in GitHub Actions and notifications.

### Monitoring setup

For the clearest configuration, create this repository variable under **Settings → Secrets and variables → Actions → Variables**:

```text
MONITOR_URL=https://your-production-domain.example/api/health
```

When no domain is available, the existing `EC2_HOST` Actions secret is used with HTTP on port 80. GitHub scheduled workflows may start a few minutes later than the exact cron time during periods of high Actions load, so this is periodic monitoring rather than a real-time service-level guarantee.
