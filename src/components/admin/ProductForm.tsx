"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Loader2, Star, Upload, X } from "lucide-react";
import { categories, phoneGroups } from "@/data/site";
import type { Product } from "@/lib/products";

type Props = {
  product: Product | null;
  onSaved: (product: Product) => void;
  onClose: () => void;
};

export default function ProductForm({ product, onSaved, onClose }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<string>(product?.category ?? categories[0]);
  const [description, setDescription] = useState(product?.description ?? "");
  const [features, setFeatures] = useState((product?.features ?? []).join("\n"));
  const [fits, setFits] = useState<string[]>(product?.fits ?? []);
  const [image, setImage] = useState(product?.image ?? "");
  const [gallery, setGallery] = useState<string[]>(product?.gallery ?? []);
  const [imageAlt, setImageAlt] = useState(product?.imageAlt ?? "");
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const photos = [image, ...gallery].filter(Boolean);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function toggleFit(id: string) {
    setFits((current) =>
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id]
    );
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setUploadError("");
    setUploading(true);
    try {
      let hero = image;
      const added: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/media", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "An image could not be uploaded.");
        if (!hero) hero = data.url as string;
        else added.push(data.url as string);
      }
      if (hero !== image) setImage(hero);
      if (added.length) setGallery((current) => [...current, ...added]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "An image could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  /** Index 0 is the main photo shown on the catalogue card. */
  function removePhoto(index: number) {
    const remaining = photos.filter((_, i) => i !== index);
    setImage(remaining[0] ?? "");
    setGallery(remaining.slice(1));
  }

  function makeMain(index: number) {
    if (index === 0) return;
    const chosen = photos[index];
    const rest = photos.filter((_, i) => i !== index);
    setImage(chosen);
    setGallery(rest);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!image) {
      setError("Upload at least one product photo before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        category,
        description,
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        image,
        gallery,
        imageAlt,
        fits,
      };
      const res = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The product could not be saved.");
      onSaved(data.product as Product);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-navy/60 p-4 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-form-title"
        className="mx-auto my-4 w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:my-8 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="product-form-title" className="font-display text-xl font-bold text-navy sm:text-2xl">
              {product ? "Edit product" : "Add product"}
            </h2>
            <p className="mt-1 text-xs text-navy/60">
              Publishing updates the catalogue and the product&apos;s detail page immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy/60 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <div>
              <label htmlFor="p-name" className="mb-1.5 block text-xs font-bold text-navy">
                Product name
              </label>
              <input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                placeholder="e.g. Braided USB-C cable"
                className="min-h-[44px] w-full rounded-xl border border-navy/20 px-3.5 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
            </div>
            <div>
              <label htmlFor="p-category" className="mb-1.5 block text-xs font-bold text-navy">
                Category
              </label>
              <select
                id="p-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-navy/20 bg-white px-3 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="p-description" className="mb-1.5 block text-xs font-bold text-navy">
              Short description
            </label>
            <textarea
              id="p-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={400}
              required
              placeholder="One or two sentences shown on the catalogue card."
              className="w-full rounded-xl border border-navy/20 px-3.5 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>

          <div>
            <label htmlFor="p-features" className="mb-1.5 block text-xs font-bold text-navy">
              Features
            </label>
            <textarea
              id="p-features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              placeholder={"One feature per line\nUSB-C connector\nBraided cable"}
              className="w-full rounded-xl border border-navy/20 px-3.5 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
            <p className="mt-1 text-[11px] text-navy/55">One per line, up to 8 features.</p>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold text-navy">Fits which phones</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {phoneGroups.map((g) => (
                <label
                  key={g.id}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-navy/10 px-3 py-2 text-xs text-navy/85 transition-colors has-[:checked]:border-royal/40 has-[:checked]:bg-royal-50"
                >
                  <input
                    type="checkbox"
                    checked={fits.includes(g.id)}
                    onChange={() => toggleFit(g.id)}
                    className="h-4 w-4 accent-royal"
                  />
                  {g.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-2xl border border-navy/10 bg-navy/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-navy">Product photos</p>
              <p className="text-[11px] text-navy/55">
                {photos.length} photo{photos.length === 1 ? "" : "s"} · the first is the main one
              </p>
            </div>

            <div className="mt-3">
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) void uploadFiles(files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-navy/20 bg-white px-4 py-2 text-xs font-bold text-navy transition-colors hover:border-royal hover:text-royal disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <Upload size={15} aria-hidden />
                )}
                {uploading ? "Uploading…" : photos.length ? "Add more photos" : "Upload photos"}
              </button>
              <p className="mt-1.5 text-[11px] text-navy/55">
                Select one or several at once. JPG, PNG or WebP up to 6 MB each.
              </p>
              {uploadError && (
                <p role="alert" className="mt-1.5 text-[11px] font-medium text-red-600">
                  {uploadError}
                </p>
              )}
            </div>

            {photos.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {photos.map((src, i) => (
                  <li key={`${src}-${i}`} className="relative">
                    <div
                      className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-white ${
                        i === 0 ? "border-royal" : "border-navy/10"
                      }`}
                    >
                      <Image src={src} alt="" fill sizes="160px" className="object-cover" />
                    </div>
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded-full bg-royal px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        Main
                      </span>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-1">
                      {i === 0 ? (
                        <span className="text-[10px] text-navy/45">Catalogue card</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeMain(i)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-navy/70 transition-colors hover:text-royal"
                        >
                          <Star size={11} aria-hidden />
                          Make main
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Remove photo ${i + 1}`}
                        className="inline-flex items-center text-navy/50 transition-colors hover:text-red-600"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <label htmlFor="p-alt" className="mt-4 block text-xs font-bold text-navy">
              Main photo description
            </label>
            <input
              id="p-alt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              maxLength={160}
              required
              placeholder="Describe the main photo for screen readers"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-navy/20 px-3.5 py-2.5 text-sm text-navy focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-navy/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] rounded-full px-5 py-2.5 text-sm font-bold text-navy/70 transition-colors hover:bg-navy/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-royal px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-navy disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
              {saving ? "Saving…" : product ? "Save changes" : "Publish product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
