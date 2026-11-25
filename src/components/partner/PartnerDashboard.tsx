"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Boxes,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import type { Product, ProductStatus } from "@/lib/products";
import type { CategoryNode } from "@/lib/categories";
import type { CategoryRequest } from "@/lib/marketplace";
import type { Earnings, PartnerOrderItem, Payout } from "@/lib/partner-orders";
import type { PartnerStatus } from "@/lib/roles";
import { formatPrice } from "@/lib/catalogue";
import { describeDelivery, FULFILMENT_STATUSES, type FulfilmentStatus } from "@/lib/delivery";
import ProductForm from "@/components/admin/ProductForm";
import StockBadge from "@/components/StockBadge";

type Tab = "overview" | "products" | "orders" | "earnings" | "wholesale" | "account";

type Props = {
  partner: { name: string; company: string | null; email: string; status: PartnerStatus | null; preview: boolean };
  initialProducts: Product[];
  categories: CategoryNode[];
  initialCategoryRequests: CategoryRequest[];
  initialOrderItems: PartnerOrderItem[];
  earnings: Earnings;
  payouts: Payout[];
  payoutDetails: string | null;
  commissionBps: number;
  wholesale: ReactNode | null;
  security: ReactNode;
};

const STATUS_BADGE: Record<ProductStatus, { label: string; className: string }> = {
  live: { label: "Live in shop", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Waiting for review", className: "bg-amber-100 text-amber-800" },
  rejected: { label: "Needs changes", className: "bg-rose-100 text-rose-700" },
  hidden: { label: "Hidden", className: "bg-slate-100 text-slate-600" },
};

const field =
  "mt-1 min-h-[42px] w-full rounded-lg border border-navy/20 bg-white px-3 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

function sqlDate(value: string | null): string {
  if (!value) return "";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

/** The partner's own shop dashboard: products, orders, earnings, wholesale and account. */
export default function PartnerDashboard(props: Props) {
  const router = useRouter();
  const { partner } = props;
  const [tab, setTab] = useState<Tab>("overview");
  const [products, setProducts] = useState(props.initialProducts);
  const [items, setItems] = useState(props.initialOrderItems);
  const [requests, setRequests] = useState(props.initialCategoryRequests);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const trusted = partner.status === "trusted";
  const readOnly = partner.preview;
  const counts = {
    live: products.filter((p) => p.status === "live").length,
    pending: products.filter((p) => p.status === "pending").length,
    rejected: products.filter((p) => p.status === "rejected").length,
  };
  const toDeliver = items.filter((i) => !["delivered", "cancelled"].includes(i.fulfilmentStatus)).length;

  function notify(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 5000);
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Layers; badge?: string | null }[] = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "products", label: "Products", icon: Boxes, badge: products.length ? String(products.length) : null },
    { id: "orders", label: "Orders", icon: ShoppingBag, badge: toDeliver ? `${toDeliver} to deliver` : null },
    { id: "earnings", label: "Earnings", icon: Banknote },
    ...(props.wholesale ? [{ id: "wholesale" as Tab, label: "Wholesale", icon: Tag }] : []),
    { id: "account", label: "Account & security", icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8">
      {partner.preview && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Admin preview: this is the partner dashboard. Partners only see their own products and orders.{" "}
          <Link href="/admin" className="font-bold underline">
            Back to admin
          </Link>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-gold-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-600">
            Partner dashboard
          </span>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-navy sm:text-4xl">{partner.company ?? partner.name}</h1>
          <p className="mt-1 text-sm text-navy/60">
            {partner.email} ·{" "}
            {trusted ? (
              <span className="font-bold text-emerald-700">Trusted partner: your changes go live straight away</span>
            ) : (
              <span className="font-bold text-amber-700">New partner: products go live after our review</span>
            )}
          </p>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-navy/10" aria-label="Partner dashboard">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-bold ${
                tab === t.id ? "border-royal text-navy" : "border-transparent text-navy/55 hover:text-navy"
              }`}
            >
              <Icon size={16} aria-hidden />
              {t.label}
              {t.badge && <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px]">{t.badge}</span>}
            </button>
          );
        })}
      </nav>

      {notice && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-royal px-4 py-3 text-sm font-medium text-white" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Live products", counts.live],
                ["Waiting for review", counts.pending],
                ["Orders to deliver", toDeliver],
                ["Owed to you", formatPrice(props.earnings.owedPesewas) ?? "GH₵0.00"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-navy/55">{label}</p>
                  <p className="mt-2 font-display text-2xl font-extrabold text-navy">{value}</p>
                </div>
              ))}
            </div>
            {counts.rejected > 0 && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {counts.rejected} product{counts.rejected === 1 ? " needs" : "s need"} changes before going live. Open
                Products to see our note.
              </p>
            )}
            <div className="rounded-2xl border border-navy/10 bg-white p-5 text-sm text-navy/75 shadow-sm">
              <h2 className="font-display text-lg font-bold text-navy">How selling on NOBYST works</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Add your products with clear photos, a price and stock status. They show as “Sold by {partner.company ?? "you"}”.</li>
                <li>{trusted ? "Your products go live in the shop straight away." : "Our team reviews new partners' products, usually within one working day."}</li>
                <li>Customers pay NOBYST securely online (card or mobile money). You see each order here with the delivery details.</li>
                <li>Deliver the order and mark it delivered. Your earnings (after NOBYST&apos;s {props.commissionBps / 100}% commission) are paid out to you.</li>
              </ol>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setTab("products");
                    setEditing("new");
                  }}
                  className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-royal"
                >
                  <Plus size={16} /> Add a product
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-navy/60">
                {trusted ? "Changes go live straight away." : "New and edited products wait for our review before they appear in the shop."}
              </p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setEditing("new")}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white hover:bg-royal"
                >
                  <Plus size={16} /> Add a product
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <p className="rounded-2xl border border-navy/10 bg-white p-10 text-center text-sm text-navy/55">
                No products yet. Add your first one to start selling.
              </p>
            ) : (
              <ul className="space-y-3">
                {products.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Image src={p.image} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy">{p.name}</p>
                      <p className="text-xs text-navy/55">
                        {p.category} · {formatPrice(p.pricePesewas) ?? "Ask for price"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[p.status].className}`}>
                          {STATUS_BADGE[p.status].label}
                        </span>
                        <StockBadge status={p.stockStatus} />
                      </div>
                      {p.reviewNote && (p.status === "rejected" || p.status === "hidden") && (
                        <p className="mt-1 text-xs text-rose-700">
                          <strong>Note from NOBYST:</strong> {p.reviewNote}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.status === "live" && (
                          <a href={`/products/${p.slug}`} target="_blank" className="rounded-lg p-2 text-navy/60 hover:bg-navy/5" title="View in shop">
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button type="button" onClick={() => setEditing(p)} className="rounded-lg p-2 text-navy hover:bg-navy/5" title="Edit">
                          <Pencil size={16} />
                        </button>
                        {p.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={busy === p.id}
                            title={p.status === "hidden" ? "Show in shop" : "Hide from shop"}
                            onClick={() =>
                              run(p.id, async () => {
                                const r = (await send(`/api/partner/products/${p.id}/visibility`, "POST", { visible: p.status === "hidden" })) as { status: ProductStatus };
                                setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: r.status } : x)));
                                notify(r.status === "hidden" ? `${p.name} is hidden from the shop.` : r.status === "live" ? `${p.name} is back in the shop.` : `${p.name} will show again after review.`);
                              })
                            }
                            className="rounded-lg p-2 text-navy hover:bg-navy/5"
                          >
                            {p.status === "hidden" ? <Eye size={16} /> : <EyeOff size={16} />}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === p.id}
                          title="Delete"
                          onClick={() => {
                            if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
                            run(p.id, async () => {
                              await send(`/api/partner/products/${p.id}`, "DELETE");
                              setProducts((prev) => prev.filter((x) => x.id !== p.id));
                              notify(`${p.name} deleted.`);
                            });
                          }}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <CategoryRequestBox
              categories={props.categories}
              requests={requests}
              readOnly={readOnly}
              onCreated={(r) => {
                setRequests((prev) => [r, ...prev]);
                notify(`We'll review your request for “${r.name}”.`);
              }}
            />
          </div>
        )}

        {tab === "orders" && (
          <div className="space-y-4">
            <p className="text-sm text-navy/60">
              Orders for your products, paid through NOBYST. Deliver each one and update its status; the customer is
              emailed when it is dispatched, ready, delivered or cancelled.
            </p>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-navy/10 bg-white p-10 text-center text-sm text-navy/55">No orders yet.</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-navy">
                        {item.quantity} × {item.productName}
                        {item.color ? ` (${item.color})` : ""}
                      </p>
                      <p className="text-xs text-navy/55">
                        Order {item.orderReference} · paid {sqlDate(item.paidAt)} · {formatPrice(item.unitPesewas * item.quantity)}
                      </p>
                    </div>
                    <select
                      value={item.fulfilmentStatus}
                      disabled={readOnly || busy === item.id}
                      aria-label={`Status of ${item.productName}`}
                      onChange={(e) => {
                        const status = e.target.value as FulfilmentStatus;
                        if (status === "cancelled" && !window.confirm("Cancel this order line? The customer is emailed and NOBYST arranges the refund.")) return;
                        run(item.id, async () => {
                          const r = (await send(`/api/partner/orders/${item.id}`, "PATCH", { fulfilmentStatus: status })) as { item: PartnerOrderItem };
                          setItems((prev) => prev.map((x) => (x.id === item.id ? r.item : x)));
                          notify("Order updated.");
                          router.refresh();
                        });
                      }}
                      className="rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-xs font-bold text-navy"
                    >
                      {FULFILMENT_STATUSES.filter((s) => s.id !== "ready" || item.delivery.method === "pickup").map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-navy/75">
                    <p>
                      <strong>Customer:</strong> {item.customer.name} ·{" "}
                      <a href={`tel:${item.customer.phone}`} className="font-bold text-royal underline">
                        {item.customer.phone}
                      </a>
                    </p>
                    <p className="mt-1">
                      <strong>{item.delivery.method === "pickup" ? "Pickup" : "Deliver to"}:</strong> {describeDelivery(item.delivery)}
                    </p>
                    {item.delivery.notes && (
                      <p className="mt-1">
                        <strong>Notes:</strong> {item.delivery.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "earnings" && (
          <EarningsTab
            earnings={props.earnings}
            payouts={props.payouts}
            payoutDetails={props.payoutDetails}
            commissionBps={props.commissionBps}
            readOnly={readOnly}
            onSaved={() => notify("Payout details saved.")}
          />
        )}

        {tab === "wholesale" && props.wholesale}

        {tab === "account" && <div className="max-w-xl">{props.security}</div>}
      </div>

      {editing && !readOnly && (
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={props.categories.map((c) => c.name)}
          apiBase="/api/partner"
          showWholesale={false}
          onSaved={(saved) => {
            setProducts((prev) => {
              const i = prev.findIndex((p) => p.id === saved.id);
              if (i < 0) return [saved, ...prev];
              const next = [...prev];
              next[i] = saved;
              return next;
            });
            setEditing(null);
            notify(saved.status === "live" ? `${saved.name} is live in the shop.` : `${saved.name} was sent for review.`);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CategoryRequestBox({
  categories,
  requests,
  readOnly,
  onCreated,
}: {
  categories: CategoryNode[];
  requests: CategoryRequest[];
  readOnly: boolean;
  onCreated: (r: CategoryRequest) => void;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const top = categories.filter((c) => !c.parentId);

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-navy">
        <FolderPlus size={18} className="text-royal" /> Need a new category?
      </h2>
      <p className="mt-1 text-xs text-navy/60">
        File products under NOBYST&apos;s categories. If none fits, ask for a new one and we&apos;ll add it.
      </p>
      {!readOnly && (
        <form
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const r = (await send("/api/partner/category-requests", "POST", { name, parentId: parentId || null, note })) as { request: CategoryRequest };
              onCreated(r.request);
              setName("");
              setNote("");
              setParentId("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not send the request.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="text-xs font-bold text-navy">
            Category name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} className={field} />
          </label>
          <label className="text-xs font-bold text-navy">
            Under (optional)
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={field}>
              <option value="">Top level</option>
              {top.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60">
            {busy ? "Sending…" : "Request"}
          </button>
          <label className="text-xs font-bold text-navy sm:col-span-3">
            What will you sell in it? (optional)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={field} />
          </label>
          {error && <p className="text-sm font-bold text-rose-600 sm:col-span-3">{error}</p>}
        </form>
      )}
      {requests.length > 0 && (
        <ul className="mt-4 divide-y divide-navy/5 text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="font-bold text-navy">{r.name}</span>
              <span className={`text-xs font-bold ${r.status === "approved" ? "text-emerald-700" : r.status === "declined" ? "text-rose-700" : "text-amber-700"}`}>
                {r.status === "pending" ? "Waiting for review" : r.status === "approved" ? "Added" : `Declined${r.decidedNote ? `: ${r.decidedNote}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EarningsTab({
  earnings,
  payouts,
  payoutDetails,
  commissionBps,
  readOnly,
  onSaved,
}: {
  earnings: Earnings;
  payouts: Payout[];
  payoutDetails: string | null;
  commissionBps: number;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [details, setDetails] = useState(payoutDetails ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const money = (p: number) => formatPrice(p) ?? "GH₵0.00";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Sales (before commission)", money(earnings.grossPesewas)],
          [`NOBYST commission (${commissionBps / 100}%)`, money(earnings.commissionPesewas)],
          ["Earned on delivered orders", money(earnings.earnedPesewas)],
          ["Not yet delivered", money(earnings.pendingPesewas)],
          ["Paid out to you", money(earnings.paidOutPesewas)],
          ["Owed to you now", money(earnings.owedPesewas)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-navy/55">{label}</p>
            <p className="mt-2 font-display text-xl font-extrabold text-navy">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-navy/60">
        Earnings count once an order is marked delivered. NOBYST pays out what is owed to the details below.
      </p>

      <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-navy">Payout details</h2>
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await send("/api/partner/settings", "PATCH", { payoutDetails: details });
              onSaved();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            disabled={readOnly}
            maxLength={300}
            rows={3}
            placeholder="e.g. MTN MoMo 024 000 0000 (Ama Mensah), or bank name, account name and number"
            className="w-full rounded-lg border border-navy/20 p-3 text-sm text-navy"
          />
          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          {!readOnly && (
            <button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60">
              {busy ? "Saving…" : "Save payout details"}
            </button>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold text-navy">Payouts</h2>
        {payouts.length === 0 ? (
          <p className="mt-2 text-sm text-navy/55">No payouts yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-navy/5 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {sqlDate(p.createdAt)} · {p.method}
                  {p.reference ? ` · ref ${p.reference}` : ""}
                </span>
                <strong className="text-navy">{money(p.amountPesewas)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
