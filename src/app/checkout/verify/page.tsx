import type { Metadata } from "next";
import Link from "next/link";
import { storedPaymentState, verifyCheckout } from "@/lib/orders";
import { headers } from "next/headers";
import { hit, LIMITS } from "@/lib/rate-limit";
import ClearCartOnPaid from "@/components/ClearCartOnPaid";
import PendingPaymentRefresh from "@/components/PendingPaymentRefresh";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const ref = reference ?? trxref ?? "";

  let state: "paid" | "failed" | "pending" | "not_found" | "missing" = "missing";
  const ip = (await headers()).get("cf-connecting-ip") ?? "unknown";
  if (ref && /^[A-Za-z0-9-]{4,80}$/.test(ref) && !(await hit(`verify:ip:${ip}`, LIMITS.verifyIp))) {
    // Too many checks from this connection: don't ask the provider again, but still show what
    // our own records say, so a confirmation that arrived by webhook/callback is visible.
    state = await storedPaymentState(ref);
  } else if (ref && /^[A-Za-z0-9-]{4,80}$/.test(ref)) {
    try {
      state = await verifyCheckout(ref);
    } catch {
      state = "failed";
    }
  }

  const paid = state === "paid";

  return (
    <section className="mx-auto max-w-lg px-5 py-20 text-center sm:px-6">
      {paid && <ClearCartOnPaid />}
      {paid ? (
        <CheckCircle2 className="mx-auto text-emerald-600" size={48} aria-hidden />
      ) : (
        <XCircle className="mx-auto text-red-500" size={48} aria-hidden />
      )}
      <h1 className="mt-4 text-2xl font-extrabold text-navy sm:text-3xl">
        {paid ? "Payment received" : state === "pending" ? "Payment not confirmed yet" : "Payment not confirmed"}
      </h1>
      <p className="mt-3 text-sm text-navy/70">
        {paid
          ? `Thank you. Your order reference is ${ref}. We will be in touch about delivery.`
          : state === "pending"
          ? `Your payment has not been confirmed yet. If you completed it, it will be confirmed automatically within a few minutes and you will get an email. Your reference is ${ref}.`
          : "We could not confirm this payment. If you were charged, contact us with your reference."}
      </p>
      {state === "pending" && <PendingPaymentRefresh />}
      <Link
        href="/products"
        className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
      >
        Continue shopping
      </Link>
    </section>
  );
}
