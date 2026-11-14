"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useNobystStore, type CartItem } from "@/store/useStore";
import { formatPrice } from "@/lib/catalogue";

function lineTotal(item: CartItem): number | null {
  return item.pricePesewas === null ? null : item.pricePesewas * item.quantity;
}

export default function CartView() {
  const cart = useNobystStore((s) => s.cart);
  const updateCartQuantity = useNobystStore((s) => s.updateCartQuantity);
  const removeFromCart = useNobystStore((s) => s.removeFromCart);

  // Wait for the persisted cart to load on the client before rendering it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) {
    return <div className="h-40 animate-pulse rounded-3xl bg-navy/5" aria-hidden />;
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-3xl border border-navy/10 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-navy/70">Your cart is empty.</p>
        <Link
          href="/products"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const knownTotal = cart.reduce((sum, c) => sum + (lineTotal(c) ?? 0), 0);
  const hasUnpriced = cart.some((c) => c.pricePesewas === null);
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  // Items without a price cannot be paid online; the server rejects them too.
  const payable = !hasUnpriced;

  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email.");
    if (phone.trim().length < 7) return setError("Please enter a phone number.");

    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          items: cart.map((c) => ({ slug: c.slug, color: c.color, quantity: c.quantity })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        authorizationUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.authorizationUrl) {
        throw new Error(data.error ?? "Could not start payment. Please try again.");
      }
      // Paystack hosts the card/mobile-money page; the cart is cleared after confirmation.
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment.");
      setPaying(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <ul className="space-y-3 lg:col-span-3" aria-label="Cart items">
        {cart.map((item) => (
          <li
            key={`${item.slug}-${item.color}`}
            className="flex gap-4 rounded-2xl border border-navy/10 bg-white p-4 shadow-sm"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-royal-100/50">
              {item.image && (
                <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="truncate text-sm font-bold text-navy">{item.name}</p>
                <p className="text-xs text-navy/60">Colour / finish: {item.color}</p>
                <p className="mt-0.5 text-xs font-semibold text-royal">
                  {formatPrice(item.pricePesewas) ?? "Price on request"}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-full border border-navy/15 bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.name}`}
                    onClick={() => updateCartQuantity(item.slug, item.color, item.quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-navy/5"
                  >
                    <Minus size={14} aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-navy" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.name}`}
                    onClick={() => updateCartQuantity(item.slug, item.color, item.quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-navy hover:bg-navy/5"
                  >
                    <Plus size={14} aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.slug, item.color)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-xs font-bold text-navy/60 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} aria-hidden />
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-5 lg:col-span-2">
        <div className="rounded-2xl border border-navy/10 bg-slate-50 p-5">
          <p className="flex justify-between text-sm text-navy/70">
            <span>Items</span>
            <span className="font-bold text-navy">{itemCount}</span>
          </p>
          <p className="mt-2 flex justify-between text-sm text-navy/70">
            <span>Total</span>
            <span className="font-bold text-navy">
              {formatPrice(knownTotal) ?? "On request"}
            </span>
          </p>
          {hasUnpriced && (
            <p className="mt-2 text-xs text-navy/60">
              Some items are priced on request, so they cannot be paid online. Remove them to pay now.
            </p>
          )}
        </div>

        <form onSubmit={pay} className="space-y-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-navy">Your details</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className="h-11 w-full rounded-xl border border-navy/15 px-3.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (for your receipt)"
            type="email"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-navy/15 px-3.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (for delivery)"
            type="tel"
            autoComplete="tel"
            className="h-11 w-full rounded-xl border border-navy/15 px-3.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={paying || !payable}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-navy px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-royal disabled:opacity-60"
          >
            {paying ? "Redirecting to Paystack…" : "Pay with Paystack"}
          </button>
          <p className="text-center text-[11px] text-navy/55">
            Card and mobile money, processed securely by Paystack.
          </p>
        </form>
      </div>
    </div>
  );
}
