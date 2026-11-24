import type { Metadata } from "next";
import AccountPanel, { SignOutButton } from "@/components/AccountPanel";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import AccountDataPanel from "@/components/AccountDataPanel";
import { turnstileSiteKey } from "@/lib/turnstile";
import { getCurrentUser, getPendingUser, isStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listOrdersForUser } from "@/lib/orders";
import { describeDelivery, fulfilmentLabel } from "@/lib/delivery";

export const metadata: Metadata = {
  title: "My account",
  description: "Sign in to view your NOBYST GLOBAL LTD orders.",
};

export const dynamic = "force-dynamic";

function formatPrice(pesewas: number): string {
  return `GH₵ ${(pesewas / 100).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const user = await getCurrentUser();
  if (!user && (await getPendingUser().catch(() => null))) {
    redirect(`/signin/verify${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-20">
        <h1 className="text-center font-display text-3xl font-extrabold text-navy sm:text-4xl">My account</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-navy/70">
          Sign in to see your paid orders and reorder quickly.
        </p>
        <div className="mt-8">
          <AccountPanel
            next={next}
            initialMode={mode === "signup" ? "signup" : "signin"}
            turnstileSiteKey={await turnstileSiteKey().catch(() => null)}
          />
        </div>
      </section>
    );
  }

  const orders = await listOrdersForUser(user.id);

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-navy sm:text-4xl">Hello, {user.name}</h1>
          <p className="mt-1 text-sm text-navy/65">{user.email}</p>
        </div>
        <SignOutButton />
      </div>

      {!user.emailVerified && (
        <div className="mt-8">
          <VerifyEmailNotice email={user.email} />
        </div>
      )}

      {(user.role === "partner" || isStaff(user.role)) && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold-100/60 p-5">
          <p className="text-sm text-navy">
            {user.role === "partner"
              ? `Signed in as a partner${user.company ? ` for ${user.company}` : ""}.`
              : "You are an administrator."}
          </p>
          <a
            href={user.role === "partner" ? "/partner" : "/admin"}
            className="inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
          >
            {user.role === "partner" ? "Open partner portal" : "Open admin"}
          </a>
        </div>
      )}

      <h2 className="mt-10 font-display text-xl font-bold text-navy">Your orders</h2>
      {orders.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-navy/10 bg-white p-6 text-sm text-navy/70">
          You have no paid orders yet.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4">
          {orders.map((o) => (
            <li key={o.reference} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-navy">{o.reference}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-royal-100 px-2.5 py-0.5 text-[11px] font-bold text-royal">
                    {fulfilmentLabel(o.fulfilmentStatus)}
                  </span>
                  <p className="text-xs text-navy/60">{o.paidAt ? new Date(o.paidAt.replace(" ", "T") + "Z").toLocaleDateString("en-GB") : ""}</p>
                </div>
              </div>
              {o.delivery.method && (
                <p className="mt-1 text-xs text-navy/60">
                  {o.delivery.method === "pickup" ? "Pickup" : "Delivery"}: {describeDelivery(o.delivery)}
                </p>
              )}
              <ul className="mt-3 divide-y divide-navy/5 text-sm text-navy/80">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between py-2">
                    <span>
                      {it.productName} ({it.color}) × {it.quantity}
                    </span>
                    <span>{formatPrice(it.unitPesewas * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-right text-sm font-bold text-navy">Total {formatPrice(o.totalPesewas)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10">
        <AccountDataPanel canDelete={user.role === "customer"} twoFactorEnabled={user.twoFactorEnabled} />
      </div>
    </section>
  );
}
