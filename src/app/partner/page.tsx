import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listEnquiriesForUser } from "@/lib/enquiries";
import { listOpenQuotesForUser, listOrdersForUser } from "@/lib/orders";
import { fulfilmentLabel } from "@/lib/delivery";
import { listPartnerCatalogue } from "@/lib/wholesale";
import { formatPrice } from "@/lib/catalogue";
import PartnerRequestForm from "@/components/PartnerRequestForm";
import { SignOutButton } from "@/components/AccountPanel";

export const metadata: Metadata = {
  title: "Partner portal",
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
  if (!user) redirect("/account?next=/partner");

  if (user.role !== "partner" && user.role !== "admin") {
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

  const preview = user.role === "admin";
  const [catalogue, requests, orders, quotes] = await Promise.all([
    listPartnerCatalogue(),
    preview ? Promise.resolve([]) : listEnquiriesForUser(user.id).catch(() => []),
    preview ? Promise.resolve([]) : listOrdersForUser(user.id).catch(() => []),
    preview ? Promise.resolve([]) : listOpenQuotesForUser(user.id).catch(() => []),
  ]);

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-16 lg:px-8">
      {preview && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Admin preview: this is what partners see. Request history is per partner, so none is shown here.{" "}
          <Link href="/admin" className="font-bold underline">
            Back to admin
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-gold-100 px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600 sm:text-xs">
            Partner portal
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            {user.company ?? user.name}
          </h1>
          <p className="mt-1 text-sm text-navy/60">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

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
    </section>
  );
}
