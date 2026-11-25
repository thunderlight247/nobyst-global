"use client";

import { useState } from "react";
import { FileBox, ShieldCheck } from "lucide-react";
import type { MediaUpload } from "@/lib/media-upload";

function size(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function when(at: string): string {
  return new Date(at.includes("T") ? at : at.replace(" ", "T") + "Z").toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/**
 * The private register of uploads. Public links use random names; this is the only place that
 * shows each file's original name and who uploaded it.
 */
export default function MediaLibrary({ uploads }: { uploads: MediaUpload[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = uploads.filter(
    (u) => !q || u.originalName.toLowerCase().includes(q) || (u.uploaderEmail ?? "").toLowerCase().includes(q) || u.usedBy.some((n) => n.toLowerCase().includes(q))
  );

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Cloudflare R2</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Media library</h1>
      <p className="mt-1 max-w-2xl text-xs text-navy/60">
        Every uploaded photo and 3D model. On the site each file has a random name that reveals nothing; only
        admins see the original name and who uploaded it here.
      </p>

      <div className="mt-5 rounded-2xl border border-navy/10 bg-white p-5 text-xs text-navy/75 shadow-sm">
        <p className="flex items-center gap-2 font-bold text-navy">
          <ShieldCheck size={16} className="text-emerald-600" /> How uploads are checked
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Images: JPG, PNG or WebP, up to 6 MB and 8,000 pixels a side. 3D models: GLB/glTF up to 15 MB.</li>
          <li>Every image is read in full and rebuilt with only the picture: comments, text, EXIF/XMP metadata (including phone GPS location) and anything after the image end are removed.</li>
          <li>Files containing script, HTML or PHP code are refused. 3D models may not link to outside files.</li>
          <li>Files are served as images only, with a sandbox that stops a browser running anything in them.</li>
        </ul>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by original file name, uploader or product"
        className="mt-5 min-h-[42px] w-full max-w-md rounded-lg border border-navy/20 px-3 text-sm"
      />

      {shown.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-navy/10 bg-white p-10 text-center text-xs text-navy/50">
          {uploads.length === 0 ? "No uploads yet." : "No uploads match."}
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((u) => (
            <li key={u.key} className="flex gap-3 rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                {u.contentType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <FileBox size={28} className="text-navy/40" aria-hidden />
                )}
              </div>
              <div className="min-w-0 text-xs">
                <p className="truncate font-bold text-navy" title={u.originalName}>
                  {u.originalName}
                </p>
                <p className="truncate text-navy/60">
                  {u.uploaderEmail ?? "Unknown"}{" "}
                  {u.uploaderRole && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${u.uploaderRole === "partner" ? "bg-amber-100 text-amber-800" : "bg-navy/10 text-navy"}`}>
                      {u.uploaderRole === "partner" ? "Partner" : "Staff"}
                    </span>
                  )}
                </p>
                <p className="text-navy/50">
                  {when(u.createdAt)} · {size(u.sizeBytes)}
                  {u.originalSizeBytes !== u.sizeBytes && ` (was ${size(u.originalSizeBytes)})`}
                  {u.width && u.height ? ` · ${u.width}×${u.height}` : ""}
                </p>
                <p className="truncate text-navy/60">{u.usedBy.length ? `Used by: ${u.usedBy.join(", ")}` : "Not used by any product"}</p>
                <p className="truncate font-mono text-[10px] text-navy/35" title={`Public link: ${u.url}\nSHA-256: ${u.sha256}`}>
                  {u.key}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
