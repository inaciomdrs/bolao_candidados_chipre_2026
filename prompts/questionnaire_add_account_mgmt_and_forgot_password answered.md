# Questionnaire for Feature Integration: Account Management & Forgot Password

## Context & Objectives
As the Requirements Engineer, my goal is to ensure the **Account Management** and **Forgot Password** features seamlessly integrate into the existing Next.js/Prisma Bolão application. 

Given the system's strict architectural and security constraints—specifically the mandatory in-app Two-Factor Authentication (TOTP) and the absolute prohibition of third-party identity providers—we need to clarify how these features will handle edge cases, protect against abuse, and deliver a smooth experience for our target demographic (30–60 yo NE-Brazilian men).

Please answer the following questions so we can specify the "Minimum Viable Feature" (MVF) and draft the precise Technical and Non-Functional Requirements.

---

## 1. Scope of Account Management (User Profile)
1. **Editable Fields:** Beyond changing their password, which specific profile fields should users be able to edit? (e.g., Name, Email).

Answer: just e-mail and password. 

---
2. **Email Verification:** If a user changes their email address, does the system require them to verify the new email (via an SMTP confirmation link) before the change takes effect? 

Answer: no.

---
3. **Session Revocation:** Should the account management area allow users to view their active sessions and forcefully log out of other devices?

Answer: yes, but it is not a priority. besides, there should not have too much effor for this.

---
4. **Account Deletion (NFR-02):** The requirements mention a user account deletion workflow. Should this be a "hard delete" (removing all data) or a "soft delete" (anonymizing user data to keep historical championship bets/scores intact)?

Answer: soft delete.

---

## 2. Forgot Password Flow & TOTP Interaction

5. **The TOTP Dilemma:** Since TOTP is mandatory (FR-01), if a user forgets their password, they presumably still have their authenticator app. Does the "Forgot Password" flow require them to input a TOTP token *after* clicking the email recovery link to complete the password reset? 

Answer: No.

---

6. **Total Lockout Scenario:** What happens if a user forgets their password **AND** loses access to their TOTP device (and backup codes)? Will there be a manual recovery/reset process handled by a Manager (`gerente` or superadmin)?

Answer: No.

---

7. **Recovery Mechanism:** For the target audience, do you prefer sending a "Magic Link" via email for password recovery, or a short OTP (e.g., a 6-digit number) that they have to type into the app?

Answer: sending a "Magic Link" via email for password recovery

## 3. Security Boundaries & Rate Limiting

8. **Enumeration Prevention:** During the "Forgot Password" request, if someone enters an email that is *not* registered in the system, should the UI display a generic success message ("If this email exists, a link was sent") to prevent user enumeration, or a helpful error ("Email not found")?

Answer: a helpful error ("Email not found")
---

9. **Lockout Policy:** How aggressive should the rate-limiting be for password recovery attempts? (e.g., maximum of 3 requests per hour per email).

Answer: maximum of 5 requests per 30 minutes per email

## 4. Notifications (FR-06 extensions)

10. **Security Alerts:** Should the system send automated email notifications (via SMTP) for critical security events triggered in the account management section? 
   - *Example triggers: Password changed, TOTP disabled/regenerated, New login from an unrecognized device.*

Answer: Yes.

## 5. Manager Privileges (`gerente`)

11. **Administrative Overrides:** Should Managers have the capability via their dashboard to force a password reset for a specific user, or disable a user's TOTP temporarily if they are locked out?

Answer: Yes.