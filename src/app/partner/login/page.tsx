import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { getCurrentUser, getPendingUser, isStaff } from "@/lib/auth";
import { areaNext } from "@/lib/area-next";
import AreaLoginForm from "@/components/AreaLoginForm";

export const metadata: Metadata = {
  title: "Partner sign-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = areaNext("partner", (await searchParams).next);
  const user = await getCurrentUser().catch(() => null);
  if (!user && (await getPendingUser().catch(() => null))) redirect(`/signin/verify?next=${encodeURIComponent(next)}`);
  if (user && (user.role === "partner" || isStaff(user.role))) redirect(next);

  return (
    <section className="mx-auto max-w-sm px-5 py-14 sm:py-20">
      <div className="text-center">
        <Handshake className="mx-auto text-royal" size={40} aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-extrabold text-navy sm:text-3xl">Partner portal</h1>
        <p className="mt-1 text-sm text-navy/60">Sign in to see wholesale prices and your bulk orders.</p>
      </div>
      <div className="mt-6 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg">
        <AreaLoginForm area="partner" next={next} />
      </div>
      <p className="mt-5 text-center text-sm text-navy/70">
        Not a partner yet?{" "}
        <Link href="/partnerships" className="font-bold text-royal underline">
          Apply to partner with us
        </Link>
      </p>
    </section>
  );
}
