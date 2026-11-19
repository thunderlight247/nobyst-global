"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

/**
 * "Confirm it's you" for risky admin actions. adminFetch() behaves like fetch(), but when the
 * server answers 403 { reauthRequired: true } it opens the dialog (mounted once by <ReauthHost />),
 * and after a successful confirmation repeats the original request once.
 */

let openDialog: (() => Promise<boolean>) | null = null;

export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 403 || !openDialog) return res;
  const data = (await res.clone().json().catch(() => null)) as { reauthRequired?: boolean } | null;
  if (!data?.reauthRequired) return res;
  const confirmed = await openDialog();
  return confirmed ? fetch(input, init) : res;
}

const field =
  "mt-1 min-h-[42px] w-full rounded-lg border border-navy/20 bg-white px-3 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

export function ReauthHost() {
  const [resolver, setResolver] = useState<((ok: boolean) => void) | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    openDialog = () =>
      new Promise<boolean>((resolve) => {
        setPassword("");
        setCode("");
        setError(null);
        setResolver(() => resolve);
      });
    return () => {
      openDialog = null;
    };
  }, []);

  if (!resolver) return null;

  const close = (ok: boolean) => {
    resolver(ok);
    setResolver(null);
    setBusy(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, code }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) return close(true);
    setError(data.error ?? "Could not confirm. Please try again.");
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" aria-labelledby="reauth-title">
        <h2 id="reauth-title" className="flex items-center gap-2 font-display text-xl font-bold text-navy">
          <ShieldCheck className="text-royal" size={22} aria-hidden /> Confirm it&apos;s you
        </h2>
        <p className="mt-1 text-xs text-navy/60">
          This change is protected. Enter your password and the current code from your authenticator
          app. You won&apos;t be asked again for 15 minutes.
        </p>
        <label className="mt-4 block text-xs font-bold text-navy">
          Password
          <PasswordInput
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </label>
        <label className="mt-3 block text-xs font-bold text-navy">
          6-digit code (or a recovery code)
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 20))}
            className={`${field} font-mono tracking-widest`}
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-rose-600">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => close(false)} className="min-h-[42px] rounded-lg border border-navy/20 px-4 text-xs font-bold text-navy">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !password}
            className="min-h-[42px] rounded-lg bg-navy px-4 text-xs font-bold text-white hover:bg-royal disabled:opacity-60"
          >
            {busy ? "Checking…" : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}
