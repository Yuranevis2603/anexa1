"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminUpsertLevel } from "@/lib/admin";
import type { Level } from "@/lib/gamification";
import { useToast } from "@/components/ui/ToastProvider";

function LevelRow({ level, onSaved }: { level: Level; onSaved: (level: Level) => void }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(level.title);
  const [minAx, setMinAx] = useState(String(level.min_ax));
  const [saving, setSaving] = useState(false);
  const dirty = title !== level.title || minAx !== String(level.min_ax);

  async function handleSave() {
    const parsed = parseInt(minAx, 10);
    if (!title.trim() || Number.isNaN(parsed) || parsed < 0) {
      showToast("error", "Перевірте назву й поріг AX.");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertLevel(createClient(), level.level, title.trim(), parsed);
      onSaved({ level: level.level, title: title.trim(), min_ax: parsed });
      showToast("success", `Рівень ${level.level} оновлено.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося зберегти рівень.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 py-2.5">
      <span className="w-6 shrink-0 text-[12.5px] text-ink-tertiary">#{level.level}</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-ink-primary focus:outline-none focus:ring-1 focus:ring-purple/40"
      />
      <input
        value={minAx}
        onChange={(e) => setMinAx(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        className="w-24 shrink-0 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-ink-primary focus:outline-none focus:ring-1 focus:ring-purple/40"
      />
      <span className="shrink-0 text-[11.5px] text-ink-tertiary">AX+</span>
      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[11.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary disabled:opacity-40"
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        Зберегти
      </button>
    </div>
  );
}

export default function AdminLevelsSettings({ initialLevels }: { initialLevels: Level[] }) {
  const { showToast } = useToast();
  const [levels, setLevels] = useState(() => [...initialLevels].sort((a, b) => a.level - b.level));
  const [addingLevel, setAddingLevel] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMinAx, setNewMinAx] = useState("");
  const [saving, setSaving] = useState(false);

  function handleLevelSaved(level: Level) {
    setLevels((prev) => prev.map((l) => (l.level === level.level ? level : l)));
  }

  async function handleAddLevel() {
    const nextLevel = (levels[levels.length - 1]?.level ?? 0) + 1;
    const parsed = parseInt(newMinAx, 10);
    if (!newTitle.trim() || Number.isNaN(parsed) || parsed < 0) {
      showToast("error", "Перевірте назву й поріг AX.");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertLevel(createClient(), nextLevel, newTitle.trim(), parsed);
      setLevels((prev) => [...prev, { level: nextLevel, title: newTitle.trim(), min_ax: parsed }]);
      setNewTitle("");
      setNewMinAx("");
      setAddingLevel(false);
      showToast("success", `Рівень ${nextLevel} додано.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося додати рівень.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Налаштування</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Пороги AX і назви рівнів гейміфікації.</p>

      <div className="glass mt-5 max-w-2xl rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-purple-soft" />
          <p className="text-[13px] font-semibold text-ink-primary">Рівні</p>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-border-subtle">
          {levels.map((level) => (
            <LevelRow key={level.level} level={level} onSaved={handleLevelSaved} />
          ))}
        </div>

        {addingLevel ? (
          <div className="mt-3 flex items-center gap-2.5 border-t border-border-subtle pt-3">
            <span className="w-6 shrink-0 text-[12.5px] text-ink-tertiary">#{(levels[levels.length - 1]?.level ?? 0) + 1}</span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Назва рівня"
              className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
            />
            <input
              value={newMinAx}
              onChange={(e) => setNewMinAx(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              inputMode="numeric"
              className="w-24 shrink-0 rounded-lg border border-border-subtle bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
            />
            <span className="shrink-0 text-[11.5px] text-ink-tertiary">AX+</span>
            <button
              type="button"
              onClick={handleAddLevel}
              disabled={saving}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-grad-purple-blue px-2.5 py-1.5 text-[11.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Додати
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingLevel(true)}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border-subtle px-3 py-2 text-[12px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
          >
            <Plus size={13} /> Додати рівень
          </button>
        )}
      </div>
    </div>
  );
}
