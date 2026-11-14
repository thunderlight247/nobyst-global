"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { CategoryNode } from "@/lib/categories";

type Props = {
  categories: CategoryNode[];
  onChanged: (next: CategoryNode[], message: string) => void;
  onError: (message: string) => void;
};

type Draft = { name: string; parentId: string; sortOrder: string };

const EMPTY: Draft = { name: "", parentId: "", sortOrder: "0" };

const fieldClass =
  "w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-xs text-navy placeholder:text-navy/40 focus:border-royal focus:outline-none focus:ring-1 focus:ring-royal";

export default function CategoryEditor({ categories, onChanged, onError }: Props) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  // Only top-level categories can be parents, and a category that already has children cannot become a child.
  const parentOptions = categories.filter((c) => !c.parentId);

  function startEdit(cat: CategoryNode | null) {
    if (!cat) {
      setDraft({ ...EMPTY, sortOrder: String((categories.at(-1)?.sortOrder ?? 0) + 1) });
      setEditingId("new");
      return;
    }
    setDraft({ name: cat.name, parentId: cat.parentId ?? "", sortOrder: String(cat.sortOrder) });
    setEditingId(cat.id);
  }

  async function save() {
    if (!editingId) return;
    setBusy(true);
    const isNew = editingId === "new";
    try {
      const res = await fetch(
        isNew ? "/api/admin/categories" : `/api/admin/categories/${editingId}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            parentId: draft.parentId || null,
            sortOrder: Number(draft.sortOrder),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Could not save the category.");
        return;
      }
      const saved: CategoryNode = data.category;
      const next = isNew
        ? [...categories, saved]
        : categories.map((c) => (c.id === saved.id ? saved : c));
      next.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      setEditingId(null);
      onChanged(next, isNew ? `Category added: ${saved.name}` : `Category saved: ${saved.name}`);
    } catch {
      onError("Could not save the category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      {editingId ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-navy">
              {editingId === "new" ? "New category" : "Edit category"}
            </h3>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg p-1 text-navy/50 hover:bg-navy/5">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-[11px] font-bold text-navy/60">
              Name
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1 text-[11px] font-bold text-navy/60">
              Parent (optional)
              <select
                value={draft.parentId}
                onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
                className={fieldClass}
              >
                <option value="">None (top-level)</option>
                {parentOptions
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-bold text-navy/60">
              Order
              <input
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="inline-flex min-h-[40px] items-center rounded-full bg-navy px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-royal disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save category"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-navy">Manage categories</h3>
            <button
              type="button"
              onClick={() => startEdit(null)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-navy px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-royal"
            >
              <Plus size={14} />
              <span>Add category</span>
            </button>
          </div>
          <ul className="divide-y divide-navy/5 text-xs">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className={c.parentId ? "pl-4 text-navy/70" : "font-bold text-navy"}>
                  {c.parentId ? "↳ " : ""}
                  {c.name}
                  <span className="ml-2 text-navy/40">order {c.sortOrder}</span>
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="inline-flex items-center gap-1 rounded-lg bg-navy/5 px-2.5 py-1 text-[11px] font-bold text-navy hover:bg-navy hover:text-white"
                >
                  <Pencil size={12} />
                  <span>Edit</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
