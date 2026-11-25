"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type { OrderSummary } from "@/lib/orders";
import { formatPrice } from "@/lib/catalogue";
import { describeDelivery, FULFILMENT_STATUSES, type FulfilmentStatus } from "@/lib/delivery";

type Props = {
  initialOrders: OrderSummary[];
  initialUnconfirmed: OrderSummary[];
  onNotify: (message: string) => void;
};

const STATUS_STYLES: Record<FulfilmentStatus, string> = {
  new: "bg-rose-100 text-rose-700",
  processing: "bg-amber-100 text-amber-800",
  dispatched: "bg-blue-100 text-blue-800",
  ready: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function sqlDate(value: string | null): string {
  if (!value) return "";
  const iso = value.includes("T") ? value : value.replace(" ", "T") + "Z";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Admin Orders tab: paid orders with fulfilment controls, plus payments awaiting confirmation. */
export default function OrdersPanel({ initialOrders, initialUnconfirmed, onNotify }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [unconfirmed, setUnconfirmed] = useState(initialUnconfirmed);
  const [filter, setFilter] = useState<"open" | "all" | FulfilmentStatus>("open");
  const [busy, setBusy] = useState<string | null>(null);

  const shown = orders.filter((o) =>
    filter === "all"
      ? true
      : filter === "open"
      ? !["delivered", "cancelled"].includes(o.fulfilmentStatus)
      : o.fulfilmentStatus === filter
  );

  async function setStatus(order: OrderSummary, status: FulfilmentStatus) {
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.reference}? The customer is emailed. Refund them in your payment provider's dashboard (Hubtel or Paystack) separately.`)) {
      return;
    }
    setBusy(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfilmentStatus: status }),
      });
      const data = (await res.json().catch(() => ({}))) as { order?: OrderSummary; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Could not update the order.");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order! : o)));
      onNotify(`${order.reference} marked ${FULFILMENT_STATUSES.find((s) => s.id === status)?.label.toLowerCase()}.`);
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not update the order.");
    } finally {
      setBusy(null);
    }
  }

  async function recheck(order: OrderSummary) {
    setBusy(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/verify`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { result?: string; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "Could not re-check the payment.");
      if (data.result === "paid") {
        setUnconfirmed((prev) => prev.filter((o) => o.id !== order.id));
        setOrders((prev) => [{ ...order, status: "paid", fulfilmentStatus: "new" }, ...prev]);
        onNotify(`${order.reference} is paid. It is now in the paid orders list.`);
      } else {
        setUnconfirmed((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: data.result! } : o)));
        onNotify(`${order.reference}: ${data.result === "pending" ? "not confirmed as paid yet" : "payment failed"}.`);
      }
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Could not re-check the payment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Collection</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Orders</h1>
      <p className="mt-1 text-xs text-navy/60">
        Paid orders and their delivery. Customers are emailed when an order is dispatched, ready for
        pickup, delivered or cancelled.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(
          [
            ["open", "To do"],
            ["all", "All"],
            ...FULFILMENT_STATUSES.map((s) => [s.id, s.label] as const),
          ] as [typeof filter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              filter === id ? "bg-navy text-white" : "bg-navy/5 text-navy hover:bg-navy/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {shown.length === 0 && (
          <div className="rounded-2xl border border-navy/10 bg-white p-12 text-center text-xs text-navy/50">
            {orders.length === 0 ? "No paid orders yet." : "No orders in this view."}
          </div>
        )}
        {shown.map((order) => (
          <div key={order.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/5 pb-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy">
                  {order.name}{" "}
                  {order.enquiryId && (
                    <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Partner quote
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-navy/50">
                  {order.reference} · {order.email} · {order.phone}
                </p>
                <p className="text-[11px] text-navy/40">Paid {sqlDate(order.paidAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-royal">{formatPrice(order.totalPesewas)}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[order.fulfilmentStatus]}`}>
                  {FULFILMENT_STATUSES.find((s) => s.id === order.fulfilmentStatus)?.label}
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
              <ul className="space-y-1 text-navy/75">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.quantity} × {item.productName}
                    {item.color ? ` (${item.color})` : ""} at {formatPrice(item.unitPesewas)}
                    {item.partnerName && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Sold by {item.partnerName} · {FULFILMENT_STATUSES.find((s) => s.id === item.fulfilmentStatus)?.label ?? "New"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-slate-50 p-3 text-navy/75">
                <p>
                  <strong>{order.delivery.method === "pickup" ? "Pickup" : "Delivery"}:</strong>{" "}
                  {describeDelivery(order.delivery)}
                </p>
                {order.delivery.notes && (
                  <p className="mt-1">
                    <strong>Notes:</strong> {order.delivery.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-[11px] font-bold text-navy/60" htmlFor={`status-${order.id}`}>
                Status
              </label>
              <select
                id={`status-${order.id}`}
                value={order.fulfilmentStatus}
                disabled={busy === order.id}
                onChange={(e) => setStatus(order, e.target.value as FulfilmentStatus)}
                className="rounded-lg border border-navy/20 bg-white px-2 py-1 text-xs font-bold text-navy"
              >
                {FULFILMENT_STATUSES.filter((s) => s.id !== "ready" || order.delivery.method === "pickup").map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <a href={`tel:${order.phone}`} className="text-[11px] font-bold text-royal underline">
                Call customer
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-lg font-bold text-navy">Awaiting payment confirmation</h2>
        <p className="mt-1 text-xs text-navy/60">
          Checkouts and partner quotes from the last 14 days that the payment provider has not confirmed. If a
          customer says they paid, re-check here. Most of these are simply abandoned checkouts.
        </p>
        {unconfirmed.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-navy/10 bg-white p-6 text-center text-xs text-navy/50">
            Nothing waiting.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-navy/5 rounded-2xl border border-navy/10 bg-white">
            {unconfirmed.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-navy">
                    {order.reference} · {formatPrice(order.totalPesewas)}
                    {order.enquiryId && <span className="ml-1 text-amber-700">(partner quote)</span>}
                  </p>
                  <p className="text-navy/50">
                    {order.name} · {order.email} · started {sqlDate(order.createdAt)} ·{" "}
                    {order.status === "failed" ? "failed" : "not paid yet"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === order.id}
                  onClick={() => recheck(order)}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-navy/5 px-3 font-bold text-navy hover:bg-navy hover:text-white disabled:opacity-60"
                >
                  <RefreshCw size={13} className={busy === order.id ? "animate-spin" : ""} />
                  Re-check payment
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
