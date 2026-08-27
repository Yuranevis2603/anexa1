"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, KeyRound, Loader2, LogOut, Mail, EyeOff, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import { setHideOnlineStatus, requestAccountDeletion } from "@/lib/profile";
import {
  NOTIFICATION_TYPE_LABELS,
  setNotificationTypeEnabled,
  type NotificationType,
} from "@/lib/notifications";

const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 " +
        (checked ? "bg-grad-purple-blue" : "bg-white/[0.08]")
      }
    >
      <span
        className={
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-[22px]" : "translate-x-0.5")
        }
      />
    </button>
  );
}

export default function SettingsView({
  userId,
  email,
  initialDisabledTypes,
  initialHideOnlineStatus,
}: {
  userId: string;
  email: string;
  initialDisabledTypes: NotificationType[];
  initialHideOnlineStatus: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [newEmail, setNewEmail] = useState(email);
  const [emailSaving, setEmailSaving] = useState(false);

  const [disabledTypes, setDisabledTypes] = useState<NotificationType[]>(initialDisabledTypes);
  const [notifSavingType, setNotifSavingType] = useState<NotificationType | null>(null);

  const [hideOnline, setHideOnline] = useState(initialHideOnlineStatus);
  const [privacySaving, setPrivacySaving] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);

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

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (newEmail === email) return;

    setEmailSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);

    if (error) {
      showToast("error", error.message);
      return;
    }
    showToast("success", "Перевірте пошту — надіслано лист для підтвердження нової адреси.");
  }

  async function handleToggleNotification(type: NotificationType) {
    if (notifSavingType) return;
    const enabled = disabledTypes.includes(type);
    setNotifSavingType(type);
    const supabase = createClient();
    try {
      const next = await setNotificationTypeEnabled(supabase, userId, type, enabled, disabledTypes);
      setDisabledTypes(next);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося зберегти.");
    } finally {
      setNotifSavingType(null);
    }
  }

  async function handleTogglePrivacy() {
    if (privacySaving) return;
    const next = !hideOnline;
    setPrivacySaving(true);
    const supabase = createClient();
    try {
      await setHideOnlineStatus(supabase, userId, next);
      setHideOnline(next);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося зберегти.");
    } finally {
      setPrivacySaving(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleting || deleteConfirmText !== "ВИДАЛИТИ") return;
    setDeleting(true);
    const supabase = createClient();
    try {
      await requestAccountDeletion(supabase, userId);
      setDeletionRequested(true);
      showToast("success", "Запит на видалення акаунта прийнято.");
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати запит.");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center gap-2">
        <SettingsIcon size={20} className="text-purple-soft" />
        <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Налаштування</h1>
      </div>

      {/* Акаунт / email */}
      <form onSubmit={handleChangeEmail} className="glass mt-5 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Акаунт</p>
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-3">
          <Mail size={16} className="shrink-0 text-ink-tertiary" />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={emailSaving || !newEmail || newEmail === email}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {emailSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          {emailSaving ? "Зберігаємо…" : "Змінити email"}
        </button>
      </form>

      {/* Пароль */}
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

      {/* Приватність */}
      <div className="glass mt-4 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Приватність</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <EyeOff size={16} className="shrink-0 text-ink-tertiary" />
            <div>
              <p className="text-[13.5px] text-ink-primary">Приховати онлайн-статус</p>
              <p className="text-[11.5px] text-ink-tertiary">Інші учасники не бачитимуть, що ви в мережі</p>
            </div>
          </div>
          <Toggle checked={hideOnline} onChange={handleTogglePrivacy} disabled={privacySaving} />
        </div>
      </div>

      {/* Сповіщення */}
      <div className="glass mt-4 rounded-2xl border border-border-subtle p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Сповіщення</p>
        <div className="mt-3 flex flex-col divide-y divide-border-subtle">
          {NOTIFICATION_TYPES.map((type) => {
            const enabled = !disabledTypes.includes(type);
            return (
              <div key={type} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <p className="text-[13.5px] text-ink-primary">{NOTIFICATION_TYPE_LABELS[type]}</p>
                <Toggle
                  checked={enabled}
                  onChange={() => handleToggleNotification(type)}
                  disabled={notifSavingType === type}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Сесія */}
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

      {/* Danger zone */}
      <div className="glass mt-4 rounded-2xl border border-danger/25 p-6">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
          <AlertTriangle size={13} />
          Небезпечна зона
        </p>
        <p className="mt-2.5 text-[13px] text-ink-secondary">
          Видалення акаунта деактивує ваш профіль і виходить із сесії. Ваші дані будуть остаточно видалені
          адміністрацією протягом певного часу — цю дію не можна скасувати самостійно.
        </p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder='Введіть "ВИДАЛИТИ" щоб підтвердити'
          disabled={deletionRequested}
          className="mt-3 w-full rounded-xl border border-danger/30 bg-white/[0.03] px-3.5 py-3 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting || deletionRequested || deleteConfirmText !== "ВИДАЛИТИ"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : null}
          {deletionRequested ? "Запит надіслано" : deleting ? "Надсилаємо…" : "Видалити акаунт"}
        </button>
      </div>
    </div>
  );
}
