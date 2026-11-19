import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser, getPendingUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { safeNext } from "@/lib/safe-next";
import TwoFactorVerifyForm from "@/components/TwoFactorVerifyForm";

export const metadata: Metadata = {
  title: "Two-step sign-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const pending = await getPendingUser().catch(() => null);
  if (!pending) {
    const user = await getCurrentUser().catch(() => null);
    redirect(user ? next ?? homeFor(user.role) : "/account");
  }

  return (
    <section className="mx-auto max-w-sm px-5 py-14 sm:py-20">
      <div className="text-center">
        <ShieldCheck className="mx-auto text-royal" size={40} aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-extrabold text-navy">Two-step sign-in</h1>
        <p className="mt-1 text-sm text-navy/60">Signing in as {pending.email}</p>
      </div>
      <div className="mt-6 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg">
        <TwoFactorVerifyForm next={next} />
      </div>
    </section>
  );
}
