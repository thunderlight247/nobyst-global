"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  FolderTree,
  Inbox,
  Layers,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShoppingBag,
  Tag,
  Trash2,
  UserCheck,
  X,
  FileBox,
} from "lucide-react";
import type { Product } from "@/lib/products";
import type { Enquiry, EnquiryStatus } from "@/lib/enquiries";
import type { PaidOrder } from "@/lib/orders";
import { categories, site } from "@/data/site";
import { formatPrice } from "@/lib/catalogue";
import StockBadge from "@/components/StockBadge";
import ProductForm from "@/components/admin/ProductForm";
import { whatsappLink } from "@/lib/contact-links";

type Props = {
  initialProducts: Product[];
  initialEnquiries: Enquiry[];
  initialOrders: PaidOrder[];
  initialSegment: string;
};

type Role = "admin" | "staff";

export default function PayloadAdminApp({
  initialProducts,
  initialEnquiries,
  initialOrders,
  initialSegment,
}: Props) {
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [tab, setTab] = useState<string>(
    ["dashboard", "products", "categories", "enquiries", "orders", "media"].includes(initialSegment)
      ? initialSegment
      : "dashboard"
  );
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [editingProduct, setEditingProduct] = useState<Product | "new" | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  function notify(msg: string) {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(null), 4000);
  }

  // Quick stock status update for Store Staff
  async function quickUpdateStock(product: Product, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          category: product.category,
          description: product.description,
          features: product.features,
          image: product.image,
          gallery: product.gallery,
          model3dUrl: product.model3dUrl ?? null,
          colors: product.colors ?? [],
          price: product.pricePesewas ? (product.pricePesewas / 100).toFixed(2) : null,
          stockStatus: newStatus,
          imageAlt: product.imageAlt,
          fits: product.fits,
        }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
      notify(`Stock status updated for ${product.name}`);
    } catch {
      notify("Could not update stock status.");
    }
  }

  // Update Enquiry status
  async function setEnquiryStatus(id: string, status: EnquiryStatus) {
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
      notify(`Enquiry marked as ${status}`);
    } catch {
      notify("Failed to update enquiry status");
    }
  }

  // Delete Enquiry
  async function handleDeleteEnquiry(id: string) {
    if (!window.confirm("Delete this enquiry permanently?")) return;
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      notify("Enquiry removed.");
    } catch {
      notify("Failed to delete enquiry.");
    }
  }

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const inStockCount = products.filter((p) => p.stockStatus === "in_stock").length;
  const lowStockCount = products.filter((p) => p.stockStatus === "low_stock").length;
  const models3dCount = products.filter((p) => Boolean(p.model3dUrl)).length;
  const newEnquiriesCount = enquiries.filter((e) => e.status === "new").length;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 border-b border-navy/10 bg-navy text-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5 lg:flex-col lg:items-start lg:gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
              Backend &amp; CMS
            </span>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              NOBYST <span className="text-white/60 text-sm font-normal">Payload</span>
            </h2>
            <p className="text-xs text-white/50">Techiman • Cloudflare D1 &amp; R2</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              <span>View Site</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex overflow-x-auto p-2 lg:flex-col lg:space-y-1 lg:overflow-visible lg:p-4">
          {[
            { id: "dashboard", label: "Dashboard", icon: Layers, badge: null },
            { id: "products", label: "Products", icon: Boxes, badge: products.length },
            { id: "categories", label: "Categories", icon: FolderTree, badge: categories.length },
            { id: "enquiries", label: "Enquiries", icon: Inbox, badge: newEnquiriesCount ? `${newEnquiriesCount} new` : null },
            { id: "orders", label: "Orders", icon: ShoppingBag, badge: initialOrders.length ? `${initialOrders.length} paid` : null },
            { id: "media", label: "Media & 3D Assets", icon: FileBox, badge: models3dCount ? `${models3dCount} 3D` : null },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all sm:text-sm lg:w-full ${
                  active
                    ? "bg-royal text-white shadow"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      active ? "bg-white/20 text-white" : "bg-white/10 text-white/80"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Role toggle badge */}
        <div className="m-4 mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Active Role:</span>
            <span className="font-bold uppercase tracking-wider text-gold">
              {role === "admin" ? "Admin (Full)" : "Store Staff"}
            </span>
          </div>
          <div className="mt-2.5 flex gap-1 rounded-lg bg-navy/80 p-1">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex-1 rounded-md py-1 text-center text-[11px] font-bold transition-all ${
                role === "admin" ? "bg-gold text-navy shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("staff")}
              className={`flex-1 rounded-md py-1 text-center text-[11px] font-bold transition-all ${
                role === "staff" ? "bg-royal text-white shadow-sm" : "text-white/60 hover:text-white"
              }`}
            >
              Store Staff
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-5 sm:p-8 lg:p-10">
        {actionStatus && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-royal px-4 py-3 text-sm font-medium text-white shadow-md">
            <span>{actionStatus}</span>
            <button type="button" onClick={() => setActionStatus(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-royal">
                  Operations Overview
                </span>
                <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
                  Techiman Hub Dashboard
                </h1>
                <p className="mt-1 text-xs text-navy/60 sm:text-sm">
                  Live data synced directly with Cloudflare D1 and Cloudflare R2
                </p>
              </div>

              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => setEditingProduct("new")}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-royal"
                >
                  <Plus size={16} />
                  <span>Add New Product</span>
                </button>
              )}
            </div>

            {/* Metric cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-navy/55">Total Products</span>
                <p className="mt-2 font-display text-2xl font-extrabold text-navy sm:text-3xl">{products.length}</p>
                <p className="mt-1 text-[11px] text-navy/60">{categories.length} categories</p>
              </div>

              <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">In Stock</span>
                <p className="mt-2 font-display text-2xl font-extrabold text-emerald-700 sm:text-3xl">{inStockCount}</p>
                <p className="mt-1 text-[11px] text-navy/60">Available in Techiman</p>
              </div>

              <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Low Stock</span>
                <p className="mt-2 font-display text-2xl font-extrabold text-amber-600 sm:text-3xl">{lowStockCount}</p>
                <p className="mt-1 text-[11px] text-navy/60">Replenish soon</p>
              </div>

              <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-royal">Inquiries</span>
                <p className="mt-2 font-display text-2xl font-extrabold text-royal sm:text-3xl">{enquiries.length}</p>
                <p className="mt-1 text-[11px] text-navy/60">{newEnquiriesCount} awaiting follow-up</p>
              </div>
            </div>

            {/* Quick action grid */}
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {/* Recent Enquiries */}
              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-navy/5 pb-3">
                  <h3 className="font-display font-bold text-navy">Recent Inquiries</h3>
                  <button
                    type="button"
                    onClick={() => setTab("enquiries")}
                    className="text-xs font-bold text-royal hover:underline"
                  >
                    View all &rarr;
                  </button>
                </div>
                {enquiries.length === 0 ? (
                  <p className="py-8 text-center text-xs text-navy/50">No inquiries received yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-navy/5">
                    {enquiries.slice(0, 4).map((enq) => (
                      <li key={enq.id} className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-xs text-navy">{enq.name}</p>
                            <p className="text-[11px] text-navy/60">{enq.topic || enq.type} • {enq.email}</p>
                            <p className="mt-1 line-clamp-1 text-xs text-navy/80">{enq.message}</p>
                          </div>
                          {enq.phone && (
                            <a
                              href={whatsappLink(`Hello ${enq.name}, following up on your enquiry with NOBYST.`)}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
                            >
                              <MessageCircle size={12} />
                              <span>Reply</span>
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 3D Catalog Status */}
              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-navy/5 pb-3">
                  <h3 className="font-display font-bold text-navy">3D Interactive Models</h3>
                  <span className="text-xs font-bold text-gold-600">{models3dCount} models active</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-navy/70">
                  Products with `.glb` files attached enable the Three.js 3D viewer on their detail pages with 360° inspection and color finishes.
                </p>
                <div className="mt-4 space-y-2">
                  {products
                    .filter((p) => Boolean(p.model3dUrl))
                    .slice(0, 3)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs"
                      >
                        <span className="font-bold text-navy">{p.name}</span>
                        <span className="rounded-full bg-royal/10 px-2 py-0.5 text-[10px] font-bold text-royal">
                          3D Active
                        </span>
                      </div>
                    ))}
                  {models3dCount === 0 && (
                    <p className="text-xs text-navy/50 italic">
                      Upload .glb files to any product via the Products tab to activate 3D preview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS COLLECTION */}
        {tab === "products" && (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Collection</span>
                <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Products</h1>
                <p className="mt-1 text-xs text-navy/60">
                  Manage inventory, pricing in GHS, stock status in Techiman, and 3D assets
                </p>
              </div>

              {role === "admin" && (
                <button
                  type="button"
                  onClick={() => setEditingProduct("new")}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-royal"
                >
                  <Plus size={16} />
                  <span>Create Product</span>
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-navy/15 bg-white py-2 pl-9 pr-4 text-xs text-navy placeholder:text-navy/40 focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-navy/15 bg-white px-3 py-2 text-xs font-medium text-navy focus:border-royal focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Product table / grid */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-navy/10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-navy/60">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Price (GHS)</th>
                      <th className="px-4 py-3">Stock in Techiman</th>
                      <th className="px-4 py-3">3D / Colors</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/5">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-royal-100">
                              <Image src={p.image} alt={p.imageAlt || p.name} fill className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-navy">{p.name}</p>
                              <p className="text-[11px] text-navy/50">{p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-navy/70">{p.category}</td>
                        <td className="px-4 py-3 font-bold text-navy">
                          {formatPrice(p.pricePesewas) ?? "Ask on WhatsApp"}
                        </td>
                        <td className="px-4 py-3">
                          {role === "staff" ? (
                            <select
                              value={p.stockStatus}
                              onChange={(e) => quickUpdateStock(p, e.target.value)}
                              className="rounded-lg border border-navy/20 bg-white px-2 py-1 text-[11px] font-bold text-navy"
                            >
                              <option value="in_stock">In stock</option>
                              <option value="low_stock">Low stock</option>
                              <option value="out_of_stock">Out of stock</option>
                            </select>
                          ) : (
                            <StockBadge status={p.stockStatus} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.model3dUrl ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                3D Ready
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                2D Only
                              </span>
                            )}
                            {p.colors && p.colors.length > 0 && (
                              <span className="text-[10px] text-navy/60">
                                {p.colors.length} {p.colors.length === 1 ? "color" : "colors"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${p.slug}`}
                              target="_blank"
                              className="rounded-lg p-1 text-navy/50 hover:bg-navy/5 hover:text-navy"
                              title="View on site"
                            >
                              <Eye size={15} />
                            </Link>
                            {role === "admin" && (
                              <button
                                type="button"
                                onClick={() => setEditingProduct(p)}
                                className="rounded-lg bg-navy/5 px-2.5 py-1 text-[11px] font-bold text-navy hover:bg-navy hover:text-white"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES COLLECTION */}
        {tab === "categories" && (
          <div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Collection</span>
              <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Categories</h1>
              <p className="mt-1 text-xs text-navy/60">
                The 6 active retail accessory &amp; mobile money categories served in Techiman
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, i) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <div
                    key={cat}
                    className="flex flex-col justify-between rounded-2xl border border-navy/10 bg-white p-5 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-royal-100 px-2.5 py-0.5 text-[10px] font-bold text-royal">
                          Category #{i + 1}
                        </span>
                        <span className="text-xs font-bold text-navy/60">{count} products</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-bold text-navy">{cat}</h3>
                    </div>

                    <div className="mt-4 border-t border-navy/5 pt-3">
                      <Link
                        href={`/products?category=${encodeURIComponent(cat)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:underline"
                      >
                        <span>Browse category products</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: ENQUIRIES COLLECTION */}
        {tab === "orders" && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Collection</span>
            <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Paid Orders</h1>
            <p className="mt-1 text-xs text-navy/60">
              Orders confirmed by Paystack. Pending or failed payments are not listed.
            </p>

            <div className="mt-6 space-y-4">
              {initialOrders.length === 0 ? (
                <div className="rounded-2xl border border-navy/10 bg-white p-12 text-center text-xs text-navy/50">
                  No paid orders yet.
                </div>
              ) : (
                initialOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/5 pb-3">
                      <div>
                        <p className="text-xs font-bold text-navy">{order.name}</p>
                        <p className="text-[11px] text-navy/50">
                          {order.reference} · {order.email} · {order.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-royal">
                          {formatPrice(order.totalPesewas)}
                        </p>
                        {order.paidAt && (
                          <p className="text-[11px] text-navy/40">
                            {new Date(order.paidAt.replace(" ", "T") + "Z").toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-navy/70">
                      {order.items.map((item, i) => (
                        <li key={i}>
                          {item.quantity} × {item.productName} ({item.color}) at {formatPrice(item.unitPesewas)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "enquiries" && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Collection</span>
                <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Customer Inquiries</h1>
                <p className="mt-1 text-xs text-navy/60">
                  Submissions captured from Contact, Partner with us, and Bulk order forms
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {enquiries.length === 0 ? (
                <div className="rounded-2xl border border-navy/10 bg-white p-12 text-center text-xs text-navy/50">
                  No customer or partner inquiries logged yet. Submissions from public forms will show up here.
                </div>
              ) : (
                enquiries.map((enq) => (
                  <div
                    key={enq.id}
                    className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm transition-all hover:border-royal/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/5 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            enq.type === "partnership"
                              ? "bg-amber-100 text-amber-800"
                              : enq.type === "bulk_order"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {enq.type.replace("_", " ")}
                        </span>
                        <span className="text-xs font-bold text-navy">{enq.name}</span>
                        {enq.createdAt && (
                          <span className="text-[11px] text-navy/40">
                            {new Date(enq.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={enq.status}
                          onChange={(e) => setEnquiryStatus(enq.id, e.target.value as EnquiryStatus)}
                          className="rounded-lg border border-navy/15 bg-slate-50 px-2 py-1 text-xs font-bold text-navy"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>

                        {role === "admin" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEnquiry(enq.id)}
                            className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                            title="Delete enquiry"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="text-navy/60">
                          <strong>Email:</strong> {enq.email}
                        </p>
                        {enq.phone && (
                          <p className="text-navy/60 mt-1">
                            <strong>Phone:</strong> {enq.phone}
                          </p>
                        )}
                        {enq.topic && (
                          <p className="text-navy/60 mt-1">
                            <strong>Topic:</strong> {enq.topic}
                          </p>
                        )}
                        {enq.productName && (
                          <p className="text-navy/60 mt-1">
                            <strong>Product:</strong> {enq.productName}{" "}
                            {enq.quantity ? `(${enq.quantity} units)` : ""}
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <span className="font-bold text-[11px] text-navy/50 uppercase">Message</span>
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-navy/85">
                          {enq.message}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-navy/5 pt-3">
                      <a
                        href={`mailto:${enq.email}?subject=${encodeURIComponent("NOBYST Global Follow-up")}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-navy/20 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50"
                      >
                        Reply by Email
                      </a>
                      {enq.phone && (
                        <a
                          href={whatsappLink(
                            `Hello ${enq.name}, this is NOBYST Global following up on your inquiry.`
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90"
                        >
                          <MessageCircle size={14} />
                          <span>Direct WhatsApp Follow-up</span>
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MEDIA COLLECTION */}
        {tab === "media" && (
          <div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Cloudflare R2</span>
              <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Media &amp; 3D Storage</h1>
              <p className="mt-1 text-xs text-navy/60">
                Connected to bucket <code className="bg-slate-100 px-1 py-0.5 rounded">nobyst-media</code>. All assets served immutable from the edge.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-6 shadow-sm">
              <h3 className="font-display font-bold text-navy">Asset Types &amp; Limits</h3>
              <ul className="mt-3 space-y-2 text-xs text-navy/75">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Images: <strong>JPG, PNG, WebP</strong> (optimized up to 6MB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>3D Models: <strong>.GLB, .GLTF</strong> (binary format up to 15MB for fast mobile streaming)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Global Edge Caching: <code>public, max-age=31536000, immutable</code></span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* Product Form Modal (for create / edit) */}
      {editingProduct && (
        <ProductForm
          product={editingProduct === "new" ? null : editingProduct}
          onSaved={(saved) => {
            setProducts((prev) => {
              const idx = prev.findIndex((p) => p.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
            setEditingProduct(null);
            notify(`Product saved: ${saved.name}`);
            router.refresh();
          }}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}
