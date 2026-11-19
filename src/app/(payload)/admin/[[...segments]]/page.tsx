import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/AccountPanel";
import { getCurrentUser, listUsers } from "@/lib/auth";
import { listWholesalePrices } from "@/lib/wholesale";
import { listInvitations } from "@/lib/invitations";
import { listProducts } from "@/lib/products";
import { listEnquiries } from "@/lib/enquiries";
import { listPaidOrders } from "@/lib/orders";
import { listCategories } from "@/lib/categories";
import { getContent } from "@/lib/content";
import PayloadAdminApp from "@/components/admin/PayloadAdminApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NOBYST Operations & Payload Admin",
  robots: { index: false, follow: false },
};

export default async function PayloadAdminPage({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  // Admins only. Guests are sent to sign in; signed-in non-admins see who they are signed in as
  // and how to get access, but no admin data. The API routes enforce the same check independently.
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/account?next=/admin");
  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-extrabold text-navy sm:text-3xl">Admin access needed</h1>
        <p className="mt-3 text-sm text-navy/70">
          You are signed in as <strong>{user.email}</strong>
          {user.role === "partner" ? ", a partner account. Your area is the partner portal." : ", which is a customer account. Ask the site owner to grant this account admin access, then reload this page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={user.role === "partner" ? "/partner" : "/account"}
            className="inline-flex min-h-[44px] items-center rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-royal"
          >
            {user.role === "partner" ? "Partner portal" : "My account"}
          </Link>
          <SignOutButton />
        </div>
      </main>
    );
  }

  const [products, enquiries, orders, categories, content, users, wholesale, invitations] = await Promise.all([
    listProducts().catch(() => []),
    listEnquiries().catch(() => []),
    listPaidOrders().catch(() => []),
    listCategories().catch(() => []),
    getContent(),
    listUsers().catch(() => []),
    listWholesalePrices(),
    listInvitations(),
  ]);

  const activeCollection = (await params).segments?.[0] || "dashboard";

  return (
    <main className="min-h-screen bg-slate-50 text-navy antialiased">
      <PayloadAdminApp
        initialProducts={products}
        initialEnquiries={enquiries}
        initialOrders={orders}
        initialCategories={categories}
        initialContent={content}
        initialSegment={activeCollection}
        initialUsers={users}
        initialWholesale={wholesale}
        initialInvitations={invitations}
        currentUser={{ id: user.id, email: user.email }}
      />
    </main>
  );
}
