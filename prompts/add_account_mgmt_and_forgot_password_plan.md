# Implementation Plan: Account Management & Forgot Password

## 1. Overview

This plan adds two feature groups to the existing Bolão application:

| Feature Group | Summary |
|:---|:---|
| **Account Management** | Users can change their email and password; view/revoke active sessions; soft-delete their account. |
| **Forgot Password** | Email-based "Magic Link" flow for password recovery; rate-limited; with security email alerts. |
| **Manager Overrides** | Managers can force-reset a user's password and temporarily disable a user's TOTP. |

All work **must** comply with the existing security rule: no third-party identity providers; all flows remain in-app and under our infrastructure.

---

## 2. Impact Analysis (Ripple Effect)

### 2.1 Affected Existing Modules

| Module | Impact | Details |
|:---|:---|:---|
| `prisma/schema.prisma` | **MODIFIED** | New model `PasswordResetToken`; new fields on `User` (`deletedAt`, `deletedBy`) and `Session` (`userAgent`, `ipAddress`, `lastActiveAt`). |
| `src/lib/sessions.ts` | **MODIFIED** | Extend session creation to store device metadata; add `listUserSessions()` and `revokeSession()` helpers. `getSessionUser()` must skip soft-deleted users. |
| `src/lib/crypto.ts` | **UNCHANGED** | Reuse existing `encrypt`/`decrypt` for any new encrypted fields. |
| `src/lib/rate-limit.ts` | **MODIFIED** | Add a new rate-limit bucket for password recovery (5 requests / 30 min / email). |
| `src/app/api/auth/*` | **MODIFIED** | Login route must check `deletedAt IS NULL`. Register route must check `deletedAt IS NULL` (prevent re-registration of soft-deleted emails). |
| `src/app/api/notifications/` | **EXTENDED** | New notification type `security_alert` for email-dispatched security events. |
| `.env.example` | **MODIFIED** | Add SMTP variables (required for magic-link and security alerts) and `PASSWORD_RESET_TOKEN_TTL_MINUTES`. |

### 2.2 New Modules

| Module | Purpose |
|:---|:---|
| `src/lib/email.ts` | Thin wrapper around `nodemailer` for sending transactional emails via app-controlled SMTP. |
| `src/lib/password-reset.ts` | Token generation, validation, and consumption logic for the magic-link flow. |
| `src/app/api/auth/forgot-password/route.ts` | API: request magic link. |
| `src/app/api/auth/reset-password/route.ts` | API: consume magic link and set new password. |
| `src/app/api/account/route.ts` | API: update email, update password. |
| `src/app/api/account/sessions/route.ts` | API: list sessions, revoke a session. |
| `src/app/api/account/delete/route.ts` | API: soft-delete own account. |
| `src/app/api/manager/users/[id]/reset-password/route.ts` | API: manager forces password reset for a user. |
| `src/app/api/manager/users/[id]/disable-totp/route.ts` | API: manager temporarily disables a user's TOTP. |
| `src/app/account/page.tsx` | UI: Account management page (edit email, password, sessions, delete). |
| `src/app/auth/forgot-password/page.tsx` | UI: "Forgot password" request form. |
| `src/app/auth/reset-password/page.tsx` | UI: New-password form (reached via magic link). |
| `src/app/manager/users/page.tsx` | UI: Extend existing manager user list with reset/disable-TOTP actions. |

### 2.3 Regression Risks

| Risk | Severity | Mitigation |
|:---|:---|:---|
| Soft-delete breaks foreign-key queries (bets, leaderboard) | MEDIUM | Soft-delete only sets `deletedAt`; all relational data stays. Queries displaying user info must handle `deletedAt IS NOT NULL` gracefully (e.g., show "Conta excluída"). |
| Session metadata (IP, user-agent) exposes PII | LOW | Store only truncated user-agent and hashed IP. Display in account page only. Never log in plaintext. |
| Magic-link token leak via email preview / logs | HIGH | Token is a short-lived, single-use, cryptographically random value. Use HTTPS links. Never log the full URL. |
| Manager TOTP disable could be abused | MEDIUM | Audit log entry created. Notification sent to user. TOTP must be re-enabled before betting. |

---

## 3. Data Model Changes

### 3.1 New Model: `PasswordResetToken`

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    Int
  tokenHash String   // SHA-256 hash of the token (raw token is never stored)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
}
```

### 3.2 Modified Model: `User`

```diff
 model User {
   ...
+  deletedAt    DateTime? // soft-delete timestamp
+  deletedById  Int?      // nullable; self-deletion → own id; manager deletion → manager id

+  passwordResetTokens PasswordResetToken[]
   ...
 }
```

### 3.3 Modified Model: `Session`

```diff
 model Session {
   ...
+  userAgent    String?   // truncated user-agent string
+  ipAddress    String?   // hashed or truncated IP
+  lastActiveAt DateTime  @default(now())
   ...
 }
```

### 3.4 New Model: `AuditLog` (lightweight)

```prisma
model AuditLog {
  id        Int      @id @default(autoincrement())
  actorId   Int      // user who performed the action
  targetId  Int?     // affected user (if applicable)
  action    String   // e.g., "password_reset_forced", "totp_disabled", "account_deleted"
  metadata  String?  // JSON with extra context
  createdAt DateTime @default(now())

  @@index([actorId])
  @@index([targetId])
}
```

---

## 4. Feature Specifications

### 4.1 Account Management

#### FR-AM-01: Change Email

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user (any role). |
| **Endpoint** | `PUT /api/account` with body `{ email: "new@email.com" }`. |
| **Validation** | Must be valid email format. Must not exist in `User` table (including soft-deleted). |
| **Email verification** | **Not required** (per questionnaire answer). The change takes effect immediately. |
| **Security alert** | An email is sent to the **old** email address informing the user that their email was changed. |
| **CSRF** | Protected by existing CSRF middleware. |

**Acceptance Criteria:**
- User can update their email from the account management page.
- A security alert email is sent to the previous email address.
- The new email is immediately effective for login and password recovery.

#### FR-AM-02: Change Password

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user (any role). |
| **Endpoint** | `PUT /api/account` with body `{ currentPassword, newPassword }`. |
| **Validation** | `currentPassword` must match stored hash. `newPassword` must follow the existing complexity policy. |
| **Post-action** | All **other** sessions for this user are revoked (force logout on other devices). Security alert email sent. |

**Acceptance Criteria:**
- User can change their password from the account management page.
- Current password is required for verification.
- All other sessions are invalidated after the change.
- A security alert email is sent.

#### FR-AM-03: View & Revoke Sessions

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user (any role). |
| **List endpoint** | `GET /api/account/sessions` → returns `[ { id, userAgent, ipAddress, lastActiveAt, isCurrent } ]`. |
| **Revoke endpoint** | `DELETE /api/account/sessions/[id]` → deletes session from DB. Cannot revoke current session (use logout instead). |
| **Priority** | Low priority (per questionnaire). Implementation should be straightforward — leverages existing `Session` model. |

**Acceptance Criteria:**
- User sees a list of their active sessions with device info and last activity.
- User can revoke any session except the current one.

#### FR-AM-04: Soft-Delete Account

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user (any role). |
| **Endpoint** | `POST /api/account/delete` with body `{ password }` (password confirmation required). |
| **Behavior** | Sets `deletedAt = now()`, `deletedById = user.id`, `isActive = false`. Revokes **all** sessions. User data (bets, leaderboard entries) remains intact. |
| **Display** | Deleted users appear as "Conta excluída" in leaderboards and bet history. |
| **Re-registration** | The email address is blocked from re-registration while a soft-deleted record exists. |

**Acceptance Criteria:**
- User can request account deletion from the account management page.
- Password confirmation is required.
- User is immediately logged out.
- Historical data is preserved; user identity is hidden in public views.

---

### 4.2 Forgot Password (Magic Link)

#### FR-FP-01: Request Password Recovery

| Aspect | Detail |
|:---|:---|
| **Who** | Unauthenticated user. |
| **Endpoint** | `POST /api/auth/forgot-password` with body `{ email }`. |
| **Flow** | 1. Validate email format. 2. Look up user by email (must be active, not soft-deleted). 3. If not found → return error `"E-mail não encontrado"` (per questionnaire — no enumeration prevention). 4. Rate-limit check: max 5 requests / 30 min per email. 5. Generate cryptographically random token (32 bytes, hex encoded). 6. Store SHA-256 hash of token in `PasswordResetToken` with `expiresAt = now() + TTL` (default 30 min, configurable via `PASSWORD_RESET_TOKEN_TTL_MINUTES`). 7. Invalidate any previous unused tokens for this user. 8. Send magic link email: `{APP_URL}/auth/reset-password?token={rawToken}`. |
| **TOTP** | **Not required** during password recovery flow (per questionnaire). |

**Acceptance Criteria:**
- User can enter their email on the forgot-password page.
- If the email is not registered, a clear error message is shown.
- If the email is valid, a magic link email is sent.
- Requests are rate-limited to 5 per 30 minutes per email.

#### FR-FP-02: Reset Password via Magic Link

| Aspect | Detail |
|:---|:---|
| **Who** | Unauthenticated user with a valid token. |
| **Page** | `GET /auth/reset-password?token=...` → renders a "new password" form if token is valid. |
| **Endpoint** | `POST /api/auth/reset-password` with body `{ token, newPassword }`. |
| **Flow** | 1. Hash the incoming token with SHA-256. 2. Look up `PasswordResetToken` by hash. 3. Validate: not expired, not used, user is active. 4. Update user's `passwordHash`. 5. Mark token as `usedAt = now()`. 6. Revoke **all** existing sessions for this user. 7. Send security alert email: "Sua senha foi redefinida." 8. Redirect to login page. |

**Acceptance Criteria:**
- User can set a new password via the magic link.
- The magic link is single-use and time-limited.
- All existing sessions are revoked after reset.
- A security alert email is sent.

#### FR-FP-03: Total Lockout Scenario

| Aspect | Detail |
|:---|:---|
| **Policy** | If a user forgets their password **AND** loses their TOTP device and backup codes, **there is no automated recovery path** (per questionnaire). |
| **Manager override** | Managers can force-reset password and/or disable TOTP (see §4.3), which serves as the manual recovery mechanism. |

---

### 4.3 Manager Administrative Overrides

#### FR-MO-01: Force Password Reset

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user with role `gerente`. |
| **Endpoint** | `POST /api/manager/users/[id]/reset-password` with body `{ newPassword }`. |
| **Behavior** | Updates user's `passwordHash`. Revokes all user sessions. Creates `AuditLog` entry. Sends security alert email to user. Sends in-app notification to user. |

**Acceptance Criteria:**
- Manager can set a new password for any user.
- The user is forced to log out.
- An audit trail is recorded.
- The user is notified via email and in-app notification.

#### FR-MO-02: Disable User TOTP

| Aspect | Detail |
|:---|:---|
| **Who** | Authenticated user with role `gerente`. |
| **Endpoint** | `POST /api/manager/users/[id]/disable-totp`. |
| **Behavior** | Sets `totpEnabled = false`, clears `totpSecret` and `backupCodes`. Creates `AuditLog` entry. Sends security alert email to user. Sends in-app notification to user. |
| **Post-condition** | The user will be required to re-setup TOTP on next login (existing FR-01 enforcement). TOTP must be re-enabled before betting. |

**Acceptance Criteria:**
- Manager can disable TOTP for a locked-out user.
- The user must re-configure TOTP upon next login.
- An audit trail is recorded. The user is notified.

---

### 4.4 Security Email Alerts (FR-06 Extension)

Automated emails (via app-controlled SMTP) are sent for the following events:

| Event | Recipient | Email Template (subject) |
|:---|:---|:---|
| Password changed (self) | User | "Sua senha foi alterada" |
| Email changed | User (old email address) | "Seu e-mail foi alterado" |
| Password reset via magic link | User | "Sua senha foi redefinida" |
| TOTP disabled by manager | User | "Sua verificação em duas etapas foi desativada" |
| Password forced by manager | User | "Sua senha foi redefinida por um gerente" |
| Account soft-deleted | User | "Sua conta foi excluída" |

---

## 5. API Endpoint Summary

### New Endpoints

| Method | Route | Auth | Role | Description |
|:---|:---|:---|:---|:---|
| `PUT` | `/api/account` | ✅ | any | Update email or password |
| `GET` | `/api/account/sessions` | ✅ | any | List active sessions |
| `DELETE` | `/api/account/sessions/[id]` | ✅ | any | Revoke a session |
| `POST` | `/api/account/delete` | ✅ | any | Soft-delete own account |
| `POST` | `/api/auth/forgot-password` | ❌ | — | Request magic link |
| `POST` | `/api/auth/reset-password` | ❌ | — | Consume magic link, set new password |
| `POST` | `/api/manager/users/[id]/reset-password` | ✅ | gerente | Force password reset |
| `POST` | `/api/manager/users/[id]/disable-totp` | ✅ | gerente | Disable user TOTP |

### Modified Endpoints

| Route | Change |
|:---|:---|
| `POST /api/auth/login` | Add check: reject login if `user.deletedAt IS NOT NULL`. Store `userAgent` and `ipAddress` in session. |
| `POST /api/auth/register` | Add check: reject registration if email belongs to a soft-deleted user. |

---

## 6. UI Pages & Components

### 6.1 New Pages

| Page | Route | Description |
|:---|:---|:---|
| **Minha Conta** | `/account` | Account management hub: edit email, edit password, active sessions list, delete account button. |
| **Esqueci a Senha** | `/auth/forgot-password` | Simple form: email input + submit. Success/error messages. |
| **Redefinir Senha** | `/auth/reset-password` | New-password form with confirmation field. Reached via magic link. Token extracted from URL query parameter. |

### 6.2 Modified Pages

| Page | Change |
|:---|:---|
| `/auth/login` | Add "Esqueci minha senha" link below the login form. |
| `/manager` (dashboard) | Add "Gerenciar Usuários" section with per-user actions: "Redefinir Senha" and "Desativar TOTP". |

### 6.3 New Components

| Component | Purpose |
|:---|:---|
| `SessionList` | Renders the list of active sessions with revoke buttons. |
| `ChangeEmailForm` | Form for changing email address. |
| `ChangePasswordForm` | Form with current password, new password, and confirmation. |
| `DeleteAccountDialog` | Confirmation modal for account deletion (requires password input). |
| `ForgotPasswordForm` | Email input form for requesting magic link. |
| `ResetPasswordForm` | New password + confirmation form. |
| `ManagerUserActions` | Per-user row actions: force password reset and disable TOTP. Includes confirmation dialogs. |

---

## 7. Environment Configuration Changes

### `.env.example` additions

```env
# SMTP (required for magic-link and security alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@bolao2026.com

# Password Recovery
PASSWORD_RESET_TOKEN_TTL_MINUTES=30

# App URL (used in magic links)
APP_URL=http://localhost:3000
```

---

## 8. New Dependencies

| Package | Purpose | Note |
|:---|:---|:---|
| `nodemailer` | Sending transactional emails via SMTP | App-controlled; no external auth service. |
| `@types/nodemailer` | TypeScript types | Dev dependency. |

---

## 9. Implementation Tasks

### Phase 1: Foundation (estimated 2–3 hours)

| # | Task | Details |
|:---|:---|:---|
| 1.1 | **Prisma schema migration** | Add `PasswordResetToken`, `AuditLog` models. Add `deletedAt`, `deletedById` to `User`. Add `userAgent`, `ipAddress`, `lastActiveAt` to `Session`. Run `npx prisma migrate dev`. |
| 1.2 | **Email utility** | Create `src/lib/email.ts` — thin `nodemailer` wrapper with `sendEmail({ to, subject, html })`. Validate SMTP config at startup. |
| 1.3 | **Password-reset utility** | Create `src/lib/password-reset.ts` — functions: `generateResetToken(userId)`, `validateResetToken(rawToken)`, `consumeResetToken(rawToken, newPasswordHash)`. |
| 1.4 | **Rate-limit bucket** | Add a `forgotPassword` rate-limit configuration: 5 requests / 30 min / email key. |
| 1.5 | **Session metadata** | Modify `createSession()` to accept and store `userAgent` and `ipAddress`. Add `listUserSessions(userId)` and `revokeSession(sessionId, userId)`. |
| 1.6 | **Soft-delete helpers** | Modify `getSessionUser()` to exclude users with `deletedAt IS NOT NULL`. Create helper `softDeleteUser(userId, actorId)`. |
| 1.7 | **Audit log helper** | Create `src/lib/audit.ts` — function `logAuditEvent({ actorId, targetId, action, metadata })`. |
| 1.8 | **Update .env.example** | Add new SMTP, `PASSWORD_RESET_TOKEN_TTL_MINUTES`, and `APP_URL` variables. |

### Phase 2: Account Management APIs (estimated 2–3 hours)

| # | Task | Details |
|:---|:---|:---|
| 2.1 | **PUT /api/account** | Handle `email` and `password` updates. Send security alert emails. Revoke other sessions on password change. |
| 2.2 | **GET /api/account/sessions** | Return list of user's sessions with metadata and `isCurrent` flag. |
| 2.3 | **DELETE /api/account/sessions/[id]** | Revoke a specific session (must belong to requesting user, cannot be current). |
| 2.4 | **POST /api/account/delete** | Verify password. Soft-delete user. Revoke all sessions. Send confirmation email. |
| 2.5 | **Update login/register** | Login: reject soft-deleted users. Register: reject emails belonging to soft-deleted users. Login: store session metadata. |

### Phase 3: Forgot Password APIs (estimated 1–2 hours)

| # | Task | Details |
|:---|:---|:---|
| 3.1 | **POST /api/auth/forgot-password** | Validate email, rate-limit, generate token, invalidate old tokens, send magic link email. |
| 3.2 | **POST /api/auth/reset-password** | Validate token, update password hash, mark token used, revoke sessions, send security alert. |

### Phase 4: Manager Override APIs (estimated 1–2 hours)

| # | Task | Details |
|:---|:---|:---|
| 4.1 | **POST /api/manager/users/[id]/reset-password** | Validate manager role. Update password. Revoke sessions. Audit log. Notifications. |
| 4.2 | **POST /api/manager/users/[id]/disable-totp** | Validate manager role. Clear TOTP fields. Audit log. Notifications. |

### Phase 5: UI Pages & Components (estimated 3–4 hours)

| # | Task | Details |
|:---|:---|:---|
| 5.1 | **Account management page** (`/account`) | Build `ChangeEmailForm`, `ChangePasswordForm`, `SessionList`, `DeleteAccountDialog` components. Compose into page layout consistent with existing design system. |
| 5.2 | **Forgot-password page** (`/auth/forgot-password`) | Build `ForgotPasswordForm`. Add link from login page. |
| 5.3 | **Reset-password page** (`/auth/reset-password`) | Build `ResetPasswordForm`. Handle token extraction from URL. Display errors (expired, invalid, used). |
| 5.4 | **Manager user actions** | Extend manager dashboard/user list with `ManagerUserActions` component (force reset password, disable TOTP buttons with confirmation dialogs). |
| 5.5 | **Navigation updates** | Add "Minha Conta" link in the authenticated user menu/navigation. Add "Esqueci minha senha" link on the login page. |

### Phase 6: Email Templates (estimated 1 hour)

| # | Task | Details |
|:---|:---|:---|
| 6.1 | **Create email templates** | Build simple HTML email templates (inline CSS, responsive) for: magic-link recovery, password changed, email changed, TOTP disabled, password forced by manager, account deleted. All in pt-BR. |

### Phase 7: Testing (estimated 2–3 hours)

| # | Task | Details |
|:---|:---|:---|
| 7.1 | **Unit: password-reset logic** | Token generation, hash verification, expiry, single-use enforcement. |
| 7.2 | **Unit: soft-delete** | `getSessionUser()` rejects deleted users. Leaderboard/bets display handles deleted users. |
| 7.3 | **Unit: rate-limiting** | Forgot-password respects 5/30min limit. |
| 7.4 | **Integration: forgot-password flow** | Request → email sent → click link → new password → login succeeds with new password, fails with old. |
| 7.5 | **Integration: account management** | Change email → old email gets alert. Change password → other sessions revoked. Delete account → can't login. |
| 7.6 | **Integration: manager overrides** | Force reset → user must re-login. Disable TOTP → user must re-setup TOTP. Non-managers get 403. |
| 7.7 | **Manual QA** | Magic link in different email clients. Session list on multiple devices. Soft-delete display in leaderboard. |

---

## 10. Total Estimated Effort

| Phase | Estimate |
|:---|:---|
| Phase 1: Foundation | 2–3 h |
| Phase 2: Account Management APIs | 2–3 h |
| Phase 3: Forgot Password APIs | 1–2 h |
| Phase 4: Manager Override APIs | 1–2 h |
| Phase 5: UI Pages & Components | 3–4 h |
| Phase 6: Email Templates | 1 h |
| Phase 7: Testing | 2–3 h |
| **Total** | **12–18 h** |

---

## 11. Edge Cases & Open Decisions

| # | Edge Case | Decision |
|:---|:---|:---|
| 1 | User changes email to one that already exists (including soft-deleted) | Reject with error: "Este e-mail já está em uso." |
| 2 | Magic link opened after token expires | Show user-friendly error: "Este link expirou. Solicite uma nova recuperação de senha." |
| 3 | Magic link opened after it was already used | Show error: "Este link já foi utilizado." |
| 4 | User tries to delete account while having active bets in an ongoing championship | Allow deletion. Bets remain locked and scored normally. Display "Conta excluída" in standings. |
| 5 | Manager disables TOTP for a user who never had it enabled | No-op. Return success with message indicating TOTP was not enabled. |
| 6 | SMTP not configured | Magic-link and security alerts will fail gracefully. Log errors. The app should still function for non-email features. A startup warning should be emitted if `SMTP_HOST` is empty. |
| 7 | Concurrent password reset requests | Only the latest token is valid (previous ones are invalidated on generation). |

---

## 12. Requirements Traceability

| New Requirement | Source (Questionnaire #) | Related Existing FR/NFR |
|:---|:---|:---|
| FR-AM-01: Change Email | Q1 | FR-01 (User accounts) |
| FR-AM-02: Change Password | Q1 | FR-01, NFR-01 (Security) |
| FR-AM-03: View & Revoke Sessions | Q3 | FR-01, NFR-01 |
| FR-AM-04: Soft-Delete Account | Q4 | NFR-02 (Data & Privacy) |
| FR-FP-01: Request Password Recovery | Q5, Q7, Q8, Q9 | FR-01, NFR-01 |
| FR-FP-02: Reset Password via Magic Link | Q5, Q7 | FR-01, NFR-01 |
| FR-FP-03: Total Lockout Policy | Q6 | FR-01 |
| FR-MO-01: Force Password Reset | Q11 | FR-01, FR-02 |
| FR-MO-02: Disable User TOTP | Q11 | FR-01, FR-02 |
| Security Email Alerts | Q10 | FR-06 (Notifications) |