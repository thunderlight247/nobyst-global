import type { Metadata } from "next";
import Link from "next/link";
import CartView from "@/components/CartView";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your NOBYST GLOBAL LTD cart and pay securely with Paystack.",
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-navy sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-sm text-navy/65">
        Review your items and check out securely with Paystack.
      </p>

      {!user && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-royal/20 bg-royal-100/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-navy/80">
            You can keep shopping and add items freely. Sign in or create an account to complete your purchase.
          </p>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/account?next=/cart"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
            >
              Sign in
            </Link>
            <Link
              href="/account?next=/cart&mode=signup"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-navy/20 bg-white px-5 py-2.5 text-sm font-bold text-navy hover:border-royal"
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8">
        <CartView
          signedIn={Boolean(user)}
          emailVerified={user?.emailVerified ?? false}
          defaultName={user?.name}
          defaultEmail={user?.email}
        />
      </div>
    </section>
  );
}
