"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Bell, ShieldCheck, Coins, Settings as Cog,
  Camera, ChevronRight, Globe, LogOut, Trash2,
  MessageCircle, Users, CalendarDays, Sparkles, Mail,
  Smartphone, Lock, Eye, KeyRound, Wallet, X, Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import ModalPortal from "@/components/ui/ModalPortal";
import Avatar from "@/components/ui/Avatar";
import GamificationInfoModal from "@/components/profile/GamificationInfoModal";
import { getLevels, getProfileStats, type Level, type ProfileStats } from "@/lib/gamification";
import { uploadAvatar, type Profile } from "@/lib/profile";

const SECTIONS = [
  { id: "account", label: "Акаунт", icon: User },
  { id: "notifications", label: "Сповіщення", icon: Bell },
  { id: "privacy", label: "Приватність і безпека", icon: ShieldCheck },
  { id: "ax", label: "AX", icon: Coins },
  { id: "general", label: "Загальні", icon: Cog },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-gold" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-base transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  title,
  sub,
  right,
  onClick,
  danger,
  disabled,
}: {
  icon?: React.ElementType;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      {Icon && (
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle ${danger ? "bg-danger/10" : "bg-white/[0.04]"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-danger" : "text-ink-secondary"}`} strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={`text-[14.5px] font-medium ${danger ? "text-danger" : "text-ink-primary"}`}>{title}</div>
        {sub && <div className="mt-0.5 truncate text-[13px] text-ink-tertiary">{sub}</div>}
      </div>
      {right !== undefined ? right : (onClick && !disabled && <ChevronRight className="h-4 w-4 shrink-0 text-ink-tertiary" />)}
    </>
  );

  if (!onClick || disabled) {
    return <div className="flex w-full items-center gap-3 border-b border-border-subtle px-4 py-4 text-left last:border-b-0">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border-subtle px-4 py-4 text-left last:border-b-0 transition-colors hover:bg-white/[0.03]"
    >
      {content}
    </button>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="glass overflow-hidden rounded-2xl border border-border-subtle">{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-tertiary first:mt-0">
      {children}
    </div>
  );
}

function ComingSoonBadge() {
  return <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-ink-tertiary">Скоро</span>;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4" onClick={onClose} role="presentation">
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass w-full max-w-sm rounded-t-2xl border border-border-subtle bg-base-card p-5 sm:rounded-2xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-semibold text-ink-primary">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-ink-tertiary hover:text-ink-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

const fieldClass =
  "w-full rounded-xl border border-border-strong bg-white/[0.03] px-3.5 py-2.5 text-[14.5px] text-ink-primary outline-none placeholder:text-ink-tertiary focus:border-gold/60";

function TextFieldModal({
  label,
  placeholder,
  initialValue,
  type = "text",
  onClose,
  onSave,
  saving,
}: {
  label: string;
  placeholder?: string;
  initialValue: string;
  type?: string;
  onClose: () => void;
  onSave: (value: string) => void;
  saving?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <ModalShell title={label} onClose={onClose}>
      <label className="mb-1.5 block text-[12px] font-medium text-ink-tertiary">{label}</label>
      <input
        autoFocus
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border-subtle py-2.5 text-[13.5px] font-medium text-ink-secondary hover:bg-white/[0.04]"
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={() => onSave(value)}
          disabled={!value.trim() || saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-[13.5px] font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Зберегти
        </button>
      </div>
    </ModalShell>
  );
}

function OptionsModal({
  title,
  options,
  value,
  onClose,
  onSave,
}: {
  title: string;
  options: string[];
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onSave(opt); onClose(); }}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition-colors ${
              opt === value ? "border-gold/50 bg-gold/10 text-ink-primary" : "border-border-subtle text-ink-secondary hover:bg-white/[0.04]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function PasswordModal({
  email,
  onClose,
  onSave,
}: {
  email: string;
  onClose: () => void;
  onSave: (current: string, next: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const mismatch = Boolean(next && confirm && next !== confirm);
  const canSave = Boolean(current && next.length >= 8 && next === confirm) && !saving;

  async function handleSave() {
    setSaving(true);
    await onSave(current, next);
    setSaving(false);
  }

  return (
    <ModalShell title="Змінити пароль" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-ink-tertiary">Поточний пароль</label>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-ink-tertiary">Новий пароль</label>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={fieldClass} placeholder="Мінімум 8 символів" />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-ink-tertiary">Підтвердіть новий пароль</label>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={fieldClass} />
          {mismatch && <p className="mt-1.5 text-[12px] text-danger">Паролі не збігаються</p>}
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-border-subtle py-2.5 text-[13.5px] font-medium text-ink-secondary hover:bg-white/[0.04]"
        >
          Скасувати
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-[13.5px] font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Зберегти
        </button>
      </div>
    </ModalShell>
  );
}

type ModalState =
  | { type: "name" | "username" | "email" }
  | { type: "password" }
  | { type: "whoCanWrite" | "visibility" }
  | null;

export default function SettingsView({ profile: initialProfile, email: initialEmail }: { profile: Profile; email: string }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [active, setActive] = useState<SectionId>("account");
  const [profile, setProfile] = useState(initialProfile);
  const [email] = useState(initialEmail);
  const [notif, setNotif] = useState({
    messages: true, communities: true, events: false, anexa: true,
    email: true, push: true,
  });
  const [priv, setPriv] = useState({ whoCanWrite: "Усі", visibility: "Публічний" });
  const [modal, setModal] = useState<ModalState>(null);
  const [savingField, setSavingField] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<ProfileStats>({
    ax_points: 0, ax_balance: 0, reputation: null, review_count: 0, level: 1, levelTitle: "Starter",
  });
  const [levels, setLevels] = useState<Level[]>([]);
  const [gamificationInfoOpen, setGamificationInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([getProfileStats(supabase, profile.id), getLevels(supabase)]).then(([statsData, levelsData]) => {
      if (cancelled) return;
      setStats(statsData);
      setLevels(levelsData);
    });
    return () => { cancelled = true; };
  }, [profile.id]);

  const activeMeta = SECTIONS.find((s) => s.id === active)!;

  async function updateProfileField(field: "full_name" | "username", value: string) {
    setSavingField(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", profile.id)
      .select()
      .single();
    setSavingField(false);

    if (error) {
      showToast("error", error.code === "23505" ? "Це ім'я користувача вже зайнято." : "Не вдалося зберегти зміни.");
      return;
    }
    setProfile(data as Profile);
    setModal(null);
    showToast("success", field === "full_name" ? "Ім'я оновлено." : "Username оновлено.");
  }

  async function updateEmail(value: string) {
    setSavingField(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: value });
    setSavingField(false);

    if (error) {
      showToast("error", error.message);
      return;
    }
    setModal(null);
    showToast("success", "Перевірте пошту, щоб підтвердити нову адресу.");
  }

  async function handleChangePassword(current: string, next: string) {
    const supabase = createClient();
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (reauthError) {
      showToast("error", "Поточний пароль невірний.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      showToast("error", error.message);
      return;
    }
    setModal(null);
    showToast("success", "Пароль змінено.");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarUploading(true);
    const supabase = createClient();
    try {
      const avatarUrl = await uploadAvatar(supabase, profile.id, file);
      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq("id", profile.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      setProfile(data as Profile);
      showToast("success", "Фото оновлено.");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося завантажити фото.");
    } finally {
      setAvatarUploading(false);
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:gap-8">
      {/* Section nav */}
      <aside className="md:w-64 md:shrink-0">
        <h1 className="font-display px-1 text-2xl font-bold tracking-tight text-ink-primary">Налаштування</h1>
        <p className="mt-1 px-1 text-[13px] text-ink-tertiary">Керуй акаунтом, сповіщеннями та AX</p>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors md:w-full ${
                  isActive ? "bg-white/[0.06] text-ink-primary" : "text-ink-tertiary hover:bg-white/[0.03] hover:text-ink-secondary"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-gold" : "text-ink-tertiary"}`} strokeWidth={1.75} />
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="font-display mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink-tertiary">
          <activeMeta.icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
          {activeMeta.label}
        </div>

        {active === "account" && (
          <SectionCard>
            <div className="flex items-center gap-4 border-b border-border-subtle px-4 py-5">
              <div className="relative">
                <Avatar
                  src={profile.avatar_url}
                  name={profile.full_name}
                  size={64}
                  className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-gold to-[#7A5A22] text-lg font-semibold text-base"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-base-card bg-white/[0.08]"
                >
                  {avatarUploading ? <Loader2 className="h-3 w-3 animate-spin text-ink-secondary" /> : <Camera className="h-3 w-3 text-ink-secondary" strokeWidth={2} />}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
              <div>
                <div className="font-display text-[16px] font-semibold text-ink-primary">{profile.full_name}</div>
                {profile.username && <div className="text-[13px] text-ink-tertiary">@{profile.username}</div>}
              </div>
            </div>
            <Row icon={User} title="Ім'я" sub={profile.full_name} onClick={() => setModal({ type: "name" })} />
            <Row icon={User} title="Username" sub={profile.username ? `@${profile.username}` : "Не встановлено"} onClick={() => setModal({ type: "username" })} />
            <Row icon={Mail} title="Email" sub={email} onClick={() => setModal({ type: "email" })} />
            <Row icon={KeyRound} title="Змінити пароль" onClick={() => setModal({ type: "password" })} />
          </SectionCard>
        )}

        {active === "notifications" && (
          <>
            <SectionLabel>Що надсилати</SectionLabel>
            <SectionCard>
              <Row icon={MessageCircle} title="Повідомлення" sub="Нові особисті та групові чати"
                right={<Toggle checked={notif.messages} onChange={(v) => setNotif({ ...notif, messages: v })} />} />
              <Row icon={Users} title="Спільноти" sub="Активність у ваших спільнотах"
                right={<Toggle checked={notif.communities} onChange={(v) => setNotif({ ...notif, communities: v })} />} />
              <Row icon={CalendarDays} title="Події" sub="Нагадування про майбутні події"
                right={<Toggle checked={notif.events} onChange={(v) => setNotif({ ...notif, events: v })} />} />
              <Row icon={Sparkles} title="ANEXA" sub="Оновлення та рекомендації від ANEXA"
                right={<Toggle checked={notif.anexa} onChange={(v) => setNotif({ ...notif, anexa: v })} />} />
            </SectionCard>

            <SectionLabel>Канали</SectionLabel>
            <SectionCard>
              <Row icon={Mail} title="Email" sub="Дублювати сповіщення на пошту"
                right={<Toggle checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} />} />
              <Row icon={Smartphone} title="Push" sub="Сповіщення на пристрій"
                right={<Toggle checked={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} />} />
            </SectionCard>
          </>
        )}

        {active === "privacy" && (
          <SectionCard>
            <Row icon={Lock} title="Хто може писати" sub={priv.whoCanWrite} onClick={() => setModal({ type: "whoCanWrite" })} />
            <Row icon={Eye} title="Видимість профілю" sub={priv.visibility} onClick={() => setModal({ type: "visibility" })} />
            <Row icon={KeyRound} title="Змінити пароль" onClick={() => setModal({ type: "password" })} />
            <Row icon={ShieldCheck} title="Двофакторна автентифікація" sub="Незабаром" disabled right={<ComingSoonBadge />} />
          </SectionCard>
        )}

        {active === "ax" && (
          <SectionCard>
            <div className="border-b border-border-subtle px-4 py-6">
              <div className="flex items-center gap-2 text-[13px] text-ink-tertiary">
                <Wallet className="h-3.5 w-3.5" /> Баланс AX · Рівень {stats.level} · {stats.levelTitle}
              </div>
              <div className="mt-2 flex items-baseline gap-2 text-[32px] font-semibold text-gold">
                {stats.ax_balance.toLocaleString("uk-UA")}
                <span className="text-[13px] font-medium text-ink-tertiary">AX</span>
              </div>
              <button
                type="button"
                onClick={() => setGamificationInfoOpen(true)}
                className="mt-4 rounded-xl bg-gold px-4 py-2.5 text-[13.5px] font-semibold text-base transition-opacity hover:opacity-90"
              >
                Як заробити AX
              </button>
            </div>
            <Row icon={Coins} title="Всього зароблено" sub={`${stats.ax_points.toLocaleString("uk-UA")} AX за весь час`} />
          </SectionCard>
        )}

        {active === "general" && (
          <>
            <SectionCard>
              <Row icon={Globe} title="Мова" sub="Українська" />
            </SectionCard>

            <SectionLabel>Акаунт</SectionLabel>
            <SectionCard>
              <Row icon={LogOut} title={signingOut ? "Виходимо…" : "Вийти"} onClick={handleSignOut} />
              <Row icon={Trash2} title="Видалити акаунт" danger disabled right={<ComingSoonBadge />} />
            </SectionCard>
          </>
        )}
      </main>

      {modal?.type === "name" && (
        <TextFieldModal
          label="Ім'я"
          placeholder="Введіть ім'я"
          initialValue={profile.full_name}
          saving={savingField}
          onClose={() => setModal(null)}
          onSave={(v) => updateProfileField("full_name", v.trim())}
        />
      )}
      {modal?.type === "username" && (
        <TextFieldModal
          label="Username"
          placeholder="username"
          initialValue={profile.username ?? ""}
          saving={savingField}
          onClose={() => setModal(null)}
          onSave={(v) => updateProfileField("username", v.trim().replace(/^@/, ""))}
        />
      )}
      {modal?.type === "email" && (
        <TextFieldModal
          label="Email"
          placeholder="you@example.com"
          type="email"
          initialValue={email}
          saving={savingField}
          onClose={() => setModal(null)}
          onSave={(v) => updateEmail(v.trim())}
        />
      )}
      {modal?.type === "password" && (
        <PasswordModal email={email} onClose={() => setModal(null)} onSave={handleChangePassword} />
      )}
      {modal?.type === "whoCanWrite" && (
        <OptionsModal
          title="Хто може писати"
          options={["Усі", "Знайомі", "Ніхто"]}
          value={priv.whoCanWrite}
          onClose={() => setModal(null)}
          onSave={(v) => setPriv({ ...priv, whoCanWrite: v })}
        />
      )}
      {modal?.type === "visibility" && (
        <OptionsModal
          title="Видимість профілю"
          options={["Публічний", "Тільки учасники ANEXA"]}
          value={priv.visibility}
          onClose={() => setModal(null)}
          onSave={(v) => setPriv({ ...priv, visibility: v })}
        />
      )}
      {gamificationInfoOpen && <GamificationInfoModal levels={levels} onClose={() => setGamificationInfoOpen(false)} />}
    </div>
  );
}
