"use client";

import { useMemo, useState } from "react";
import { Check, Coins, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_AX_GRANT_MAX, adminDeductAx, adminGrantAx, approveProfile, type AdminUser } from "@/lib/admin";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";

type AxMode = "grant" | "deduct";

function AdjustAxModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<AxMode>("grant");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    const parsed = parseInt(amount, 10);
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > ADMIN_AX_GRANT_MAX) {
      showToast("error", `Введіть кількість AX від 1 до ${ADMIN_AX_GRANT_MAX}.`);
      return;
    }
    setSending(true);
    try {
      if (mode === "grant") {
        await adminGrantAx(createClient(), user.id, parsed, note.trim());
        showToast("success", `Нараховано ${parsed} AX користувачу ${user.fullName}.`);
      } else {
        await adminDeductAx(createClient(), user.id, parsed, note.trim());
        showToast("success", `Знято ${parsed} AX у користувача ${user.fullName}.`);
      }
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося змінити баланс AX.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4" onClick={onClose} role="presentation">
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-5 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-purple-soft" />
              <p className="text-[13.5px] font-semibold text-ink-primary">Змінити AX</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Закрити" className="rounded-lg p-1 text-ink-tertiary hover:bg-white/[0.06] hover:text-ink-primary">
              <X size={16} />
            </button>
          </div>
          <p className="mt-1.5 text-[12px] text-ink-tertiary">{user.fullName}</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("grant")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors ${
                mode === "grant" ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple" : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
              }`}
            >
              <Plus size={13} /> Нарахувати
            </button>
            <button
              type="button"
              onClick={() => setMode("deduct")}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors ${
                mode === "deduct" ? "border-danger bg-danger/10 text-danger" : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
              }`}
            >
              <Minus size={13} /> Зняти
            </button>
          </div>

          <label className="mt-4 block text-[11.5px] font-medium text-ink-tertiary">Кількість AX (макс. {ADMIN_AX_GRANT_MAX})</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            placeholder="0"
            autoFocus
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
          />

          <label className="mt-3 block text-[11.5px] font-medium text-ink-tertiary">Причина (необов&apos;язково)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder={mode === "grant" ? "Наприклад: приз конкурсу" : "Наприклад: скасування помилкового нарахування"}
            className="mt-1.5 w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || !amount}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[12.5px] font-medium text-white transition-opacity disabled:opacity-60 ${
              mode === "grant" ? "bg-grad-purple-blue shadow-glow-purple" : "bg-danger"
            }`}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : mode === "grant" ? <Plus size={14} /> : <Minus size={14} />}
            {mode === "grant" ? "Нарахувати" : "Зняти"}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

type StatusFilter = "all" | "active" | "pending";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Усі" },
  { value: "active", label: "Активний" },
  { value: "pending", label: "На перевірці" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function AdminUsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && !u.isApproved) return false;
      if (filter === "pending" && u.isApproved) return false;
      if (!term) return true;
      return u.fullName.toLowerCase().includes(term) || (u.username ?? "").toLowerCase().includes(term);
    });
  }, [users, search, filter]);

  const pendingCount = users.filter((u) => !u.isApproved).length;

  async function handleApprove(user: AdminUser) {
    if (approvingId) return;
    setApprovingId(user.id);
    try {
      await approveProfile(createClient(), user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isApproved: true } : u)));
      showToast("success", `Профіль ${user.fullName} підтверджено.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося підтвердити профіль.");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-primary">Користувачі</h1>
          <p className="mt-1 text-[13px] text-ink-tertiary">
            {filtered.length} із {users.length} користувачів · {pendingCount} на перевірці
          </p>
        </div>
      </div>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12.5px]">
            <Search size={14} className="shrink-0 text-ink-tertiary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Пошук за іменем або @username..."
              className="w-full bg-transparent text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors ${
                filter === f.value
                  ? "border-transparent bg-grad-purple-blue text-white shadow-glow-purple"
                  : "border-border-subtle text-ink-secondary hover:bg-white/[0.05]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wide text-ink-tertiary">
                <th className="px-3 py-2 font-medium">Користувач</th>
                <th className="px-3 py-2 font-medium">Роль</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Спільноти</th>
                <th className="px-3 py-2 font-medium">Приєднався</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[13px] text-ink-tertiary">
                    Нічого не знайдено.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar
                          src={u.avatarUrl}
                          name={u.fullName}
                          size={32}
                          className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink-primary">{u.fullName}</p>
                          <p className="truncate text-[11.5px] text-ink-tertiary">{u.username ? `@${u.username}` : "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${
                          u.isPlatformAdmin ? "border-purple/25 text-purple-soft" : "border-border-subtle text-ink-secondary"
                        }`}
                      >
                        {u.isPlatformAdmin ? "Admin" : "Учасник"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.isApproved ? (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Активний
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-gold-soft">
                          <span className="h-1.5 w-1.5 rounded-full bg-gold" /> На перевірці
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{u.communityCount}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{formatDate(u.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/dashboard/people/${u.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                        >
                          Переглянути
                        </a>
                        <button
                          type="button"
                          onClick={() => setGrantTarget(u)}
                          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                        >
                          <Coins size={12} />
                          AX
                        </button>
                        {!u.isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(u)}
                            disabled={approvingId === u.id}
                            className="flex items-center gap-1.5 rounded-lg bg-grad-purple-blue px-2.5 py-1.5 text-[12px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
                          >
                            {approvingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Схвалити
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {grantTarget ? <AdjustAxModal user={grantTarget} onClose={() => setGrantTarget(null)} /> : null}
    </div>
  );
}
