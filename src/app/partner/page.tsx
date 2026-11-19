import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { getCurrentUser, getPendingUser, isStaff } from "@/lib/auth";
import { getTwoFactorStatus } from "@/lib/two-factor";
import TwoFactorSettings from "@/components/TwoFactorSettings";
import { listEnquiriesForUser } from "@/lib/enquiries";
import { listOpenQuotesForUser, listOrdersForUser } from "@/lib/orders";
import { fulfilmentLabel } from "@/lib/delivery";
import { listPartnerCatalogue } from "@/lib/wholesale";
import { formatPrice } from "@/lib/catalogue";
import PartnerRequestForm from "@/components/PartnerRequestForm";
import PartnerDashboard from "@/components/partner/PartnerDashboard";
import { listPartnerProducts } from "@/lib/products";
import { listCategories } from "@/lib/categories";
import { listCategoryRequests } from "@/lib/marketplace";
import { listPartnerOrderItems, listPayouts, partnerEarnings, type Earnings } from "@/lib/partner-orders";
import { getEnv } from "@/lib/cloudflare";

const EMPTY_EARNINGS: Earnings = {
  grossPesewas: 0,
  commissionPesewas: 0,
  earnedPesewas: 0,
  pendingPesewas: 0,
  paidOutPesewas: 0,
  owedPesewas: 0,
};
import { SignOutButton } from "@/components/AccountPanel";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "Received",
  contacted: "In discussion",
  closed: "Closed",
};

/**
 * Partner portal: wholesale price list, bulk requests and the partner's own history.
 * Partners see only rows tied to their own account id. Admins may open it as a read-only preview.
 */
export default async function PartnerPortal() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    if (await getPendingUser().catch(() => null)) redirect("/signin/verify?next=/partner");
    redirect("/partner/login");
  }

  if (user.role !== "partner" && !isStaff(user.role)) {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center sm:px-6">
        <Handshake className="mx-auto text-royal" size={44} aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-navy sm:text-3xl">Partner access needed</h1>
        <p className="mt-3 text-sm text-navy/70">
          You are signed in as <strong>{user.email}</strong>. The partner portal is for approved
          suppliers, distributors and wholesale buyers. Apply below and we will enable access for this
          account once approved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/partnerships"
            className="inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
          >
            Apply to partner with us
          </Link>
          <SignOutButton />
        </div>
      </section>
    );
  }

  if (user.partnerStatus === "suspended") {
    return (
      <section className="mx-auto max-w-lg px-5 py-20 text-center sm:px-6">
        <Handshake className="mx-auto text-royal" size={44} aria-hidden />
        <h1 className="mt-4 text-2xl font-extrabold text-navy sm:text-3xl">Partner account suspended</h1>
        <p className="mt-3 text-sm text-navy/70">
          Your partner account is on hold, and your products are hidden from the shop. Please contact{" "}
          <a href="mailto:info@nobyst.com" className="font-bold text-royal underline">info@nobyst.com</a>.
        </p>
      </section>
    );
  }

  const preview = isStaff(user.role);
  // Wholesale prices and quotes are for approved (trusted) partners only.
  const trusted = preview || user.partnerStatus === "trusted";
  const [catalogue, requests, orders, quotes] = await Promise.all([
    trusted ? listPartnerCatalogue() : Promise.resolve([]),
    preview ? Promise.resolve([]) : listEnquiriesForUser(user.id).catch(() => []),
    preview ? Promise.resolve([]) : listOrdersForUser(user.id).catch(() => []),
    preview || !trusted ? Promise.resolve([]) : listOpenQuotesForUser(user.id).catch(() => []),
  ]);
  const twoFactor = await getTwoFactorStatus(user.id).catch(() => ({ enabled: false, recoveryCodesLeft: 0 }));
  const [myProducts, categories, categoryRequests, orderItems, earnings, payouts] = await Promise.all([
    preview ? Promise.resolve([]) : listPartnerProducts(user.id).catch(() => []),
    listCategories().catch(() => []),
    preview ? Promise.resolve([]) : listCategoryRequests(user.id),
    preview ? Promise.resolve([]) : listPartnerOrderItems(user.id),
    preview ? Promise.resolve(EMPTY_EARNINGS) : partnerEarnings(user.id),
    preview ? Promise.resolve([]) : listPayouts(user.id),
  ]);
  const { DB } = await getEnv();
  const account = await DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ payout_details?: string | null; commission_bps?: number | null }>()
    .catch(() => null);

  const wholesale = trusted ? (
    <div>
      {quotes.length > 0 && (
        <div className="mt-8 rounded-3xl border-2 border-gold bg-gold-100/50 p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-navy">Quotes ready to pay</h2>
          <ul className="mt-3 divide-y divide-navy/10">
            {quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold text-navy">
                    {q.items.map((i) => `${i.quantity} × ${i.productName}`).join(", ")}
                  </p>
                  <p className="text-xs text-navy/60">
                    {q.reference}
                    {q.delivery.notes ? ` · ${q.delivery.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-navy">{formatPrice(q.totalPesewas)}</span>
                  {q.paymentUrl && (
                    <a
                      href={q.paymentUrl}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-royal"
                    >
                      Pay now
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {trusted && (
        <>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-bold text-navy">Wholesale price list</h2>
          <p className="mt-1 text-xs text-navy/60">
            Prices are for approved partners only. Please do not share them.
          </p>
          {catalogue.length === 0 ? (
            <p className="mt-6 text-sm text-navy/60">No wholesale items are listed yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-navy/50">
                  <tr>
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3 text-right">Retail</th>
                    <th className="py-2 pr-3 text-right">Wholesale</th>
                    <th className="py-2 text-right">Min.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/5">
                  {catalogue.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/products/${item.slug}`} className="font-bold text-navy hover:text-royal">
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-navy/50">{item.category}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-navy/50 line-through decoration-navy/30">
                        {formatPrice(item.retailPesewas) ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-extrabold text-navy">
                        {formatPrice(item.wholesalePesewas)}
                      </td>
                      <td className="py-2.5 text-right text-navy/70">{item.minQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-bold text-navy">Request a bulk order</h2>
          <p className="mb-4 mt-1 text-xs text-navy/60">
            We confirm stock, final price and delivery before you pay.
          </p>
          <PartnerRequestForm
            preview={preview}
            options={catalogue.map((c) => ({ id: c.id, name: c.name, minQuantity: c.minQuantity }))}
          />
        </div>
      </div>

        </>
      )}

      {!preview && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Your requests</h2>
            {requests.length === 0 ? (
              <p className="mt-4 text-sm text-navy/60">You have not sent any requests yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-navy/5">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-bold text-navy">
                        {r.quantity} × {r.productName}
                      </p>
                      <p className="text-[11px] text-navy/50">{new Date(r.createdAt.replace(" ", "T") + "Z").toLocaleDateString()}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-navy/5 px-2.5 py-0.5 text-[11px] font-bold text-navy">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-display text-xl font-bold text-navy">Paid orders</h2>
            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-navy/60">No paid orders on this account yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-navy/5">
                {orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-bold text-navy">{o.reference}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-navy/5 px-2.5 py-0.5 text-[11px] font-bold text-navy">
                        {fulfilmentLabel(o.fulfilmentStatus)}
                      </span>
                      <span className="text-navy/70">{formatPrice(o.totalPesewas)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  const security = (
    <div className="space-y-6">
      {!preview && (
        <div className="rounded-3xl border border-navy/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-display text-xl font-bold text-navy">Two-step sign-in</h2>
          <p className="mb-4 mt-1 text-xs text-navy/60">Optional, recommended: protects your shop and earnings if your password leaks.</p>
          <TwoFactorSettings
            enabled={twoFactor.enabled}
            recoveryCodesLeft={twoFactor.recoveryCodesLeft}
            canDisable
            accountEmail={user.email}
          />
        </div>
      )}
      <SignOutButton />
    </div>
  );

  return (
    <PartnerDashboard
      partner={{ name: user.name, company: user.company, email: user.email, status: user.partnerStatus, preview }}
      initialProducts={myProducts}
      categories={categories}
      initialCategoryRequests={categoryRequests}
      initialOrderItems={orderItems}
      earnings={earnings}
      payouts={payouts}
      payoutDetails={account?.payout_details ?? null}
      commissionBps={account?.commission_bps ?? 1000}
      wholesale={wholesale}
      security={security}
    />
  );
}
