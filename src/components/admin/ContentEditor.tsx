"use client";

import { useState } from "react";
import { CONTENT_BLOCKS, MAX_BLOCK_LENGTH, type ContentKey, type ContentValues } from "@/lib/content-blocks";

type Props = {
  initialContent: ContentValues;
  canEdit: boolean;
  onNotify: (message: string) => void;
};

export default function ContentEditor({ initialContent, canEdit, onNotify }: Props) {
  const [values, setValues] = useState<ContentValues>(initialContent);
  const [savingKey, setSavingKey] = useState<ContentKey | null>(null);

  async function save(key: ContentKey) {
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: values[key] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the text.");
      setValues((prev) => ({ ...prev, [key]: data.value }));
      onNotify("Page text saved.");
    } catch (error) {
      onNotify(error instanceof Error ? error.message : "Could not save the text.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-royal">Pages</span>
      <h1 className="font-display text-2xl font-extrabold text-navy sm:text-3xl">Page Text</h1>
      <p className="mt-1 text-xs text-navy/60">
        Edit the headings and intro lines on the home page. Leave the layout and styling unchanged.
      </p>

      <div className="mt-6 space-y-4">
        {CONTENT_BLOCKS.map((block) => {
          const current = values[block.key];
          const saved = initialContent[block.key];
          const dirty = current !== saved;
          return (
            <div key={block.key} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-navy">{block.label}</p>
                  <p className="text-[11px] text-navy/50">{block.page} page</p>
                </div>
                <span className="text-[10px] text-navy/40">
                  {current.length}/{MAX_BLOCK_LENGTH}
                </span>
              </div>

              {block.multiline ? (
                <textarea
                  value={current}
                  disabled={!canEdit}
                  maxLength={MAX_BLOCK_LENGTH}
                  rows={2}
                  onChange={(e) => setValues((prev) => ({ ...prev, [block.key]: e.target.value }))}
                  className="mt-3 w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal disabled:bg-slate-50"
                />
              ) : (
                <input
                  type="text"
                  value={current}
                  disabled={!canEdit}
                  maxLength={MAX_BLOCK_LENGTH}
                  onChange={(e) => setValues((prev) => ({ ...prev, [block.key]: e.target.value }))}
                  className="mt-3 w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal disabled:bg-slate-50"
                />
              )}

              {canEdit && (
                <div className="mt-3 flex justify-end gap-2">
                  {dirty && (
                    <button
                      type="button"
                      onClick={() => setValues((prev) => ({ ...prev, [block.key]: saved }))}
                      className="rounded-full border border-navy/20 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-50"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!dirty || savingKey === block.key}
                    onClick={() => save(block.key)}
                    className="rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-white hover:bg-royal disabled:opacity-40"
                  >
                    {savingKey === block.key ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
