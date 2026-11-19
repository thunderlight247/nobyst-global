"use client";
import { useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { mailtoLink } from "@/lib/contact-links";

const types = ["Supplier", "Distributor", "Business collaborator", "Other organisation"];

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 transition-all focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

export default function EnquiryForm() {
  const [sent, setSent] = useState<{ mail: string; invited: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const next: Record<string, string> = {};
    if ((data.name ?? "").trim().length < 2) next.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) next.email = "Please enter a valid email address.";
    if ((data.organisation ?? "").trim().length < 2) next.organisation = "Please enter your business name.";
    else if (/https?:|:\/\/|www\.|@/i.test(data.organisation)) next.organisation = "Please enter the business name only, without web links.";
    if ((data.message ?? "").trim().length < 20)
      next.message = "Please write at least 20 characters describing your proposal.";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const body = [
      `Name: ${data.name.trim()}`,
      data.organisation?.trim() ? `Organisation: ${data.organisation.trim()}` : "",
      `Email: ${data.email.trim()}`,
      `Partnership category: ${data.type}`,
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
          type: "partnership",
          name: data.name.trim(),
          email: data.email.trim(),
          company: data.organisation?.trim() || null,
          topic: data.type,
          message: data.message.trim(),
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { error?: string; invitationSent?: boolean };
      if (!res.ok) {
        if (res.status === 400 && result.error) {
          setErrors({ organisation: result.error });
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      setErrors({});
      setSent({ mail: mailtoLink(`Partnership enquiry — ${data.name.trim()}`, body), invited: Boolean(result.invitationSent) });
      form.reset();
    } catch {
      setServerError("We could not send your enquiry. Please try again, or email us directly.");
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
            <p className="font-display text-lg font-bold text-green-900">Thank you, your enquiry is in</p>
            <p className="mt-1 text-sm leading-relaxed text-green-900/80">
              {sent.invited
                ? "We have emailed you an invitation to set up your partner account. Open it to create your sign-in, then add your products; our team reviews new partners' first products before they go live."
                : "Our team will review your application and reply to the email address you gave."}
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
                Write another enquiry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
          Business name
          <input
            name="organisation"
            autoComplete="organization"
            placeholder="e.g. Ama Phone Hub"
            required
            maxLength={80}
            aria-invalid={Boolean(errors.organisation)}
            className={field}
          />
          {errors.organisation && <span className="mt-1 block text-xs font-semibold text-red-600">{errors.organisation}</span>}
        </label>
      </div>

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
        Partnership category
        <select name="type" className={field} defaultValue={types[0]}>
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
          placeholder="Tell us about your products, capacity, or the collaboration you have in mind."
          className={field}
        />
        {errors.message && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
            {errors.message}
          </p>
        )}
      </label>

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-lg active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:text-base"
        >
          <Send size={18} aria-hidden />
          {submitting ? "Sending..." : "Send partnership enquiry"}
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
