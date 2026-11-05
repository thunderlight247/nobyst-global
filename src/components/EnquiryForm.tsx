"use client";
import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

type State = { status: "idle" | "sending" | "ok" | "error"; message?: string; errors?: Record<string, string> };
const types = ["Supplier", "Distributor", "Business collaborator", "Other organisation"];

export default function EnquiryForm() {
  const [s, setS] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const errors: Record<string, string> = {};

    if (String(data.name ?? "").trim().length < 2) errors.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(String(data.email ?? ""))) errors.email = "Enter a valid email address.";
    if (String(data.message ?? "").trim().length < 20) errors.message = "Write at least 20 characters describing your proposal.";

    if (Object.keys(errors).length) return setS({ status: "error", errors });

    setS({ status: "sending" });
    try {
      const r = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      setS(r.ok ? { status: "ok", message: j.message } : { status: "error", message: j.message });
    } catch {
      setS({ status: "error", message: "Could not reach the server. Please email or WhatsApp us directly instead." });
    }
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 transition-all focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";
  const err = (k: string) =>
    s.errors?.[k] && (
      <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
        {s.errors[k]}
      </p>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      <label className="block text-sm font-bold text-navy">
        Your name <span className="text-red-500">*</span>
        <input name="name" autoComplete="name" placeholder="Kwame Mensah" className={field} />
        {err("name")}
      </label>

      <label className="block text-sm font-bold text-navy">
        Organisation (optional)
        <input name="organisation" autoComplete="organization" placeholder="Company or enterprise name" className={field} />
      </label>

      <label className="block text-sm font-bold text-navy">
        Email address <span className="text-red-500">*</span>
        <input name="email" type="email" autoComplete="email" placeholder="name@domain.com" className={field} />
        {err("email")}
      </label>

      <label className="block text-sm font-bold text-navy">
        Partnership category
        <select name="type" className={field}>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-bold text-navy">
        Your enquiry details <span className="text-red-500">*</span>
        <textarea
          name="message"
          rows={4}
          placeholder="Please tell us about your products, volume capabilities, or proposed collaboration..."
          className={field}
        />
        {err("message")}
      </label>

      <button
        disabled={s.status === "sending"}
        type="submit"
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-8 py-3.5 font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
      >
        <span>{s.status === "sending" ? "Submitting enquiry..." : "Send partnership enquiry"}</span>
        <Send size={16} aria-hidden />
      </button>

      <div aria-live="polite">
        {s.status === "ok" && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" aria-hidden />
            <p>{s.message}</p>
          </div>
        )}
        {s.status === "error" && s.message && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <p>{s.message}</p>
          </div>
        )}
      </div>
    </form>
  );
}
