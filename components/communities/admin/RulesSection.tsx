"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateCommunityRules, type Community, type CommunityRule } from "@/lib/communities";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";

export default function RulesSection({ community }: { community: Community }) {
  const { showToast } = useToast();
  const [rules, setRules] = useState<CommunityRule[]>(community.rules);
  const [editing, setEditing] = useState<{ index: number; rule: CommunityRule } | "new" | null>(null);

  async function persist(next: CommunityRule[]) {
    const prev = rules;
    setRules(next);
    try {
      await updateCommunityRules(createClient(), community.id, next);
    } catch (err) {
      setRules(prev);
      showToast("error", "Не вдалося зберегти правила.");
      console.error("updateCommunityRules failed:", err);
    }
  }

  function remove(index: number) {
    persist(rules.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-ink-primary">Правила спільноти</p>
          <p className="mt-0.5 text-[12.5px] text-ink-tertiary">Учасники бачать їх у розділі «Про спільноту»</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
        >
          <Plus size={14} /> Додати правило
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="py-16 text-center text-[13.5px] text-ink-tertiary">Правил ще немає</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rules.map((r, i) => (
            <div key={i} className="flex items-start gap-3.5 rounded-2xl border border-border-subtle bg-white/[0.028] p-4">
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-purple/[0.15] text-[12px] font-semibold text-purple-soft">
                {i + 1}
              </span>
              <div className="min-w-[180px] flex-1">
                <p className="text-[13.5px] font-semibold text-ink-primary">{r.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-tertiary">{r.body}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditing({ index: i, rule: r })}
                  aria-label="Редагувати"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.03] text-ink-tertiary transition-colors hover:text-ink-primary"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Видалити"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-white/[0.03] text-ink-tertiary transition-colors hover:border-danger/30 hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <RuleModal
          initial={editing === "new" ? null : editing.rule}
          onClose={() => setEditing(null)}
          onSave={(rule) => {
            if (editing === "new") {
              persist([...rules, rule]);
            } else {
              persist(rules.map((r, i) => (i === editing.index ? rule : r)));
            }
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RuleModal({
  initial,
  onClose,
  onSave,
}: {
  initial: CommunityRule | null;
  onClose: () => void;
  onSave: (rule: CommunityRule) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), body: body.trim() });
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4" onClick={onClose} role="presentation">
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-sm overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-ink-primary">{initial ? "Редагувати правило" : "Нове правило"}</h2>
            <button type="button" onClick={onClose} aria-label="Закрити" className="rounded-lg p-1.5 text-ink-tertiary hover:bg-white/[0.06] hover:text-ink-primary">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Заголовок *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] text-ink-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-secondary">Опис</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full resize-y rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
            >
              Зберегти
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
