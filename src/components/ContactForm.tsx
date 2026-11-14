"use client";
import { useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { mailtoLink } from "@/lib/contact-links";

const topics = ["Product availability", "Mobile money agency", "Partnership", "General enquiry"];

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 transition-all focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

export default function ContactForm({ defaultMessage = "" }: { defaultMessage?: string }) {
  const [sent, setSent] = useState<{ mail: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const next: Record<string, string> = {};
    if ((data.name ?? "").trim().length < 2) next.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) next.email = "Please enter a valid email address.";
    if ((data.message ?? "").trim().length < 15) next.message = "Please write at least 15 characters.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const body = [
      `Name: ${data.name.trim()}`,
      data.phone?.trim() ? `Phone: ${data.phone.trim()}` : "",
      `Email: ${data.email.trim()}`,
      `Topic: ${data.topic}`,
      "",
      data.message.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contact",
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || null,
          topic: data.topic,
          message: data.message.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setErrors({});
      setSent({ mail: mailtoLink(`${data.topic} — ${data.name.trim()}`, body) });
      form.reset();
    } catch {
      setServerError("We could not send your message. Please try again, or email us directly.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="font-display text-lg font-bold text-green-900">Thank you, your message is in</p>
            <p className="mt-1 text-sm leading-relaxed text-green-900/80">
              Our team will reply to the email address you gave. For urgent matters you can also email us
              directly.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href={sent.mail}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:border-royal hover:text-royal"
              >
                <Mail size={16} aria-hidden />
                Email us directly
              </a>
              <button
                type="button"
                onClick={() => setSent(null)}
                className="inline-flex min-h-[44px] items-center px-2 text-sm font-bold text-royal hover:text-navy"
              >
                Write another message
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      <label className="block text-sm font-bold text-navy">
        Your name <span className="text-red-500">*</span>
        <input name="name" autoComplete="name" placeholder="Kwame Mensah" className={field} />
        {errors.name && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
            {errors.name}
          </p>
        )}
      </label>

      <label className="block text-sm font-bold text-navy">
        Email address <span className="text-red-500">*</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@domain.com"
          className={field}
        />
        {errors.email && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
            {errors.email}
          </p>
        )}
      </label>

      <label className="block text-sm font-bold text-navy">
        Phone (optional)
        <input name="phone" type="tel" autoComplete="tel" placeholder="+233 ..." className={field} />
      </label>

      <label className="block text-sm font-bold text-navy">
        What is it about?
        <select name="topic" className={field} defaultValue={topics[0]}>
          {topics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-bold text-navy sm:col-span-2">
        Your message <span className="text-red-500">*</span>
        <textarea
          name="message"
          rows={4}
          defaultValue={defaultMessage}
          placeholder="Tell us what you need, and the best way to reach you."
          className={field}
        />
        {errors.message && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
            {errors.message}
          </p>
        )}
      </label>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-lg active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:text-base"
        >
          <Send size={18} aria-hidden />
          {submitting ? "Sending..." : "Send message"}
        </button>
        {serverError && (
          <p role="alert" className="mt-2.5 text-xs font-semibold text-red-600">
            {serverError}
          </p>
        )}
      </div>
    </form>
  );
}
