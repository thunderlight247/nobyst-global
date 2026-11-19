"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

type Props =
  | { mode: "register"; token: string; email: string; defaultName: string }
  | { mode: "accept"; token: string };

/** Creates the invited partner's account, or accepts for an already signed-in account. */
export default function InviteAcceptForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(payload: Record<string, unknown>) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/partner/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: props.token, ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      router.replace("/partner");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (props.mode === "accept") {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={() => submit({ action: "accept" })}
          className="min-h-[44px] w-full rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-60"
        >
          {busy ? "Opening…" : "Accept and open my partner portal"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        if (data.password !== data.confirm) {
          setError("The two passwords do not match.");
          return;
        }
        submit({ action: "register", name: data.name, password: data.password });
      }}
    >
      <label className="block text-xs font-bold text-navy">
        Email
        <input value={props.email} readOnly className={`${field} cursor-not-allowed opacity-70`} />
      </label>
      <label className="block text-xs font-bold text-navy">
        Your name
        <input name="name" defaultValue={props.defaultName} required minLength={2} maxLength={120} className={field} autoComplete="name" />
      </label>
      <label className="block text-xs font-bold text-navy">
        Choose a password
        <PasswordInput name="password" required minLength={8} maxLength={200} className={field} autoComplete="new-password" />
      </label>
      <label className="block text-xs font-bold text-navy">
        Confirm password
        <PasswordInput name="confirm" required minLength={8} maxLength={200} className={field} autoComplete="new-password" />
      </label>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-[44px] w-full rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-royal disabled:opacity-60"
      >
        {busy ? "Creating your access…" : "Create my partner sign-in"}
      </button>
    </form>
  );
}
