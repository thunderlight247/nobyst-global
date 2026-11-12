"use client";
import { useState } from "react";
import { MessageCircle, Send, AlertCircle } from "lucide-react";
import { site } from "@/data/site";
import { mailtoLink, whatsappLink } from "@/lib/contact-links";

/** Static site: composes a bulk enquiry and opens WhatsApp (email fallback shown after sending). */
export default function BulkOrderForm({ product }: { product: string }) {
  const [qty, setQty] = useState("10");
  const [buyer, setBuyer] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const quantity = Number(qty);
  const valid = Number.isInteger(quantity) && quantity >= 5 && quantity <= 10000;

  const message = `Hello ${site.short}, I would like a bulk quote for: ${product}. Quantity: ${qty}${
    buyer.trim() ? `. Business / name: ${buyer.trim()}` : ""
  }`;

  const mailto = mailtoLink(`Bulk quote: ${product}`, message);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) {
      setError("Enter a quantity of 5 or more (whole units).");
      return;
    }
    setError("");
    setSent(true);

    fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bulk_order",
        name: buyer.trim() || "Wholesale Buyer",
        email: "wholesale@nobyst.com",
        phone: null,
        topic: "Bulk order inquiry",
        message: message.trim(),
        productName: product,
        quantity: parseInt(qty, 10) || 5,
      }),
    }).catch((err) => console.warn("Failed to persist bulk order:", err));

    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bulk-qty" className="mb-1.5 block text-xs font-bold text-navy">
            Quantity
          </label>
          <input
            id="bulk-qty"
            type="number"
            inputMode="numeric"
            min={5}
            max={10000}
            step={1}
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "bulk-qty-error" : undefined}
            className="min-h-[44px] w-full rounded-xl border border-navy/20 bg-white px-3.5 py-2.5 text-sm text-navy transition-colors focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
        </div>
        <div>
          <label htmlFor="bulk-buyer" className="mb-1.5 block text-xs font-bold text-navy">
            Business or name <span className="font-normal text-navy/50">(optional)</span>
          </label>
          <input
            id="bulk-buyer"
            type="text"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            placeholder="e.g. Grace Phones, Techiman"
            className="min-h-[44px] w-full rounded-xl border border-navy/20 bg-white px-3.5 py-2.5 text-sm text-navy transition-colors focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
          />
        </div>
      </div>

      {error && (
        <p id="bulk-qty-error" role="alert" className="flex items-start gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <button
        type="submit"
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-royal px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-navy sm:w-auto"
      >
        <Send size={16} aria-hidden />
        Send bulk enquiry on WhatsApp
      </button>

      {sent ? (
        <p className="text-xs leading-relaxed text-navy/70" role="status">
          WhatsApp should have opened with your enquiry. If it did not,{" "}
          <a href={mailto} className="inline-flex items-center gap-1 font-bold text-royal hover:text-navy">
            <MessageCircle size={12} aria-hidden />
            email the same details
          </a>
          .
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-navy/55">
          We reply with pricing and availability. No payment is taken on this website.
        </p>
      )}
    </form>
  );
}
