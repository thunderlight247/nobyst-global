"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

/**
 * Sign-in form for the admin and partner areas. There is no sign-up here: admins are created by
 * an owner and partners join by invitation.
 */
export default function AreaLoginForm({ area, next }: { area: "admin" | "partner"; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password, area }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; twoFactorRequired?: boolean };
      if (!res.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
      router.replace(body.twoFactorRequired ? `/signin/verify?next=${encodeURIComponent(next)}` : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <label className="block text-xs font-bold text-navy">
        Email
        <input name="email" type="email" required autoComplete="username" className={field} />
      </label>
      <label className="block text-xs font-bold text-navy">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={field} />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-rose-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-[48px] w-full rounded-full bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-royal disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-xs text-navy/60">
        <Link href="/account" className="font-bold text-royal underline">
          Forgot your password?
        </Link>{" "}
        Reset it from My account.
      </p>
    </form>
  );
}
