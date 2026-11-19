# NOBYST GLOBAL LTD website

Corporate website for NOBYST GLOBAL LTD, Techiman, Bono East Region, Ghana.
Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS, Lenis smooth scrolling, GSAP + ScrollTrigger, Lucide icons.

## Run

    npm install
    npm run dev          # http://localhost:3000 (D1/R2 bindings from wrangler.jsonc)
    npm run db:init && npm run db:seed   # create and fill the local database
    npm run typecheck && npm run lint
    npm test             # unit tests (Vitest, real SQL on an in-memory SQLite copy of the schema)
    npm run check        # typecheck + lint + tests; run before every commit
    npm run build        # plain Next.js build
    npm run worker:build # OpenNext worker bundle in .open-next
    npm run deploy       # worker:build + deploy to the nobyst-global worker

## Edit content

Company text, contact details, divisions, planned business areas and company facts live in
`src/data/site.ts` (plus `src/data/images.ts` for built-in photo records). Products are **data**, edited
through the admin at `/admin` — they are stored in Cloudflare D1 and their photos in Cloudflare R2.

## Structure

- **Home** — branded hero with a company snapshot, current operations, clearly separated planned expansion, values, partnership call to action.
- **About** — positioning, company facts, mission, vision, philosophy and values.
- **Our Businesses** — "Operating today" divisions kept visually and editorially separate from "Planned expansion" areas.
- **Products** — accessory ranges with search and category filters, prices and stock per item. Shoppers can browse and add to cart without an account; checkout requires sign-in.
- **Partner with us** — validated partnership enquiry form.
- **Contact** and **Support** — phone, email, location and enquiry forms. Support also offers WhatsApp.
- Enquiry forms validate on the client and save to D1 through `POST /api/enquiries`; email is offered as a fallback.
- **Product detail pages** carry phone-compatibility chips and a bulk-order enquiry form (5+ units).

## Assets

- The brand assets in `public/` (`logo.png`, `logo-mark.png`, `logo-mark-light.png`, `icon.png`, `og.png`) are transparent PNGs generated from the supplied artwork. Rebuild them with:

      python3 scripts/make-logo.py    # requires Pillow

  The source artwork is `scripts/brand/logo-source.jpg`.
- `public/images/` holds local illustrative photographs (Pexels licence). They are not photos of NOBYST premises; replace them with real company photography when available.
- `NEXT_PUBLIC_SITE_URL` sets the production URL used by metadata and the sitemap (see `.env.example`).

## Products & admin

- **Public catalogue** — `/products` and one detail page per product (`/products/<slug>`) with
  compatibility lists, bulk-order enquiries and related products. The sitemap updates automatically.
- **Roles** — every account signs up as a `customer`. Roles are changed in **/admin → Users & Partners**.
  Nobody can change their own role, and a role change signs that account out at once.

  | Role | Can use |
  | --- | --- |
  | `customer` | Shop, checkout, `/account` order history |
  | `partner` | Everything a customer can, plus `/partner`: wholesale price list, bulk requests, quotes |
  | `admin` | `/admin` (products, prices, wholesale, categories, page text, enquiries, orders, partners, quotes); can switch accounts between customer and partner; read-only preview of `/partner` |
  | `owner` | Everything an admin can, plus making, changing and removing admins and owners. The last owner cannot be demoted. |

- **Sign-in pages** — staff sign in at `/admin/login` (no sign-up; a non-staff account gets the same
  "Email or password is incorrect" as a wrong password), partners at `/partner/login`, customers at
  `/account`. Each sends people to their own area afterwards and only follows `next` links inside it.
- **Two-step sign-in (2FA)** — authenticator-app codes (Google Authenticator, Microsoft Authenticator,
  Authy, 1Password). **Required for admins and owners**: staff without it are sent to
  `/admin/security` and every admin API answers 403 until it is on. Optional for partners (portal →
  Two-step sign-in). After the password, `/signin/verify` asks for the 6-digit code or a recovery
  code; until then the session counts as signed out everywhere. Ten single-use recovery codes are
  shown once at setup. Five wrong codes lock code entry for that account for 15 minutes. Turning 2FA
  on signs out the account's other devices. Password resets do not turn 2FA off. An owner can
  **Reset 2FA** for someone who lost their phone (Users tab); if the only owner loses both phone and
  codes: `npx wrangler d1 execute nobyst-catalog --remote --command "DELETE FROM user_totp WHERE user_id = (SELECT id FROM users WHERE email = 'you@example.com')"`.
  Secrets are AES-GCM encrypted with the worker secret `TOTP_ENCRYPTION_KEY`
  (`openssl rand -base64 32 | npx wrangler secret put TOTP_ENCRYPTION_KEY`; locally in `.dev.vars`).
  Changing that key makes every existing authenticator stop working.
- **Admin** — `/admin` (not linked in navigation, hidden from search engines). Guests are sent to
  `/admin/login`; non-staff accounts see an "access needed" page with no data. Make the **first** owner
  from the terminal after signing up on `/account`:

        npx wrangler d1 execute nobyst-catalog --remote \
          --command "UPDATE users SET role = 'owner' WHERE email = 'you@example.com'"

  After that, the owner grants every other role from the Users tab.
- **Partner portal** — `/partner`, linked from "Partner with us" and from a partner's account page.
  Wholesale prices are set per product in the admin product form and stored in their own
  `wholesale_prices` table, which public pages never read. Partners only see requests they sent while
  signed in (matched by account id, never by email). New partner requests email the admin inbox.
- **Inviting partners** —
  1. A business fills in **Partner with us**. The enquiry is saved and the admin inbox gets an email
     with a link to it (`ADMIN_EMAIL` in `wrangler.jsonc` vars, defaulting to `site.email`).
  2. In **/admin → Enquiries**, *Invite as partner* (or *Invite a partner* in **Users & Partners**) emails a
     single-use link valid for 7 days. Sending again replaces the earlier link; pending links can be cancelled.
  3. The link opens `/partner/invite`. A new invitee sets a name and password and lands in `/partner`;
     someone who already has an account with that email signs in and accepts. The account email must
     match the invited email. Only token hashes are stored.
  Invitation emails need `RESEND_API_KEY` and a verified `EMAIL_FROM`. In `next dev` without a key the
  admin is shown the link instead of it being emailed; production builds never expose it.
- Admin features: add, edit and delete products; upload per-product photos (JPG/PNG/WebP, max 6 MB);
  per-product image descriptions; delete cleans up the uploaded photo.

## Security

- **Admin access** is checked server-side on the admin page and in every admin API handler (`requireAdmin()` in `src/lib/auth.ts`).
- **Rate limits** (`src/lib/rate-limit.ts`, stored in the D1 `rate_limits` table) cover sign-in (per IP and per
  email), sign-up, password reset, enquiries, checkout and uploads. Over the limit returns HTTP 429.
- **CSRF**: `src/middleware.ts` refuses cross-site POST/PUT/PATCH/DELETE to `/api/*`; session cookies are
  `HttpOnly; Secure; SameSite=Lax`.
- **Headers** (`next.config.mjs`): Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy, Permissions-Policy; private pages are `no-store`.
- **Uploads** are accepted only when the file's bytes match JPG, PNG, WebP or glTF; image paths must be
  same-site and 3D model links must be `https://`.
- **Email**: enquiry acknowledgements do not quote the visitor's message, and are capped per address, so
  the form cannot relay spam. Reset links and payment callbacks use `SITE_URL`, not the request host.
- Passwords use PBKDF2-SHA256; session and reset tokens are stored only as SHA-256 hashes; reset tokens
  are single-use and a reset signs out every session.
- Secrets (`PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`) are set with `wrangler secret put`, never in the repo.

## Cloudflare setup (D1 + R2)

The catalogue needs two storage resources on Cloudflare and this repo's `wrangler.jsonc` already wires
the bindings (`DB` → D1, `MEDIA` → R2; worker name stays `nobyst-global`, so the public URL is
unchanged).

1. **Create the D1 database** (dashboard → Storage & Databases → D1 → *Create*, name it
   `nobyst-catalog`), then copy its **database ID** into `wrangler.jsonc` in place of
   `database_id`. Or from the terminal: `npx wrangler d1 create nobyst-catalog`.
   The ID committed in `wrangler.jsonc` is the `nobyst-catalog` database of the current Cloudflare
   account. If you move accounts again, replace it with the newly printed one, or every
   `wrangler d1` command and deploy fails with *database not found*.
2. **Create the R2 bucket** (dashboard → R2 → *Create bucket*, name it `nobyst-media`). R2 requires a
   one-time billing setup even on the free tier.
3. **Create the tables and seed the catalogue.** Either paste the contents of `db/schema.sql` and then
   `db/seed.sql` into the dashboard D1 *Console*, or run:

        npx wrangler login
        npx wrangler d1 execute nobyst-catalog --remote --file=./db/schema.sql
        npx wrangler d1 execute nobyst-catalog --remote --file=./db/seed.sql

   Then apply every file in `db/migrations/` in order (each with `--remote --file=...`). Migration
   `0008_security.sql` adds admin roles and rate limits, `0009_partners.sql` the partner portal,
   `0010_partner_invitations.sql` email invitations, `0011_order_fulfilment.sql` delivery details,
   order statuses and partner quotes, and `0012_clear_placeholder_prices.sql` removes the test prices
   from 0007, and `0013_two_factor.sql` adds two-step sign-in. Until they run, nobody can open the admin or the partner portal.
   (`0002` is already part of `schema.sql` on new databases.)

4. **Deploy:** `npm run deploy` (worker name stays `nobyst-global`, so the path structure is
   unchanged; the `workers.dev` hostname follows the account's subdomain).
   This machine has broken IPv6, so the script forces
   `NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"` for wrangler —
   leave it in place. Without the second flag Node tries IPv6 first and wrangler fails with
   `fetch failed` / `Not logged in: auth token could not be refreshed`.

## Moving to a fresh Cloudflare account

```
npx wrangler logout && npx wrangler login      # sign in with the new account
npx wrangler whoami                            # confirm the new Account ID
export NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"
npx wrangler d1 create nobyst-catalog          # copy the id into wrangler.jsonc
npx wrangler r2 bucket create nobyst-media
npx wrangler d1 execute nobyst-catalog --remote --file=./db/schema.sql
npx wrangler d1 execute nobyst-catalog --remote --file=./db/seed.sql
npm run deploy
```

- A brand-new account has no `workers.dev` subdomain, and `wrangler deploy` stops with *You need to
  register a workers.dev subdomain before publishing to workers.dev*. Register one at
  `https://dash.cloudflare.com/<account-id>/workers/onboarding` (no config change needed), then
  deploy again. R2 must also be enabled once per account: until then bucket commands fail with
  *Please enable R2 through the Cloudflare Dashboard* (code 10042).
- Worker names are per account, so the new deploy gets `nobyst-global.<new-subdomain>.workers.dev`.
  Re-attach the custom domain (Workers → the worker → *Settings* → *Domains & Routes*) if you use one,
  and set `NEXT_PUBLIC_SITE_URL` to the final hostname.
- To carry over catalogue edits instead of reseeding, use a D1 export of the old database
  (`npx wrangler d1 export nobyst-catalog --remote --output=db/backup.sql`) for the last `execute` step.
- Local development is unaffected: `npm run db:init` / `npm run db:seed` use a local D1 copy in
  `.wrangler/state`, with no account or login.

### Deploying from GitHub (Workers Builds)

The repository is connected to Workers Builds (Workers → *Settings* → *Builds*), so every push to
`main` runs a build that should end in a deploy. `npm run build` now runs the OpenNext build, which
produces `.open-next/worker.js` and the assets that `wrangler.jsonc` points at, so the pipeline works
with the default commands:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` (now `opennextjs-cloudflare build`) |
| Deploy command | `npx wrangler deploy` or `npx opennextjs-cloudflare deploy` |

Earlier the `build` script was a plain `next build`, which leaves `.open-next` empty; the deploy step
then failed with *Could not find compiled Open Next config, did you run the build command?* and the
push produced a red *Workers Builds: nobyst-global* check instead of a deployment. `npm run build:next`
remains available for a Next-only build. `wrangler.jsonc` on the deployed branch must also carry the
current account's `database_id`, or the build deploys against a database that does not exist.

## Deployment notes

- `wrangler.jsonc` declares `main: .open-next/worker.js`, produced by `@opennextjs/cloudflare`; static
  assets are served from `.open-next/assets` flagged `nodejs_compat`.
- Product pages are rendered **on demand** from D1, so admin changes appear immediately after a deploy.
  URLs (`/products`, `/products/<slug>`, `/sitemap.xml`) stay the same; `sitemap.xml` also reflects D1.
- Uploaded photos are served by `/api/media/<key>` straight out of R2 with long-lived caching headers.
- Next.js 15.5 with React 19 and `@opennextjs/cloudflare` 1.20. Next 16 is listed in `ROADMAP.md`.
- Do not run `npm run deploy` (or any build) while `npm run dev` is running: both write `.next`, and
  the build fails with `PageNotFoundError: ENOENT`. Stop the dev server first.

## Orders, payments and delivery

- **Checkout** asks for delivery to an address (region, town, street or landmark) or pickup in
  Techiman. Prices always come from D1. Out-of-stock and unpriced products cannot be added to the
  cart or paid for; unpriced ones show **Ask for price**, which opens the Support form.
- **Paystack webhook** — set `https://<site>/api/paystack/webhook` in Paystack → Settings →
  API Keys & Webhooks. Payments are then confirmed even if the customer closes the tab. The route
  checks Paystack's HMAC-SHA512 signature and re-verifies each transaction with Paystack's API.
- **Admin → Orders** lists paid orders with delivery details and a status: New → Processing →
  Dispatched / Ready for pickup → Delivered, or Cancelled. Customers are emailed at Dispatched,
  Ready, Delivered and Cancelled, and see the status in `/account`. Below it, *Awaiting payment
  confirmation* lists unpaid checkouts from the last 14 days with **Re-check with Paystack**.
- **Partner quotes** — on a partner's bulk request (Admin → Enquiries), **Send quote** sets a unit
  price and quantity (prefilled from the wholesale price) and emails the partner a Paystack payment
  link, also shown as **Pay now** in their portal. A new quote replaces the earlier link.
- **Admin → Wholesale** sets partner prices for every product in one table.
- **Admin sessions** last 12 hours; customer sessions 30 days.

## Testing

- `npm test` runs Vitest. `tests/helpers/d1.ts` loads `db/schema.sql` and every migration into an
  in-memory SQLite database behind the same API as D1, so tests exercise the real SQL (rate limits,
  single-use tokens, checkout pricing, payment verification, quotes, CSRF and upload checks).
- There is no GitHub Actions workflow: run `npm run check` locally before committing. Deploys come
  from Workers Builds (on push to `main`) or `npm run deploy`.
- `npm run preview` builds and uploads a **preview version** without promoting it (Wrangler prints
  its URL). It uses the **production** D1 and R2 bindings, so treat it as live data; a separate
  staging environment is in `ROADMAP.md`.

See `ROADMAP.md` for planned work.
