"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProject, type ProjectStatus } from "@/lib/projects";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";

export default function CreateProjectModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [teamSize, setTeamSize] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Введіть назву проєкту.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      await createProject(supabase, userId, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        team_size: teamSize ? Number(teamSize) : null,
        link_url: linkUrl.trim() || null,
      });
      showToast("success", "Проєкт додано.");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати проєкт.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4">
      <div className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Додати проєкт</h2>
          <button
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Назва *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="напр. ANEXA"
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Опис</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Коротко, чим займається проєкт"
              className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary focus:border-purple/50 focus:outline-none"
              >
                <option value="active" className="bg-base-card text-ink-primary">
                  Будується
                </option>
                <option value="completed" className="bg-base-card text-ink-primary">
                  Завершено
                </option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Команда</label>
              <input
                type="number"
                min={1}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                placeholder="напр. 4"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">Посилання</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          {error && <p className="text-[12.5px] text-danger">{error}</p>}

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
              className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Додати
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
