# Marketplace plan: partners sell on nobyst.com

Decided 2026-11-19. Partners are businesses that join NOBYST to sell their own products online.
They manage their own shop from a partner dashboard; admins see and can undo everything they do.

## Decisions

| Question | Decision |
| --- | --- |
| Joining | Filling in **Partner with us** sends the application to info@nobyst.com **and** emails the business an invitation straight away. Admins can still invite directly. Both show in the admin. |
| Go-live | A new partner is **pending**: their products wait for admin approval. When an admin marks the partner **trusted**, their changes go live instantly. A **suspended** partner's products are hidden. |
| Payment | Customers pay NOBYST through Paystack as today. Each partner sale records the partner's commission rate at the time. The partner dashboard shows earnings (sales minus commission), what has been paid out, and what is owed. Admins record payouts (mobile money or bank) by hand. |
| Delivery | The partner delivers their items. They see orders for their products (customer, phone, delivery address) and update each item's status; the customer is emailed. Admins see everything. |
| Categories | Partners file products under NOBYST's categories and can **request** a new one; an admin approves or declines it. |
| Wholesale | The existing wholesale price list and quotes stay, for **trusted** partners only (a pending partner from an automatic invite never sees wholesale prices). |

## Data

- `products.partner_id` (NULL = NOBYST's own), `products.status` (`live`, `pending`, `rejected`, `hidden`), `products.review_note`.
- `users.partner_status` (`pending`, `trusted`, `suspended`), `users.commission_bps` (default 1000 = 10%), `users.payout_details`.
- `order_items.partner_id`, `order_items.commission_bps` (snapshot at sale), `order_items.fulfilment_status`.
- `category_requests`, `payouts`, `activity_log` (who did what; Phase 4's security log builds on it).
- `partner_invitations.source` (`admin` or `application`).

## Steps

1. Show/hide password fields; automatic invitation from the application form with a professional message; partner status (pending, trusted, suspended). **Done.**
2. Marketplace core: migration, partner product and photo management, approval rules, public catalogue shows only live products with "Sold by", checkout records partner items. **Done.**
3. Admin monitoring: activity feed, approvals (products, category requests, partners), partner status and commission, payouts. **Done.**
4. Partner orders and earnings: item fulfilment by the partner, earnings and payout history, payout details. **Done.**

## Safety rules

- Every partner API checks `partner_id = the signed-in partner` on the server; a partner can never read or change another partner's or NOBYST's products or orders.
- Partners see only the customer details needed to deliver their own items (name, phone, delivery address), never other items in the order or payment details.
- Prices, stock, text and photos from partners go through the same validation as admin input (no off-site image links, image byte checks, length limits).
- Every partner change is written to the activity log before it is visible to anyone else.
