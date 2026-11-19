# Roadmap

Work deliberately left for later, roughly in priority order. Each item says why it matters.

## Before promoting the shop widely

- **Verify the sending domain in Resend.** Every email (order confirmations, dispatch updates,
  enquiry replies, password resets, partner invitations and quotes) is refused with
  `The nobyst.com domain is not verified` until `nobyst.com` is added at resend.com/domains and its
  DNS records are set at the registrar. Until then, customers get no emails at all.
- **Make one real end-to-end purchase.** No order has gone through the live site yet. With real
  prices set, buy a low-value item, check the Paystack dashboard, the confirmation page, the
  webhook delivery (Paystack → Settings → Webhooks → logs), the admin Orders tab and the email.
  Confirm whether `PAYSTACK_SECRET_KEY` is a test (`sk_test_`) or live (`sk_live_`) key.
- **Enter real prices.** Migration 0012 cleared the placeholder prices, so products show "Ask for
  price" and cannot be bought online until a price is set in the admin.
- **Privacy policy, terms of sale, returns and refunds pages.** The site collects names, emails,
  phones, delivery addresses and payments. Paystack usually asks for a refund policy, and Ghana's
  Data Protection Act, 2012 (Act 843) likely requires a privacy notice and possibly registration
  with the Data Protection Commission. Check with an adviser.
- **Real product photos.** All products use stock photography; customers may expect exactly what
  is pictured.

## Security

- **Email verification at sign-up**, once email works. Today anyone can register any address.
- **Two-step sign-in for admins** (email one-time code), once email works. Admin sessions are
  already limited to 12 hours.
- **Admin audit log**: who changed which price, role, order status or invitation, and when.
- **Stricter CSP**: replace `'unsafe-inline'` scripts with per-request nonces.
- **robots.txt**: also disallow `/account`, `/cart`, `/checkout`, `/partner` (they already send
  `noindex`).

## Shop and operations

- **Delivery fees** by region, added to the Paystack total, instead of agreeing them by phone.
- **Stock quantities** instead of a status label, decremented when an order is paid.
- **Refunds from the admin** through Paystack's refund API when an order is cancelled (today the
  customer is emailed and the refund is done in the Paystack dashboard).
- **Link partner requests to a product id**, not its name, so renaming a product never breaks a
  quote's wholesale price suggestion.
- **Paystack payment links expire**; add "Resend quote link" for quotes older than a few days.

## Engineering

- **Separate staging environment.** `npm run preview` uploads a preview version, but it uses the
  production D1 database and R2 bucket. Create `nobyst-catalog-staging` / `nobyst-media-staging`
  and a `[env.staging]` block in `wrangler.jsonc` before using previews for risky changes.
- **Browser smoke tests in CI** (Playwright against `next dev` with a local D1), covering checkout,
  sign-in, admin and partner pages. Unit tests already cover the server rules.
- **Next.js 16.** The site is on 15.5 (supported). 16 removes `next lint` (migrate with
  `npx @next/codemod@canary next-lint-to-eslint-cli .`) and renames middleware to proxy.
- **Backups.** D1 Time Travel keeps 30 days of point-in-time restore; document a restore drill and
  schedule a weekly `wrangler d1 export` to off-site storage. R2 photos have no backup.
