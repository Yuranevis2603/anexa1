"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { approveProfile, type PendingProfile } from "@/lib/admin";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";

export default function PendingApprovalsView({ initialPending }: { initialPending: PendingProfile[] }) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(initialPending);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function handleApprove(person: PendingProfile) {
    if (approvingId) return;
    setApprovingId(person.id);
    try {
      await approveProfile(createClient(), person.id);
      setPending((prev) => prev.filter((p) => p.id !== person.id));
      showToast("success", `Профіль ${person.fullName} підтверджено.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося підтвердити профіль.");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-purple-soft" />
        <h1 className="font-display text-lg font-semibold text-ink-primary sm:text-xl">Підтвердження профілів</h1>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-secondary">
        Нові учасники закритої бети, які ще очікують на підтвердження модератором.
      </p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-2">
        {pending.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-ink-tertiary">Немає профілів, що очікують підтвердження.</p>
        ) : (
          <div className="flex flex-col">
            {pending.map((person) => (
              <div key={person.id} className="flex items-center gap-3 border-b border-border-subtle px-3 py-3 last:border-0">
                <ProfilePreviewCard userId={person.id}>
                  <Avatar
                    src={person.avatarUrl}
                    name={person.fullName}
                    size={40}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12.5px] font-semibold text-white"
                  />
                </ProfilePreviewCard>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-ink-primary">{person.fullName}</p>
                  {person.roleTitle || person.company ? (
                    <p className="truncate text-[12px] text-ink-tertiary">
                      {[person.roleTitle, person.company].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleApprove(person)}
                  disabled={approvingId === person.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {approvingId === person.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Підтвердити
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
