# Admin and partner sign-in plan

Status: **Phases 1–3 built (2026-11-19); Phase 4 planned.** Decisions made on 2026-11-19:
authenticator-app 2FA, required for admins and optional for partners; an owner role above admin;
re-confirmation before risky actions; separate sign-in pages; a security log.

## Where things stand

Email + password (PBKDF2-SHA256), rate-limited sign-in, hashed single-use reset and invitation
tokens, 12-hour admin sessions, role checks on every admin and partner API, partners only by
invitation. Gaps: no second factor, any admin can manage every other admin, no record of who did
what, and admins, partners and customers share one sign-in page.

## Phase 1: owner role and separate sign-in pages (done)

- **Roles:** `customer` < `partner` < `admin` < `owner`. Owners can do everything admins can.
  - Only an owner can make someone an admin or owner, or remove those roles.
  - Admins can still switch accounts between customer and partner, invite partners and run the shop.
  - The last owner can never be demoted. An owner cannot change their own role (same rule as admins today).
  - Rollout: make the current admin (`nobystecommerce@gmail.com`) the first owner with one SQL
    command, documented in the README.
- **Sign-in pages:**
  - `/admin/login`: no sign-up link. It accepts only admin and owner accounts, and any other
    account gets the same generic "Email or password is incorrect" message, so the page never
    confirms an email exists.
  - `/partner/login`: links to "Apply to partner with us" instead of sign-up.
  - `/account` stays the customer page. After sign-in, everyone is sent to the right area for their role.
  - `/admin` and `/partner` send guests to their own sign-in page instead of `/account`.
- Same `/api/auth/login` backend with an `area` field, so the rate limits and timing protections
  apply everywhere.

## Phase 2: authenticator-app 2FA (TOTP) (done)

- **Standard:** RFC 6238, 6-digit codes, 30-second steps, one step of clock drift allowed. It works
  with Google Authenticator, Microsoft Authenticator, Authy and 1Password, and needs no email or SMS.
- **Storage:**
  - Table `user_totp (user_id, secret_ciphertext, enabled_at, last_used_step)`.
  - Secrets are encrypted with AES-GCM using a new worker secret `TOTP_ENCRYPTION_KEY`, so a
    copy of the database alone cannot produce codes.
  - `last_used_step` stops a code being used twice.
- **Recovery codes:** 10 single-use codes, shown once at setup and stored as hashes. Each can be
  used instead of a code; you can download a new set (which voids the old set).
- **Sign-in flow:**
  1. The password is correct.
  2. A session is created with `mfa_verified_at` empty.
  3. The code page appears.
  4. A correct code sets `mfa_verified_at`. Until then the session can reach nothing but the code
     page and sign-out.
- **Admins and owners:** 2FA is required. An admin without it is sent straight to
  `/admin/security/setup` after the password and can't open any admin page or API until setup is
  done. The admin APIs check `mfa_verified_at`, not just the role.
- **Partners:** optional. "Turn on two-step sign-in" in the portal; once on, it is required at
  every sign-in like an admin's.
- **Limits:** 5 wrong codes in 15 minutes per account locks code entry for that account for 15
  minutes. The lock is logged.
- **Lost device:** use a recovery code, or an owner resets that person's 2FA from the Users tab
  (logged, signs them out). If the only owner loses both, a documented SQL command removes their
  2FA row.
- **Password reset** does not turn 2FA off: a hacked inbox alone cannot get into the admin.
- **QR code:** generated in the browser from the `otpauth://` link with a small QR library, with
  the text key shown for manual entry.

Built as planned, with two adjustments: only wrong codes count towards the 5-code lock (a correct
code clears it), and a recovery code can't be used to issue new recovery codes (that needs an
authenticator code). The `created_at` and `reauth_at` session columns move to Phases 3–4.

## Phase 3: re-confirm risky actions (done)

- `sessions.reauth_at` records the last time the person re-entered their password (+ 2FA code if enabled).
- These actions require a re-confirmation within the last 15 minutes:
  - Changing any role, and the owner-only actions
  - Inviting or cancelling a partner
  - Sending a quote
  - Turning 2FA off, or resetting someone else's 2FA
- If it's older, the API answers `403 { reauth: true }`. The admin page shows a small "Confirm
  it's you" dialog, calls `POST /api/auth/reauth`, then retries the action automatically.

Built as planned. Turning 2FA off and new recovery codes already require a code, so they are not
behind the extra dialog. Migration `0014_reauth.sql` adds `sessions.reauth_at`.

## Phase 4: security log

- Table `security_events (id, at, actor_id, actor_email, action, target, detail, ip, user_agent)`.
- **Logged:**
  - Sign-ins, failed sign-ins and lockouts
  - 2FA turned on, turned off or reset, and recovery codes used
  - Role changes
  - Invitations sent, accepted or cancelled
  - Quotes sent
  - Wholesale and retail price changes
  - Order status changes
  - Password resets
- **Never logged:** passwords, tokens, codes or full card or payment data. User agents are cut to
  200 characters.
- **Security tab in the admin** (admins and owners): newest first, filter by person or action. Kept
  for 12 months, pruned automatically.

## Schema (one migration, `0013_auth_hardening.sql`)

- `users.role` gains `'owner'`. There's no constraint to change; the code enforces the allowed values.
- `sessions`: add `created_at`, `mfa_verified_at`, `reauth_at`.
- New tables `user_totp`, `recovery_codes`, `security_events`.

## Tests

- TOTP: the RFC 6238 test vectors, the drift window, and a code being reused.
- Recovery codes: single use.
- Owner rules: an admin can't promote anyone to admin, and the last owner is protected.
- 2FA gate: an admin without 2FA gets 403 from every admin API.
- Re-confirmation: expires after 15 minutes.
- Security log: an entry for each logged action, and secrets are never stored.

## Rollout

1. `wrangler secret put TOTP_ENCRYPTION_KEY` (32 random bytes, base64).
2. Run the migration and deploy Phase 1. Promote the owner.
3. Deploy Phase 2. The owner sets up 2FA on the next admin visit, and so does each admin.
4. Deploy Phases 3 and 4.

## Later (needs working email, see ROADMAP.md)

Email verification at sign-up, an email alert on each new admin sign-in, and a list of active
sessions with "sign out everywhere".
