"use client";

import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROJECT_STATUSES, createProject, type Project, type ProjectStatus } from "@/lib/projects";

export default function AddProjectModal({
  userId,
  open,
  onClose,
  onCreated,
}: {
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [linkUrl, setLinkUrl] = useState("");
  const [teamSize, setTeamSize] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setStatus("active");
    setLinkUrl("");
    setTeamSize("");
    setError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Введіть назву проєкту.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const project = await createProject(supabase, userId, {
        title: trimmedTitle,
        description: description.trim() || null,
        status,
        linkUrl: linkUrl.trim() || null,
        teamSize: teamSize.trim() ? Number(teamSize) : null,
      });

      reset();
      onCreated(project);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати проєкт.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={handleClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-5 sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-semibold text-ink-primary">Додати проєкт</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="project-title" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
              Назва *
            </label>
            <input
              id="project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="напр. ANEXA"
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="project-description" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
              Опис
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Кілька речень про проєкт"
              className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="project-status" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                Статус
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary focus:border-purple/50 focus:outline-none"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-base-card text-ink-primary">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-team-size" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
                Розмір команди
              </label>
              <input
                id="project-team-size"
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
            <label htmlFor="project-link" className="mb-1.5 block text-[12.5px] font-medium text-ink-secondary">
              Посилання
            </label>
            <input
              id="project-link"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
            />
          </div>

          {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

          <div className="mt-1 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Додати
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
