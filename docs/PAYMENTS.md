# Payments: Hubtel (target) and Paystack (until Hubtel is proven)

The client uses **Hubtel**. The site is built so the provider is a setting: Paystack keeps taking
payments today, and Hubtel takes over when its keys are added and `PAYMENT_PROVIDER` is set to
`hubtel`. Each order remembers the provider it started with, so switching never strands an order.

Code: `src/lib/payments/provider.ts` (which provider), `src/lib/payments/hubtel.ts` (Hubtel calls),
`src/lib/orders.ts` (`initializePayment`, `verifyCheckout`, `recordHubtelCallback`),
`src/app/api/hubtel/callback/route.ts` (Hubtel's callback), migration `0020_payment_providers.sql`.

## How a Hubtel payment works here

1. Checkout saves the order as pending (prices from D1) and calls Hubtel's
   `POST https://payproxyapi.hubtel.com/items/initiate` with Basic auth (API ID : API key),
   `totalAmount` in cedis, `clientReference` = our order reference, and three URLs:
   - `callbackUrl`: `/api/hubtel/callback?reference=…&sig=…` where `sig` is an HMAC of the
     reference with `HUBTEL_CALLBACK_SECRET`; only Hubtel is ever given this URL;
   - `returnUrl`: `/checkout/verify?reference=…` (the page re-checks for ~2 minutes);
   - `cancellationUrl`: `/cart?payment=cancelled`.
2. The customer pays on Hubtel's page (card or mobile money).
3. Hubtel POSTs the result to the callback URL. **Hubtel does not sign callbacks**, so the order
   is marked paid only if: the URL signature is valid; the body echoes our reference and the
   checkout id Hubtel returned in step 1; it reports success (`ResponseCode` `0000` and
   `Status` Success/Paid); and the amount covers the order total.
4. Optional, stronger: if `HUBTEL_STATUS_RELAY_URL` / `HUBTEL_STATUS_RELAY_TOKEN` are set, Hubtel's
   **Transaction Status API** must also say Paid before the order is marked paid, and the admin's
   "Re-check payment" uses it. That API only accepts requests from a **fixed IP whitelisted by
   Hubtel**; Cloudflare Workers have no fixed IP, so it needs a small relay server (e.g. a $5/month
   VPS) that forwards `GET /transactions/{merchant}/status?clientReference=…` with the Hubtel
   credentials, after checking the bearer token.

Every rejected or mismatched callback is written to **Admin → Activity & security**.

## Switching to Hubtel (when the client's account is ready)

1. From the client's Hubtel account (or their Hubtel retail engineer), get:
   - **API ID** and **API key** (Hubtel portal → API keys);
   - the **merchant account number** (POS Sales ID) that receives online checkout payments;
   - confirmation that **Online Checkout** is enabled on the account;
   - Hubtel's current Online Checkout and callback documentation. **Check the field names in
     `src/lib/payments/hubtel.ts` against it** (they follow Hubtel's published examples and are
     read case-insensitively, but were written without access to the docs).
2. Store the secrets (type each value when asked):

       npx wrangler secret put HUBTEL_CLIENT_ID
       npx wrangler secret put HUBTEL_CLIENT_SECRET
       npx wrangler secret put HUBTEL_MERCHANT_ACCOUNT
       openssl rand -hex 32 | npx wrangler secret put HUBTEL_CALLBACK_SECRET

3. Set `"PAYMENT_PROVIDER": "hubtel"` in the `vars` of `wrangler.jsonc` and deploy.
4. Make one small real purchase and one partner quote payment. Check the order turns **paid**, the
   confirmation email arrives, and Activity shows no rejected callbacks.
5. After a few real orders work, remove Paystack: `PAYSTACK_SECRET_KEY`, `src/lib/paystack.ts`,
   `src/app/api/paystack/webhook`, and the Paystack branch of `initializePayment` / `verifyCheckout`.

## Paystack (current)

Payments start with `transaction/initialize`; `/api/paystack/webhook` checks Paystack's HMAC-SHA512
signature, and every payment is re-verified with Paystack's API and the amount compared.
