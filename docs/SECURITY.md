# Security review

Last reviewed: 2026-11-24 (website + the mobile app's use of the API). Re-run this checklist after
adding API routes, auth changes, new payment flows or new third-party services.

## Results

| Area | Status | How it is protected |
| --- | --- | --- |
| SQL injection | OK | Every query binds user values with `?`. The few SQL strings built in code only join fixed fragments or code-chosen numbers (`queryProducts`, `queryOrders`, `listActivity`). |
| XSS | OK | React escapes all page text. The only `dangerouslySetInnerHTML` is product JSON-LD with `<` escaped. Emails escape every visitor value with `escapeHtml` (now also `'`). Image paths must be same-site; 3D links must be https; partners may only use their own uploads. CSP blocks plugins, framing and foreign scripts. |
| CSRF | OK | `middleware.ts` refuses cross-site POST/PUT/PATCH/DELETE to `/api/*` (Origin / Sec-Fetch-Site). Session cookie is HttpOnly, Secure, SameSite=Lax. The mobile app sends no Origin and authenticates with a Bearer header, which browsers never attach on their own. |
| SSRF | OK | The server only fetches three fixed hosts: Paystack, Resend and Cloudflare DNS. No user-supplied URL is ever fetched server-side. |
| File uploads | OK | `storeUpload` + `upload-sanitize.ts`: requests over the limit are refused before reading (images 6 MB and at most 8,000 px a side / 40 MP; 3D models 15 MB). Every PNG, JPEG and WebP is parsed in full (PNG chunk CRCs checked) and **rebuilt with only the picture**: text/comment chunks, EXIF/XMP (incl. GPS) and bytes after the end marker are dropped; a JPEG's orientation is kept. The result is scanned for script/HTML/PHP markers. glTF/GLB must be valid glTF 2.0 with no external URIs. Files are stored as `m/<random uuid>.<ext>`; the original name, uploader, sizes and SHA-256 are kept in the private `media_uploads` register (admin Media library only). Partners can only use files the register says they uploaded. `/api/media` serves only known key shapes, with the content type taken from the extension, `nosniff`, and `Content-Security-Policy: sandbox`. |
| BOLA / IDOR | OK | Admin routes: `requireAdmin` / `requireRole`. Partner routes: `requirePartner` plus `partner_id = me` in the query. Customer data: by session user id only. Tests prove one partner cannot touch another's products, orders or photos. |
| Rate limiting | OK | Sign-in (per IP and per email), sign-up, reset, enquiries, checkout, uploads, partner writes, 2FA codes, "Confirm it's you", invitations, quotes, and (new) the payment-confirmation page. Fails open if D1 is down, by design. |
| Password hashing | OK | PBKDF2-SHA256, 100,000 iterations, 16-byte salt, constant-time compare, timing-equal reply for unknown emails. 100,000 is the highest PBKDF2 count Cloudflare Workers' Web Crypto accepts. |
| MFA | Fixed | TOTP required for admins and owners, optional for partners; encrypted secrets; single-use codes and recovery codes; lockout. **Fixed in this review:** the mobile endpoints had their own session check that accepted sessions still waiting for their 2FA code. They now use the central `getUserFromRequest`. The mobile sign-in refuses accounts with 2FA on (the app has no code step yet). |
| Server-side permissions / RLS | OK (no RLS) | Cloudflare D1 (SQLite) has no row-level security. Every rule is enforced in server code, in shared helpers (`requireRole`, `requirePartner`, ownership checks, public product filter) and covered by tests. |
| JWT secret | N/A | No JWTs are used. Sessions are 256-bit random tokens stored only as SHA-256 hashes, so they can be revoked instantly (sign-out, role change, password reset). |
| API keys | OK | `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `TOTP_ENCRYPTION_KEY` are Worker secrets; none are in the code or git history; `.dev.vars` and `.env` are git-ignored. |
| Tokens in localStorage | OK | Website: HttpOnly cookie only (localStorage holds just the cart; prices are always re-read on the server). Mobile app: token in Expo SecureStore (Keychain / Keystore). |
| Default credentials | OK | No seeded accounts; the first owner is created by hand. |
| CORS | Fixed | Was `Access-Control-Allow-Origin: *` on the mobile routes. Now only nobyst.com and localhost (Expo web dev) may read them. Native apps ignore CORS and are unaffected. |
| Webhook signatures | OK | Paystack HMAC-SHA512 verified in constant time, then the transaction is re-checked with Paystack's API and the amount compared. |
| Source maps | OK | No browser source maps are published (checked on the live site). |
| Production logs | OK | No passwords, tokens or codes are logged. The security log stores emails and IPs for 12 months. |
| Dependencies | Watch | Production: `postcss` inside Next.js (build-time only, not reachable at run time; fixed by Next 16) and `glob`/`minimatch` inside the OpenNext build tool (build-time only). Dev: vitest upgraded to 5.1 (removed the critical/high findings). |

## Also fixed in this review

- Signing out now deletes the session on the server for Bearer tokens too; the mobile app's sign-out calls it (change in `nobyst-mobile/lib/api.ts` and `store/index.ts`).
- Mobile sign-in: proper OPTIONS reply, lockouts logged, the app can read "too many attempts".

## Added after the review (2026-11-24)

- **Email verification:** new accounts get a "confirm your email" link (48 h, single use); customers must confirm before paying. Password-reset links and partner invitations also count as confirmation. Migration `0018_email_verification.sql`.
- **Turnstile** on web sign-up, forgot-password and the partner form. Off until `TURNSTILE_SITE_KEY` (var) and `TURNSTILE_SECRET_KEY` (secret) are set; CSP allows `challenges.cloudflare.com` only for it.
- **2FA in the mobile app:** the mobile sign-in returns `{ twoFactorRequired, token }`; that token is refused everywhere until the app sends a code to `/api/auth/two-factor/verify`. Partners can now sign in to the app; staff still cannot.
- **Your data:** My account → Download my data (`/api/account/export`) and Delete my account (`/api/account/delete`: password, 2FA code if on, and typing DELETE). Paid orders are kept without personal details; partners and staff must ask. Privacy policy at `/privacy` (draft: have it reviewed).

## Recommended next

1. **Cloudflare Access in front of `/admin` and `/api/admin`** (free for small teams): only your Google/email accounts can even reach the admin sign-in.
2. **Cloudflare Turnstile** on sign-up, forgot-password and the partner form, to stop bots (the partner form now sends invitation emails).
3. **Email verification for customer sign-ups** now that sending email works.
4. **Disable the `workers.dev` address** so the site only answers on nobyst.com.
5. **Next.js 16** to clear the remaining `postcss` advisory.
6. **2FA in the mobile app** (a code screen), so partners can use the app.
7. **Account deletion and data export** for customers (Ghana Data Protection Act, 2012), plus a privacy policy.
8. **Weekly D1 export** off Cloudflare, and a restore drill.
