import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser, getPendingUser, isStaff } from "@/lib/auth";
import { areaNext } from "@/lib/area-next";
import AreaLoginForm from "@/components/AreaLoginForm";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = areaNext("admin", (await searchParams).next);
  const user = await getCurrentUser().catch(() => null);
  if (!user && (await getPendingUser().catch(() => null))) redirect(`/signin/verify?next=${encodeURIComponent(next)}`);
  if (user && isStaff(user.role)) redirect(next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-14">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <ShieldCheck className="mx-auto text-royal" size={40} aria-hidden />
          <h1 className="mt-3 font-display text-2xl font-extrabold text-navy">NOBYST admin</h1>
          <p className="mt-1 text-sm text-navy/60">Staff sign-in. Customers sign in on My account.</p>
        </div>
        <div className="mt-6 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg">
          <AreaLoginForm area="admin" next={next} />
        </div>
      </div>
    </main>
  );
}
