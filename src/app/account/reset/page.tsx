import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/AccountPanel";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && token.length <= 200;

  return (
    <section className="mx-auto max-w-md px-5 py-12 sm:px-6 sm:py-20">
      <h1 className="text-center font-display text-3xl font-extrabold text-navy">Choose a new password</h1>
      <div className="mt-8 rounded-3xl border border-navy/10 bg-white p-6 shadow-lg sm:p-8">
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-navy/70">This reset link is invalid. Request a new one from the account page.</p>
        )}
      </div>
    </section>
  );
}
