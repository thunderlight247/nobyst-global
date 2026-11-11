# NOBYST GLOBAL LTD website

Corporate website for NOBYST GLOBAL LTD, Techiman, Bono East Region, Ghana.
Next.js 14 (App Router), TypeScript, Tailwind CSS, Lenis smooth scrolling, GSAP + ScrollTrigger, Lucide icons.

## Run

    npm install
    npm run dev          # http://localhost:3000 (D1/R2 bindings from wrangler.jsonc)
    npm run db:init && npm run db:seed   # create and fill the local database
    npm run typecheck && npm run lint
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
- **Products** — accessory ranges with search and category filters, plus a WhatsApp availability check per item.
- **Partner with us** — validated partnership enquiry form.
- **Contact** — phone, WhatsApp, email, location and an enquiry form.
- Both forms validate on the client and prepare the message in WhatsApp; email is offered as an alternative. No server endpoint or webhook is required.
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
- **Admin** — `/admin` (not linked in navigation, hidden from search engines via robots/meta). There is
  **no sign-in yet** by request; keep the URL private and add real authentication before letting anyone
  else use it.
- Admin features: add, edit and delete products; upload per-product photos (JPG/PNG/WebP, max 6 MB);
  per-product image descriptions; delete cleans up the uploaded photo.

## Cloudflare setup (D1 + R2)

The catalogue needs two storage resources on Cloudflare and this repo's `wrangler.jsonc` already wires
the bindings (`DB` → D1, `MEDIA` → R2; worker name stays `nobyst-global`, so the public URL is
unchanged).

1. **Create the D1 database** (dashboard → Storage & Databases → D1 → *Create*, name it
   `nobyst-catalog`), then copy its **database ID** into `wrangler.jsonc` in place of the
   `00000000-…` placeholder. Or from the terminal: `npx wrangler d1 create nobyst-catalog`.
   (Done: `nobyst-catalog`, id `1ce53859-0e99-4994-9dcf-bd2db48097bb`; bucket `nobyst-media` created.)
2. **Create the R2 bucket** (dashboard → R2 → *Create bucket*, name it `nobyst-media`). R2 requires a
   one-time billing setup even on the free tier.
3. **Create the tables and seed the catalogue.** Either paste the contents of `db/schema.sql` and then
   `db/seed.sql` into the dashboard D1 *Console*, or run:

        npx wrangler login
        npx wrangler d1 execute nobyst-catalog --remote --file=./db/schema.sql
        npx wrangler d1 execute nobyst-catalog --remote --file=./db/seed.sql

4. **Deploy:** `npm run deploy` (the same worker URL as today; existing pages and paths are preserved).
   This machine has broken IPv6, so the script forces
   `NODE_OPTIONS="--dns-result-order=ipv4first --no-network-family-autoselection"` for wrangler —
   leave it in place. Without the second flag Node tries IPv6 first and wrangler fails with
   `fetch failed` / `Not logged in: auth token could not be refreshed`.

## Deployment notes

- `wrangler.jsonc` declares `main: .open-next/worker.js`, produced by `@opennextjs/cloudflare`; static
  assets are served from `.open-next/assets` flagged `nodejs_compat`.
- Product pages are rendered **on demand** from D1, so admin changes appear immediately after a deploy.
  URLs (`/products`, `/products/<slug>`, `/sitemap.xml`) stay the same; `sitemap.xml` also reflects D1.
- Uploaded photos are served by `/api/media/<key>` straight out of R2 with long-lived caching headers.
- Next.js 14.2.35 is used for adapter compatibility. Next 14 is EOL — plan an upgrade to 15.x + the
  current adapter (Cloudflare support for 14.x ends early 2026).
