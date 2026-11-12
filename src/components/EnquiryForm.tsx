"use client";
import { useState } from "react";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { mailtoLink, whatsappLink } from "@/lib/contact-links";
import { site } from "@/data/site";

const types = ["Supplier", "Distributor", "Business collaborator", "Other organisation"];

const field =
  "mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 bg-paper/50 px-4 py-3 text-sm text-navy placeholder:text-navy/40 transition-all focus:border-royal focus:bg-white focus:outline-none focus:ring-2 focus:ring-royal/20";

type Links = { wa: string; mail: string };

export default function EnquiryForm() {
  const [links, setLinks] = useState<Links | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    const next: Record<string, string> = {};
    if ((data.name ?? "").trim().length < 2) next.name = "Please enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) next.email = "Please enter a valid email address.";
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

    const wa = whatsappLink(`Hello ${site.short}, I would like to discuss a partnership.\n\n${body}`);
    const mail = mailtoLink(`Partnership enquiry — ${data.name.trim()}`, body);

    // Save asynchronously to D1 enquiries collection
    fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "partnership",
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.organisation?.trim() ? `Org: ${data.organisation.trim()}` : null,
        topic: data.type,
        message: data.message.trim(),
      }),
    }).catch((err) => console.warn("Failed to persist enquiry to D1:", err));

    setErrors({});
    setLinks({ wa, mail });
    form.reset();
    window.open(wa, "_blank", "noopener,noreferrer");
  }

  if (links) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 sm:p-6" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" aria-hidden />
          <div>
            <p className="font-display text-lg font-bold text-green-900">Your enquiry is ready</p>
            <p className="mt-1 text-sm leading-relaxed text-green-900/80">
              WhatsApp has opened with your details filled in. Press send there to deliver it. If it
              did not open, use the options below.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href={links.wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-royal"
              >
                <MessageCircle size={16} aria-hidden />
                Continue in WhatsApp
              </a>
              <a
                href={links.mail}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-bold text-navy transition-colors hover:border-royal hover:text-royal"
              >
                <Mail size={16} aria-hidden />
                Send by email instead
              </a>
              <button
                type="button"
                onClick={() => setLinks(null)}
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
          Organisation (optional)
          <input
            name="organisation"
            autoComplete="organization"
            placeholder="Company or enterprise"
            className={field}
          />
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
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-navy px-7 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-royal hover:shadow-lg active:scale-[0.98] sm:w-auto sm:text-base"
        >
          <MessageCircle size={18} aria-hidden />
          Send partnership enquiry
        </button>
        <p className="mt-2.5 text-xs text-navy/55">
          Your details are prepared in WhatsApp for you to review and send. You can also send them by
          email after submitting.
        </p>
      </div>
    </form>
  );
}
