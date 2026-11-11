import type { Metadata } from "next";
import AdminCatalogue from "@/components/admin/AdminCatalogue";
import { listProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const products = await listProducts();

  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14 lg:px-8">
      <AdminCatalogue initialProducts={products} />
    </section>
  );
}
