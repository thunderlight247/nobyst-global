"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field =
  "min-h-[48px] w-full rounded-xl border border-navy/20 bg-white px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

/** Second sign-in step: a code from the authenticator app, or a recovery code. */
export default function TwoFactorVerifyForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; home?: string; usedRecoveryCode?: boolean };
      if (!res.ok) throw new Error(data.error ?? "That code is not right.");
      router.replace(next ?? data.home ?? "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code is not right.");
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    router.replace("/account");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs font-bold text-navy">
        {recovery ? "Recovery code" : "6-digit code from your authenticator app"}
        <input
          value={code}
          onChange={(e) =>
            setCode(recovery ? e.target.value.slice(0, 20) : e.target.value.replace(/[^\d]/g, "").slice(0, 6))
          }
          inputMode={recovery ? "text" : "numeric"}
          autoComplete="one-time-code"
          autoFocus
          placeholder={recovery ? "abcde-12345" : "123456"}
          className={`${field} mt-1.5`}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-bold text-rose-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || (recovery ? code.trim().length < 10 : code.length !== 6)}
        className="min-h-[48px] w-full rounded-full bg-navy px-6 text-sm font-bold text-white hover:bg-royal disabled:opacity-50"
      >
        {busy ? "Checking…" : "Continue"}
      </button>
      <div className="flex justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            setRecovery(!recovery);
            setCode("");
            setError(null);
          }}
          className="font-bold text-royal underline"
        >
          {recovery ? "Use the app code" : "Lost your phone? Use a recovery code"}
        </button>
        <button type="button" onClick={signOut} className="font-bold text-navy/60 underline">
          Sign out
        </button>
      </div>
    </form>
  );
}
