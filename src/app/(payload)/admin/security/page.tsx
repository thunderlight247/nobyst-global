import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { getCurrentUser, getPendingUser, isStaff } from "@/lib/auth";
import { getTwoFactorStatus } from "@/lib/two-factor";
import TwoFactorSettings from "@/components/TwoFactorSettings";

export const metadata: Metadata = {
  title: "Admin security",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Staff 2FA setup and status. Staff without 2FA are sent here before any other admin page. */
export default async function AdminSecurityPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    if (await getPendingUser().catch(() => null)) redirect("/signin/verify?next=/admin/security");
    redirect("/admin/login?next=/admin/security");
  }
  if (!isStaff(user.role)) redirect("/account");
  const status = await getTwoFactorStatus(user.id).catch(() => ({ enabled: false, recoveryCodesLeft: 0 }));

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <div className="mx-auto max-w-lg">
        {user.needsTwoFactorSetup ? (
          <div className="mb-6 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="shrink-0" size={20} aria-hidden />
            <p>
              <strong>Two-step sign-in is required for admins and owners.</strong> Set it up to continue to
              the admin. It takes about a minute.
            </p>
          </div>
        ) : (
          <Link href="/admin" className="text-sm font-bold text-royal underline">
            ← Back to admin
          </Link>
        )}
        <div className="mt-4 rounded-3xl border border-navy/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-navy">
            <ShieldCheck className="text-royal" size={24} aria-hidden /> Two-step sign-in
          </h1>
          <p className="mb-5 mt-1 text-xs text-navy/60">{user.email}</p>
          <TwoFactorSettings
            enabled={status.enabled}
            recoveryCodesLeft={status.recoveryCodesLeft}
            canDisable={false}
            accountEmail={user.email}
            doneHref={user.needsTwoFactorSetup ? "/admin" : undefined}
          />
        </div>
      </div>
    </main>
  );
}
