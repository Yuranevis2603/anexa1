"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateCommunity, type Community, type CommunityRule } from "@/lib/communities";
import ModalPortal from "@/components/ui/ModalPortal";

export default function EditCommunityModal({
  community,
  onClose,
  onSaved,
}: {
  community: Community;
  onClose: () => void;
  onSaved: (fields: { name: string; description: string | null; category: string | null; rules: CommunityRule[] }) => void;
}) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [category, setCategory] = useState(community.category ?? "");
  const [rules, setRules] = useState<CommunityRule[]>(community.rules.length > 0 ? community.rules : []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRule(index: number, field: "title" | "body", value: string) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRule() {
    setRules((prev) => [...prev, { title: "", body: "" }]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Назва обов'язкова.");
      return;
    }

    setSaving(true);
    setError(null);

    const cleanRules = rules.map((r) => ({ title: r.title.trim(), body: r.body.trim() })).filter((r) => r.title || r.body);

    try {
      const supabase = createClient();
      const fields = await updateCommunity(supabase, community.id, {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        rules: cleanRules,
      });
      onSaved(fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти зміни.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">Керувати спільнотою</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Назва *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Категорія</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="напр. Засновники, Інвестиції"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Опис</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[12px] font-medium text-ink-secondary">Правила спільноти</label>
                <button
                  type="button"
                  onClick={addRule}
                  className="flex items-center gap-1 text-[12px] font-medium text-purple-soft transition-colors hover:text-purple"
                >
                  <Plus size={13} />
                  Додати правило
                </button>
              </div>
              {rules.length === 0 ? (
                <p className="text-[12px] text-ink-tertiary">Правил ще немає.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rules.map((rule, i) => (
                    <div key={i} className="rounded-lg border border-border-subtle p-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(e) => updateRule(i, "title", e.target.value)}
                          placeholder={`Правило ${i + 1}: заголовок`}
                          className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-2 text-[12.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeRule(i)}
                          aria-label="Видалити правило"
                          className="shrink-0 rounded-lg p-2 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <textarea
                        value={rule.body}
                        onChange={(e) => updateRule(i, "body", e.target.value)}
                        rows={2}
                        placeholder="Опис правила"
                        className="mt-2 w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-2 text-[12.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

            <div className="mt-1 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                Зберегти
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
