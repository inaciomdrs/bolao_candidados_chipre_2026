# Project: Bolão — 2026 Chess Candidates Tournament (Fun betting pool)

## Summary
A small web platform (no money involved) to let friends run a bets pool for the 2026 Chess Candidates Tournament. Stack: Next.js (server-side rendering + API routes), Node.js runtime, and Prisma ORM. Must support SQLite (development) and PostgreSQL (production) via `DATABASE_URL`. Environment/tooling: use Node environment manager (volta/nvm) and pnpm/npm. Two-factor authentication (TOTP) is mandatory for all accounts and must be implemented in-app (no third-party identity providers). In‑app notifications only.

## Important security rule (non-negotiable)
- All authentication and security mechanisms (password storage, session handling, 2‑factor/TOTP, rate limiting, account recovery flows, CSRF protections, identity verification) MUST be implemented and hosted within this application or its own controlled infrastructure. Integration with third‑party identity services or external auth providers (Auth0, Firebase Auth, Okta, AWS Cognito, third‑party single sign-on, social logins, or any external identity-as-a-service) is strictly prohibited. Using well‑tested npm libraries for cryptographic primitives (bcrypt, otplib, etc.) is allowed and recommended; but the authentication flows, secrets, and user secrets storage must remain under the app's control and not rely on external services.

## Scope
- User registration, authentication (TOTP), roles (`boleiro`, `gerente`).
- Managers register championships, rounds, matches and enter results manually.
- Players place bets on matches; bets lock 10 minutes before match start; bets editable/cancelable before lock.
- Automatic leaderboard and scoring.
- Calendar and "next games" views.
- Minimal, accessible UI (Portuguese-BR default; clean/minimal design for 30–60 yo NE-Brazilian men).
- Strict security and privacy measures; example `.env` provided.

## Assumptions
- No monetary transactions; purely fun.
- Managers will enter results manually (no external API integration required).
- Use Next.js for SSR and API routes; server runs on Node.js.
- Templates/views rendered server-side (React server components or EJS-like pages via Next.js) — not a pure SPA unless later requested.
- Database selectable via `DATABASE_URL` (SQLite for development; PostgreSQL for production).

---

# Actors
- Boleiro (player): register, login, place/edit/cancel bets before lock, view leaderboard, calendar, next games, receive in-app notifications.
- Gerente (manager): create/edit championships, rounds, schedule matches, enter results, manage users.
- System: enforces bet lock, calculates leaderboard, sends in-app notifications, enforces security.

---

# Functional Requirements (FR)

FR-01: User accounts
- Users can register and confirm accounts (email confirmation optional but recommended). Email sending may use configured SMTP for app-controlled mail; do not outsource authentication flows to third-party identity services.
- Roles: `boleiro` and `gerente`. Only `gerente` can access management UI and protected APIs.
- Passwords: hashed with a strong algorithm (bcrypt/argon2 via a vetted npm library) and must follow a configurable complexity policy.
- Two-factor authentication: TOTP mandatory before betting. Provide TOTP setup (QR code + manual secret), backup codes, and TOTP verification flows.
- Acceptance: user can enable/verify TOTP using built-in flows; TOTP secrets stored encrypted or protected and never transmitted to external services.

FR-02: Manager capabilities
- Managers create/edit/delete Championship, Round, Match.
- Match fields: `id`, `championship`, `round`, `player_white`, `player_black`, `start_datetime` (TZ aware), `status` (scheduled/ongoing/finished), optional `venue`/`round_number`.
- Managers enter final result manually (white_win/draw/black_win) and optional score notation.
- Acceptance: publishing a result updates bets, scores, and generates notifications.

FR-03: Bets
- Bet model: `id`, `userId`, `matchId`, `predicted_outcome` (white_win/draw/black_win), `predicted_winner` (white/black/null), `createdAt`, `updatedAt`, `locked` (boolean) or `lockedAt` timestamp.
- Locking: bets automatically become immutable 10 minutes before `match.start_datetime` (server local time or championship timezone). API must enforce lock on create/edit/delete.
- Cancellation: allowed before lock.
- Acceptance: attempts to place/edit/cancel within lock window return a clear error.

FR-04: Scoring & Leaderboard
- Scoring rules (configurable):
  - Correct outcome (win/draw/lose): +1 point.
  - If match has a winner (not draw) and user predicted the correct player: additional +2 points.
- Leaderboard updates immediately after a result is published. Ranking: total points, tie-breakers configurable (default: fewer total bets, then most recent correct predictions).
- Acceptance: leaderboard shows totals and per-user breakdown.

FR-05: Calendar & Next Games
- Calendar grouped by date; filters for championship and round.
- Next games widget: shows next N upcoming matches (configurable; default N=5).

FR-06: In-app Notifications
- Events: bet locked, match result published (for users who bet on the match), leaderboard top3 changes, manager announcements.
- Notifications stored in the app DB; shown in-app with read/unread state and timestamp.
- No email/SMS notifications for these events by default (optional announcement emails may be allowed but must not be used for authentication flows).

FR-07: Exports & Admin
- CSV export of leaderboard and bets per championship (manager only).
- Admin UI: Next.js admin pages or use Node-based admin; superuser access reserved for local admins. Managers may be granted admin-like privileges.

---

# Non-Functional Requirements (NFR)

NFR-01: Security
- HTTPS required in production. Enforce `Secure` and `HttpOnly` cookies, strong CSP, and CSRF protections.
- Store secrets in `.env`; include `.env.example` in repo.
- Rate limiting on login and critical APIs.
- Do not log sensitive data (passwords, TOTP secrets, tokens).
- No third-party identity providers or auth-as-a-service allowed.
- Use well-maintained npm libraries for crypto primitives (bcrypt, otplib) but design flows and data storage internally.

NFR-02: Data & Privacy
- Minimal PII: name, email, role. No payment data.
- Provide user account deletion workflow; managers cannot delete other users without audit trail.
- Recommend periodic DB backups for production.

NFR-03: Reliability & Performance
- Small userbase; leaderboard computed near-real-time and cached per championship to reduce recompute.

NFR-04: Accessibility & UX
- Clear fonts, large controls, high contrast; Portuguese (pt-BR) default.

NFR-05: Portability
- Support SQLite (dev) and PostgreSQL (prod) via `DATABASE_URL`.
- Use Prisma (or equivalent ORM) and migrations; avoid DB‑specific SQL.

---

# Technical Requirements & Implementation Notes (JS-specific)

TR-01: Stack
- Framework: Next.js (SSR + API routes).
- Runtime: Node.js (LTS), package manager pnpm or npm.
- ORM: Prisma (recommended) or TypeORM/Sequelize as alternatives.
- TOTP & crypto: `otplib` for TOTP generation/verification, `bcrypt` or `argon2` for password hashing, `crypto` built-in for server-side secrets. Use vetted libraries for primitives only.
- Session management: server-side sessions stored in DB (session table) or secure signed cookies; prefer server-stored session records with session id in HttpOnly cookie.
- Static files: Next.js static handling and `next build`/`next start` for production.

TR-02: Database
- Use `DATABASE_URL`, default `sqlite:./dev.db` for development and Postgres URL in production.
- Provide Prisma schema and migrations.

TR-03: Background tasks
- Not mandatory. Use scheduled cron jobs (server cron or a small worker) or Next.js background job via a dedicated worker process for periodic tasks (e.g., ensuring bets are locked). Simple Node scripts run by cron are acceptable.

TR-04: CI & Tests
- Unit tests: Jest + Testing Library for React components; test scoring, locking, notification generation.
- Integration tests: Supertest for API routes.

TR-05: Deployment
- Recommend Render, Railway, Fly, or Vercel (for Next.js) with managed Postgres. Deploy only after ensuring secrets and DB credentials are kept out of repo.

TR-06: Environment precedence
- The application MUST support configuration from both OS environment variables and a `.env` file in the project root. At runtime the project must check both sources and give precedence to OS environment variables over values found in `.env`. The `.env` loader is only a fallback — do not overwrite existing `process.env` values with `.env` values.

TR-07: Local-run documentation
- The repository MUST include a top-level `README.md` with step-by-step, copy-paste instructions for downloading/cloning the code and running it locally on a fresh machine. The README must include Node version (or Volta/nvm setup), package manager commands, how to populate environment variables (using `.env.example`), how to run migrations, start the development server, and how to run the test suite. The README should be validated to work on a fresh environment. **Acceptance**: a `README.md` at project root with working local-run instructions, and application behavior that prioritizes OS env vars over `.env` values.

---

# Data Model (overview)

- User
  - id, email, name, role (`boleiro`|`gerente`), password_hash, totp_secret (encrypted), is_active, createdAt

- Championship
  - id, name, slug, timezone, description, createdBy (userId), createdAt

- Round
  - id, championshipId, name/number, order

- Match
  - id, championshipId, roundId, playerWhite, playerBlack, startDatetime (ISO with TZ), status, resultCode (white_win/draw/black_win), resultDetails

- Bet
  - id, userId, matchId, predictedOutcome, predictedWinner, createdAt, updatedAt, lockedAt (nullable)

- Notification
  - id, userId, type, payload (json), isRead, createdAt

- LeaderboardEntry (computed/cached)
  - id, userId, championshipId, totalPoints, lastUpdate

---

# API / URL Endpoints (suggested for Next.js API routes)

- GET / -> Dashboard (next games + leaderboard summary)
- GET /championships -> list
- GET /championships/[slug] -> championship details + calendar
- GET /championships/[slug]/matches/[id] -> match detail + bet form
- POST /api/championships/[slug]/matches/[id]/bets -> place/edit bet (server validates lock)
- GET /api/leaderboard/[championship] -> leaderboard data (JSON)
- GET /api/notifications -> list
- POST /api/manager/... -> manager CRUD endpoints (protected, `gerente` only)
- Auth: /auth/login, /auth/logout, /auth/register, /auth/totp/setup, /auth/totp/verify (API routes)

All state-changing POST/PUT/DELETE routes protected by CSRF tokens and session checks. Use server-side middleware to enforce role permissions.

---

# .env.example

```
# App
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Bolao
PORT=3000
SECRET_KEY=your-secret-key
# Database
DATABASE_URL=sqlite:./dev.db
# Mail (optional, app-controlled SMTP server only)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
# Security
TIME_ZONE=America/Sao_Paulo
LANGUAGE_CODE=pt-BR
# TOTP
TOTP_ISSUER=Bolao-2026
```

Note: keep all secrets out of VCS and rotate them if leaked.

# Dependencies (example `package.json` dev/runtime suggestions)
- next
- react
- react-dom
- prisma
- @prisma/client
- bcrypt (or argon2)
- otplib
- jsonwebtoken (if used for short-lived tokens; prefer server sessions)
- cookie / cookie-signature
- csurf or custom CSRF middleware
- helmet (for security headers)
- rate-limiter-flexible (rate limiting)
- jest, supertest (testing)

---

# Testing Strategy
- Unit tests:
  - Scoring logic: all outcome permutations and tie-breakers.
  - Bet locking: timezone-aware tests ensuring lock allowed before and forbidden after lock.
  - Notification generation after result publish.
- Integration tests:
  - End-to-end flow: manager creates match → user bets → manager publishes result → leaderboard and notifications update.
- Manual QA:
  - TOTP setup and login flows.
  - Accessibility checks (contrast, large controls).

---

# Implementation Plan (suggested tasks)
1. Project bootstrap (Next.js + Prisma + Node env) — 60–120 min.
2. Auth + TOTP (in-app, using otplib + bcrypt) — 3–6 hours.
   - Implement server-side sessions, password hashing, TOTP setup/verify, backup codes, account recovery flows.
3. Championship & Match models + manager UI — 3–6 hours.
4. Bets model + UI (locking enforcement) — 3–6 hours.
5. Scoring engine & Leaderboard (caching) — 2–4 hours.
6. Notifications (in-app) — 1–3 hours.
7. Calendar & Next Games UI — 1–2 hours.
8. Tests, docs, and deployment — 2–4 hours.

---

# Risks & Mitigations
- Security (HIGH): improper handling of TOTP secrets, weak password storage.
  - Mitigation: use vetted crypto libs for primitives, server-side sessions, strong secret management, avoid home-grown crypto where libraries are necessary.
- Timing/locking (MEDIUM): timezone and DST edge cases.
  - Mitigation: store datetimes in UTC, render in championship timezone, extensive tests for DST.
- Hosting constraints (LOW/MEDIUM): free hosts may sleep or restrict DB features.
  - Mitigation: use light-weight Postgres on recommended providers and keep backups.

---

# Acceptance Criteria (per feature)
- Users can register, enable TOTP, login with TOTP (all handled by the app).
- Managers create championships/matches and publish results manually.
- Bets cannot be placed/edited/cancelled within 10 minutes of match start.
- Scoring follows the defined formula and leaderboard updates immediately.
- Notifications appear in-app and show unread counts.
- App runs using SQLite and PostgreSQL via `DATABASE_URL` with no code changes beyond env.
- No external authentication providers; all auth/security flows remain implemented and controlled by this application.

---

# Next steps (suggested)
- Confirm preferred ORM (Prisma recommended) and package manager (pnpm/npm).
- If confirmed, I can scaffold a minimal Next.js project with authentication/TOTP skeleton and Prisma schema.
