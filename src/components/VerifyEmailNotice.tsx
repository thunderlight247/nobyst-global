"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";

/** Shown to signed-in customers who have not confirmed their email yet. */
export default function VerifyEmailNotice({ email, context = "account" }: { email: string; context?: "account" | "cart" }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setState("sending");
    setError(null);
    const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) setState("sent");
    else {
      setState("error");
      setError(data.error ?? "Could not send the email.");
    }
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900" role="status">
      <p className="flex items-center gap-2 font-bold">
        <MailCheck size={18} aria-hidden /> Confirm your email{context === "cart" ? " to pay" : ""}
      </p>
      <p className="mt-1">
        We emailed a confirmation link to <strong>{email}</strong>. Open it to {context === "cart" ? "complete your purchase" : "start ordering"}.
        Check your spam folder if you can&apos;t find it.
      </p>
      {state === "sent" ? (
        <p className="mt-3 font-bold text-emerald-700">A new link is on its way.</p>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="mt-3 min-h-[40px] rounded-full bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Resend the link"}
        </button>
      )}
      {error && <p className="mt-2 font-bold text-rose-700">{error}</p>}
    </div>
  );
}
