"use client";
import { useState } from "react";

type State = { status: "idle" | "sending" | "ok" | "error"; message?: string; errors?: Record<string, string> };
const types = ["Supplier", "Distributor", "Business collaborator", "Other organisation"];

export default function EnquiryForm() {
  const [s, setS] = useState<State>({ status: "idle" });
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const errors: Record<string, string> = {};
    if (String(data.name ?? "").trim().length < 2) errors.name = "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(String(data.email ?? ""))) errors.email = "Enter a valid email address.";
    if (String(data.message ?? "").trim().length < 20) errors.message = "Write at least 20 characters so we understand your enquiry.";
    if (Object.keys(errors).length) return setS({ status: "error", errors });
    setS({ status: "sending" });
    try {
      const r = await fetch("/api/enquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const j = await r.json();
      setS(r.ok ? { status: "ok", message: j.message } : { status: "error", message: j.message });
    } catch { setS({ status: "error", message: "Could not reach the server. Please email or WhatsApp us instead." }); }
  }
  const field = "mt-1 w-full rounded-lg border border-navy/20 bg-white px-4 py-2.5";
  const err = (k: string) => s.errors?.[k] && <p role="alert" className="mt-1 text-sm text-red-700">{s.errors[k]}</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <label className="block font-semibold">Your name<input name="name" autoComplete="name" className={field} />{err("name")}</label>
      <label className="block font-semibold">Organisation (optional)<input name="organisation" autoComplete="organization" className={field} /></label>
      <label className="block font-semibold">Email<input name="email" type="email" autoComplete="email" className={field} />{err("email")}</label>
      <label className="block font-semibold">I am a<select name="type" className={field}>{types.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="block font-semibold">Your enquiry<textarea name="message" rows={5} className={field} />{err("message")}</label>
      <button disabled={s.status === "sending"} className="rounded-full bg-navy px-6 py-3 font-bold text-white hover:bg-royal disabled:opacity-60">{s.status === "sending" ? "Sending..." : "Send enquiry"}</button>
      <div aria-live="polite">
        {s.status === "ok" && <p className="rounded-lg bg-green-50 p-4 text-green-900">{s.message}</p>}
        {s.status === "error" && s.message && <p className="rounded-lg bg-amber-50 p-4 text-amber-900">{s.message}</p>}
      </div>
    </form>
  );
}
