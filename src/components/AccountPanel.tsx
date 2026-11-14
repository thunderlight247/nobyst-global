"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signin" | "signup" | "forgot";

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  return { ok: res.ok, data };
}

export default function AccountPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setError(null);
    setNotice(null);
    setBusy(true);

    if (mode === "forgot") {
      const { data: res } = await post("/api/auth/forgot", { email: data.email });
      setBusy(false);
      setNotice(res.message ?? "If an account exists for this email, a reset link is on its way.");
      return;
    }

    const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const body = mode === "signup" ? { name: data.name, email: data.email, password: data.password } : { email: data.email, password: data.password };
    const { ok, data: res } = await post(url, body);
    if (!ok) {
      setBusy(false);
      setError(res.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.refresh();
  }

  async function signOut() {
    setBusy(true);
    await post("/api/auth/logout", {});
    router.refresh();
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "signin", label: "Sign in" },
    { id: "signup", label: "Create account" },
  ];

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:p-8">
      {mode !== "forgot" && (
        <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-navy/5 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={mode === t.id}
              onClick={() => {
                setMode(t.id);
                setError(null);
              }}
              className={`min-h-[40px] rounded-full text-sm font-bold transition-colors ${
                mode === t.id ? "bg-navy text-white" : "text-navy/70 hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-4">
        {mode === "signup" && (
          <label className="block text-sm font-bold text-navy">
            Your name
            <input name="name" required autoComplete="name" className={field} />
          </label>
        )}
        <label className="block text-sm font-bold text-navy">
          Email address
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        {mode !== "forgot" && (
          <label className="block text-sm font-bold text-navy">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={field}
            />
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-sm font-semibold text-emerald-700">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-royal disabled:opacity-60"
        >
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2 text-center text-sm">
        {mode === "signin" && (
          <button type="button" onClick={() => setMode("forgot")} className="font-bold text-royal hover:text-navy">
            Forgot your password?
          </button>
        )}
        {mode === "forgot" && (
          <button type="button" onClick={() => setMode("signin")} className="font-bold text-royal hover:text-navy">
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post("/api/auth/logout", {});
        router.refresh();
      }}
      className="min-h-[44px] rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-bold text-navy hover:border-royal hover:text-royal disabled:opacity-60"
    >
      Sign out
    </button>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (data.password !== data.confirm) {
      setError("The passwords do not match.");
      return;
    }
    setError(null);
    setBusy(true);
    const { ok, data: res } = await post("/api/auth/reset", { token, password: data.password });
    setBusy(false);
    if (!ok) {
      setError(res.error ?? "This reset link is invalid or has expired.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="text-sm font-semibold text-emerald-700">
        Your password has been changed. <a href="/account" className="font-bold text-royal underline">Sign in</a> with your new password.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="block text-sm font-bold text-navy">
        New password
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      <label className="block text-sm font-bold text-navy">
        Confirm new password
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={field} />
      </label>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="min-h-[48px] rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-royal disabled:opacity-60"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
