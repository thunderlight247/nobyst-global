import type { Metadata } from "next";
import { listProducts } from "@/lib/products";
import { listEnquiries } from "@/lib/enquiries";
import { listPaidOrders } from "@/lib/orders";
import { listCategories } from "@/lib/categories";
import PayloadAdminApp from "@/components/admin/PayloadAdminApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NOBYST Operations & Payload Admin",
  robots: { index: false, follow: false },
};

export default async function PayloadAdminPage({
  params,
}: {
  params: { segments?: string[] };
}) {
  const [products, enquiries, orders, categories] = await Promise.all([
    listProducts().catch(() => []),
    listEnquiries().catch(() => []),
    listPaidOrders().catch(() => []),
    listCategories().catch(() => []),
  ]);

  const activeCollection = params.segments?.[0] || "dashboard";

  return (
    <main className="min-h-screen bg-slate-50 text-navy antialiased">
      <PayloadAdminApp
        initialProducts={products}
        initialEnquiries={enquiries}
        initialOrders={orders}
        initialCategories={categories}
        initialSegment={activeCollection}
      />
    </main>
  );
}
