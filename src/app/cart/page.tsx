import type { Metadata } from "next";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your NOBYST GLOBAL LTD cart and send your order request.",
};

export default function CartPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-navy sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-sm text-navy/65">
        Review your items, then send the request. We confirm stock and final prices before payment.
      </p>
      <div className="mt-8">
        <CartView />
      </div>
    </section>
  );
}
