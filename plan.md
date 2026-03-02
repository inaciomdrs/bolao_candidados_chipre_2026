## Plan: Bolão Implementation (Next.js + Prisma)

TL;DR — Implement a Next.js (TypeScript) app with Prisma, server-side DB sessions, and in‑app TOTP per `requirements_js.md`. Key decisions: Prisma + TypeScript, `npm`, server-side DB sessions, symmetric env AES key for encrypting TOTP secrets, and API-call-only bet-lock enforcement. The plan covers scaffolding, authentication/TOTP, models/migrations, manager and user flows, scoring/leaderboard, notifications, tests, and GitHub Actions CI.

**Steps**
1. Project bootstrap
- Create `package.json`, `README.md`, `.env.example`, and Next.js scaffolding under `app/` or `pages/`.
- Add `tsconfig.json`, ESLint/Prettier, and Tailwind (optional).
- Install deps: `next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `bcrypt`/`argon2`, `otplib`, `helmet`, `csurf`, `rate-limiter-flexible`, `jest`, `supertest`.

2. Database & ORM
- Add `prisma/schema.prisma` defining `User`, `Championship`, `Round`, `Match`, `Bet`, `Notification`, `LeaderboardEntry`.
- Create initial migration and a seed script for dev (SQLite); support `DATABASE_URL` for Postgres in prod.

3. Auth & TOTP
- Implement API routes: `pages/api/auth/register.ts`, `login.ts`, `logout.ts`, `totp/setup.ts`, `totp/verify.ts`.
- Server-side sessions: `lib/sessions.ts` with a `sessions` table; session id in an HttpOnly cookie; middleware to attach `req.user`.
- TOTP: use `otplib`; encrypt secrets with AES-GCM using `SECRET_KEY` in `lib/crypto.ts`. Provide backup codes generation.

4. Manager CRUD
- Manager APIs under `pages/api/manager/*` and UI under `app/manager` or `pages/manager`.
- Match model fields: `id`, `championshipId`, `roundId`, `playerWhite`, `playerBlack`, `startDatetime` (store UTC), `status`, `resultCode`, `resultDetails`.
- Enforce `gerente` role with middleware on protected routes.

5. Bets & Locking
- Bets API `pages/api/bets/[matchId].ts`; model includes `lockedAt`.
- Enforce lock on each state-changing API call: server checks `now >= match.startDatetime - 10 minutes` (UTC) and rejects with clear error.
- Client: disable bet form when locked and surface server message.

6. Scoring & Leaderboard
- Scoring engine in `lib/scoring.ts` (`+1` outcome, `+2` extra for correct player when decisive).
- Compute leaderboard on result publish; cache per championship in `LeaderboardEntry` with `lastUpdate`.

7. Notifications
- Model + API `pages/api/notifications.ts`; generate on events (bet locked, result published, leaderboard top3 changes).
- UI component `components/Notifications.tsx` showing unread/read state.

8. Calendar & Next Games
- Calendar component `components/Calendar.tsx`, championship page `pages/championships/[slug].tsx`.
- Next games widget shows next N matches (default N=5).

9. Exports & Admin
- CSV export endpoints `pages/api/exports/leaderboard.csv.ts` (manager only).
- Admin UI for exports and user management.

10. Tests & CI
- Unit tests (Jest) for scoring, locking, TOTP.
- Integration tests (Supertest) for manager → user → result flows.
- GitHub Actions at `.github/workflows/ci.yml` to run lint, build, tests on push/PR.

11. Docs & README
- `README.md` with Node version, `npm` commands, `.env.example` usage, migrations, seeding, local-run, and test instructions.
- Document env precedence (OS env > `.env`).

**Verification**
- Local dev steps:

npm install
DATABASE_URL="sqlite:./dev.db" npm run prisma:migrate
npm run dev
npm test

Acceptance checks:
- Register → enable TOTP → login with TOTP.
- Manager creates match → user places bet → attempt to change within 10‑minute lock returns error.
- Manager publishes result → leaderboard updates and notifications created.
- CI passes.

**Decisions**
- ORM/Language: Prisma + TypeScript
- Package manager: npm
- Sessions: server-side DB sessions (session table + HttpOnly cookie)
- TOTP encryption: AES-GCM with `SECRET_KEY`
- Bet locking: enforced at API-call time (no background worker)
- CI: GitHub Actions; tests use Jest + Supertest

**Critical files (1–2 line description + key example)**
- `package.json`: project scripts and deps; includes `dev`, `build`, `test`.
- `README.md`: local-run and migration steps.
- `tsconfig.json`: TypeScript config.
- `.env.example`: example env vars; example line: `DATABASE_URL=sqlite:./dev.db`.
- `prisma/schema.prisma`: Prisma models for User/Match/Bet/Notification; example model name `model User { id Int @id @default(autoincrement()) ... }`.
- `lib/crypto.ts`: AES-GCM helpers to `encrypt`/`decrypt` TOTP secrets; example: `encrypt(secret, process.env.SECRET_KEY)`.
- `lib/sessions.ts`: DB-backed session store and helpers.
- `lib/scoring.ts`: scoring logic exported as `computeScores(matches, bets)`.
- `pages/api/auth/*`: register/login/logout/totp endpoints.
- `pages/api/bets/[matchId].ts`: create/edit/cancel bet; enforces lock check.
- `pages/api/manager/*`: manager CRUD for championships/rounds/matches.
- `pages/api/notifications.ts`: list/mark-read endpoints.
- `components/Notifications.tsx`: in-app notification UI.
- `__tests__/*`: unit and integration tests.
- `.github/workflows/ci.yml`: CI pipeline.

Estimated effort (rough)
- Bootstrap & deps: 2–4 hours
- Data model + migrations: 2–4 hours
- Auth + TOTP + sessions: 6–10 hours
- Manager + match CRUD: 3–6 hours
- Bets/locking + scoring: 4–8 hours
- Notifications + UI: 3–6 hours
- Tests & CI: 3–6 hours
Total: ~23–44 hours (3–6 working days)

Next: I can either (A) paste this into `plan.md` for you, (B) retry writing the file from here, or (C) start scaffolding the top-level files (`package.json`, `prisma/schema.prisma`, `README.md`) now. Which do you want?
