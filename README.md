# NOBYST GLOBAL LTD website

Next.js 14 (App Router), TypeScript, Tailwind CSS, Lenis smooth scrolling, GSAP + ScrollTrigger, Lucide icons.

## Run
    npm install
    npm run dev          # http://localhost:3000
    npm run typecheck && npm run lint
    npm run build && npm start

## Edit content
All company text, contact details, products and categories live in `src/data/site.ts`.

## Implemented
Home, About, Our Businesses (current vs planned), Home (hero, current activities, planned growth shown separately, values, partner call to action), Products (search + category filter, WhatsApp enquiry per item), Partner with us (validated form + API route), Contact (tel, mailto, WhatsApp links), sticky header with mobile menu and scroll progress, floating WhatsApp button, sitemap, robots, metadata, skip link, reduced-motion support.

## Needs configuration
- `ENQUIRY_WEBHOOK_URL` in `.env` (see `.env.example`). Until set, the form tells visitors honestly that the message was NOT delivered.
- `NEXT_PUBLIC_SITE_URL` for production.

## Temporary / to replace
- Product entries in `src/data/site.ts` are illustrative samples; tiles use icon placeholders (no photos yet). No prices or stock are claimed.
- `public/logo.jpg` is the supplied JPG (white background), also used as favicon. Supply a transparent logo and proper favicon when available.
- Mobile money copy is generic; transaction types and partner institutions are unconfirmed.
- Stock photos: Unsplash images are referenced by URL in `src/data/images.ts` (the image source record). They are illustrative, not photos of NOBYST. Their URLs could not be checked offline; if one fails to load, a placeholder shows. Swap any `src` for a local file in `/public`.
- React Bits components are not included; add via their CLI (reactbits.dev) where wanted.

## Not yet verified
Written without network access: `npm install`, lint, typecheck and build have NOT been run.
