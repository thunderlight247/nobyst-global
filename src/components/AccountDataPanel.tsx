"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

const field =
  "mt-1 min-h-[42px] w-full rounded-lg border border-navy/20 bg-white px-3 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20";

/** "Your data" on the account page: download it, or delete the account. */
export default function AccountDataPanel({ canDelete, twoFactorEnabled }: { canDelete: boolean; twoFactorEnabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, code, confirm }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setError(data.error ?? "Could not delete the account.");
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-navy">Your data</h2>
      <p className="mt-1 text-xs text-navy/60">
        See what we hold about you, or delete your account. Read our{" "}
        <a href="/privacy" className="font-bold text-royal underline">
          privacy policy
        </a>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/api/account/export"
          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-navy/20 px-4 text-sm font-bold text-navy hover:border-royal"
        >
          <Download size={16} /> Download my data
        </a>
        {canDelete && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-full px-4 text-sm font-bold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={16} /> Delete my account
          </button>
        )}
      </div>
      {!canDelete && (
        <p className="mt-3 text-xs text-navy/55">To close a partner or staff account, email info@nobyst.com.</p>
      )}
      {open && (
        <form onSubmit={remove} className="mt-4 space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
          <p className="text-sm text-navy/80">
            This removes your sign-in and personal details for good. Paid orders are kept for our accounts,
            without your name, email, phone or address. This cannot be undone.
          </p>
          <label className="block text-xs font-bold text-navy">
            Password
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={field} />
          </label>
          {twoFactorEnabled && (
            <label className="block text-xs font-bold text-navy">
              6-digit code from your authenticator app
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" className={field} />
            </label>
          )}
          <label className="block text-xs font-bold text-navy">
            Type DELETE to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
          </label>
          {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || confirm !== "DELETE" || !password}
              className="min-h-[42px] rounded-full bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete my account"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="min-h-[42px] rounded-full border border-navy/20 px-5 text-sm font-bold text-navy">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
