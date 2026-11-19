import type { Metadata } from "next";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { findUserByEmail, getCurrentUser } from "@/lib/auth";
import { findInvitation } from "@/lib/invitations";
import InviteAcceptForm from "@/components/InviteAcceptForm";
import { SignOutButton } from "@/components/AccountPanel";

export const metadata: Metadata = {
  title: "Partner invitation",
  robots: { index: false, follow: false },
  // The URL holds the invitation token; never send it to other sites as a referrer.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md px-5 py-14 text-center sm:px-6 sm:py-20">
      <Handshake className="mx-auto text-royal" size={44} aria-hidden />
      <h1 className="mt-4 font-display text-2xl font-extrabold text-navy sm:text-3xl">{title}</h1>
      <div className="mt-6 rounded-3xl border border-navy/10 bg-white p-6 text-sm text-navy/75 shadow-lg sm:p-8">
        {children}
      </div>
    </section>
  );
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const invitation = await findInvitation(token).catch(() => null);

  if (!invitation || invitation.status !== "pending") {
    const message =
      invitation?.status === "accepted"
        ? "This invitation has already been used. Sign in to open your partner portal."
        : invitation?.status === "expired"
        ? "This invitation has expired. Ask us to send you a new one."
        : "This invitation link is not valid. It may have been replaced by a newer one.";
    return (
      <Shell title="Invitation unavailable">
        <p>{message}</p>
        <Link href="/partner" className="mt-5 inline-block font-bold text-royal underline">
          Go to the partner portal
        </Link>
      </Shell>
    );
  }

  const user = await getCurrentUser().catch(() => null);
  const intro = (
    <p className="mb-5">
      You are invited to the NOBYST GLOBAL partner portal for{" "}
      <strong className="text-navy">{invitation.company}</strong>.
    </p>
  );

  if (user && user.email === invitation.email) {
    return (
      <Shell title="Welcome, partner">
        {intro}
        <InviteAcceptForm mode="accept" token={token} />
      </Shell>
    );
  }

  if (user) {
    return (
      <Shell title="Different account signed in">
        <p className="mb-5">
          You are signed in as <strong>{user.email}</strong>, but this invitation is for{" "}
          <strong>{invitation.email}</strong>. Sign out, then open the invitation link again.
        </p>
        <SignOutButton />
      </Shell>
    );
  }

  const existing = await findUserByEmail(invitation.email);
  if (existing) {
    const next = `/partner/invite?token=${encodeURIComponent(token)}`;
    return (
      <Shell title="Welcome, partner">
        {intro}
        <p className="mb-5">
          You already have an account with <strong>{invitation.email}</strong>. Sign in, and you will
          come straight back here to accept.
        </p>
        <Link
          // /account, not /partner/login: the invitee is still a customer until they accept.
          href={`/account?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-[44px] items-center rounded-full bg-navy px-6 py-2.5 text-sm font-bold text-white hover:bg-royal"
        >
          Sign in to accept
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Set up your partner access">
      {intro}
      <InviteAcceptForm mode="register" token={token} email={invitation.email} defaultName={invitation.name} />
    </Shell>
  );
}
