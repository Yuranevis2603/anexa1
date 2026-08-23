"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut, Mail, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";

export default function SettingsView({ email }: { email: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      showToast("error", "Пароль має містити щонайменше 8 символів.");
      return;
    }
    if (password !== confirm) {
      showToast("error", "Паролі не збігаються.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    showToast("success", "Пароль змінено.");
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-2">
        <SettingsIcon size={20} className="text-purple-soft" />
        <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Налаштування</h1>
      </div>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Акаунт</p>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-border-subtle bg-white/[0.03] px-3.5 py-3">
          <Mail size={16} className="shrink-0 text-ink-tertiary" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-primary">{email}</span>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="glass mt-4 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Змінити пароль</p>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-3">
          <KeyRound size={16} className="shrink-0 text-ink-tertiary" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Новий пароль"
            autoComplete="new-password"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>
        <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-3">
          <KeyRound size={16} className="shrink-0 text-ink-tertiary" />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Підтвердіть пароль"
            autoComplete="new-password"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !password}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? "Зберігаємо…" : "Зберегти пароль"}
        </button>
      </form>

      <div className="glass mt-4 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Сесія</p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-[13px] font-medium text-danger transition-colors hover:bg-danger/15 disabled:opacity-60"
        >
          <LogOut size={15} />
          {signingOut ? "Виходимо…" : "Вийти з акаунта"}
        </button>
      </div>
    </div>
  );
}
