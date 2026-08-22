"use client";

import { useState } from "react";
import { Loader2, MoreVertical, Plus, Settings2, Trash2, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  kickMember,
  setMemberRole,
  updateCommunity,
  type Community,
  type CommunityMember,
  type CommunityRoleTier,
  type CommunityRule,
} from "@/lib/communities";
import ModalPortal from "@/components/ui/ModalPortal";
import Avatar from "@/components/ui/Avatar";

type PanelTab = "settings" | "members";

export default function EditCommunityModal({
  community,
  members,
  isOwner,
  isAdmin,
  onClose,
  onSaved,
  onRoleChanged,
  onMemberKicked,
}: {
  community: Community;
  members: CommunityMember[];
  isOwner: boolean;
  /** Owner or Admin — gates the "Учасники" tab; "Налаштування" stays owner-only. */
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (fields: { name: string; description: string | null; category: string | null; rules: CommunityRule[] }) => void;
  onRoleChanged: (userId: string, role: CommunityRoleTier) => void;
  onMemberKicked: (userId: string) => void;
}) {
  const [tab, setTab] = useState<PanelTab>(isOwner ? "settings" : "members");

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [category, setCategory] = useState(community.category ?? "");
  const [rules, setRules] = useState<CommunityRule[]>(community.rules.length > 0 ? community.rules : []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [memberMenuFor, setMemberMenuFor] = useState<string | null>(null);
  const [memberActionPending, setMemberActionPending] = useState<string | null>(null);

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

  function canKickMember(m: CommunityMember): boolean {
    if (m.isOwner) return false;
    if (isOwner) return true;
    return isAdmin && m.communityRole !== "admin";
  }

  async function handleSetRole(member: CommunityMember, role: CommunityRoleTier) {
    if (memberActionPending) return;
    setMemberActionPending(member.userId);
    try {
      const supabase = createClient();
      await setMemberRole(supabase, community.id, member.userId, role);
      onRoleChanged(member.userId, role);
    } catch (err) {
      console.error("setMemberRole failed:", err);
    } finally {
      setMemberActionPending(null);
      setMemberMenuFor(null);
    }
  }

  async function handleKick(member: CommunityMember) {
    if (memberActionPending) return;
    setMemberActionPending(member.userId);
    try {
      const supabase = createClient();
      await kickMember(supabase, community.id, member.userId);
      onMemberKicked(member.userId);
    } catch (err) {
      console.error("kickMember failed:", err);
    } finally {
      setMemberActionPending(null);
      setMemberMenuFor(null);
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
          className="glass flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card sm:rounded-2xl"
        >
          <div className="flex items-center justify-between p-6 pb-0">
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

          {isOwner ? (
            <div className="mt-4 flex items-center gap-1 border-b border-border-subtle px-6">
              <button
                type="button"
                onClick={() => setTab("settings")}
                className={`flex items-center gap-1.5 border-b-2 px-2 pb-2.5 text-[13px] font-medium transition-colors ${
                  tab === "settings" ? "border-purple-soft text-ink-primary" : "border-transparent text-ink-tertiary"
                }`}
              >
                <Settings2 size={13} />
                Налаштування
              </button>
              <button
                type="button"
                onClick={() => setTab("members")}
                className={`flex items-center gap-1.5 border-b-2 px-2 pb-2.5 text-[13px] font-medium transition-colors ${
                  tab === "members" ? "border-purple-soft text-ink-primary" : "border-transparent text-ink-tertiary"
                }`}
              >
                <Users size={13} />
                Учасники
              </button>
            </div>
          ) : null}

          <div className="overflow-y-auto p-6">
            {tab === "settings" ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const hasMenu = !m.isOwner && (isOwner || canKickMember(m));
                  return (
                    <div key={m.userId} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                      <Avatar
                        src={m.avatarUrl}
                        name={m.fullName}
                        size={36}
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11.5px] font-semibold text-white"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[13px] font-medium text-ink-primary">{m.fullName}</p>
                          {m.isOwner ? (
                            <span className="shrink-0 rounded-md bg-purple/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-soft">
                              Власник
                            </span>
                          ) : m.communityRole === "admin" ? (
                            <span className="shrink-0 rounded-md bg-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-blue">
                              Адмін
                            </span>
                          ) : m.communityRole === "moderator" ? (
                            <span className="shrink-0 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                              Модератор
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {hasMenu ? (
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setMemberMenuFor((cur) => (cur === m.userId ? null : m.userId))}
                            aria-label="Дії з учасником"
                            disabled={memberActionPending === m.userId}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary disabled:opacity-60"
                          >
                            {memberActionPending === m.userId ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <MoreVertical size={15} />
                            )}
                          </button>
                          {memberMenuFor === m.userId ? (
                            <div className="absolute right-0 top-9 z-10 w-48 overflow-hidden rounded-lg border border-border-subtle bg-base-card shadow-lg">
                              {isOwner ? (
                                <>
                                  {(["admin", "moderator", "member"] as const)
                                    .filter((r) => r !== m.communityRole)
                                    .map((r) => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => handleSetRole(m, r)}
                                        className="flex w-full items-center px-3 py-2 text-left text-[12.5px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                                      >
                                        {r === "admin"
                                          ? "Зробити адміном"
                                          : r === "moderator"
                                            ? "Зробити модератором"
                                            : "Зробити учасником"}
                                      </button>
                                    ))}
                                </>
                              ) : null}
                              {canKickMember(m) ? (
                                <button
                                  type="button"
                                  onClick={() => handleKick(m)}
                                  className="flex w-full items-center px-3 py-2 text-left text-[12.5px] text-danger transition-colors hover:bg-white/[0.05]"
                                >
                                  Видалити зі спільноти
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
