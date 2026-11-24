import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { confirmEmail } from "@/lib/email-verification";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false, follow: false },
  // The URL holds the one-time token; never send it to other sites as a referrer.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const result = await confirmEmail(token).catch(() => null);
  return (
    <section className="mx-auto max-w-md px-5 py-20 text-center sm:px-6">
      {result ? (
        <CheckCircle2 className="mx-auto text-emerald-600" size={48} aria-hidden />
      ) : (
        <XCircle className="mx-auto text-rose-500" size={48} aria-hidden />
      )}
      <h1 className="mt-4 font-display text-2xl font-extrabold text-navy sm:text-3xl">
        {result ? "Email confirmed" : "This link has expired"}
      </h1>
      <p className="mt-3 text-sm text-navy/70">
        {result
          ? `Thank you. ${result.email} is confirmed, and you can now pay for orders.`
          : "The link was already used or is too old. Sign in and request a new one from My account."}
      </p>
      <Link
        href={result ? "/cart" : "/account"}
        className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
      >
        {result ? "Go to my cart" : "My account"}
      </Link>
    </section>
  );
}
