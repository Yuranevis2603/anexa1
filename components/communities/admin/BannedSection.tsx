"use client";

import { useState } from "react";
import { ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { timeAgo, unbanMember, type BannedRow } from "@/lib/communityAdmin";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

export default function BannedSection({
  communityId,
  userId,
  initialBanned,
}: {
  communityId: string;
  userId: string;
  initialBanned: BannedRow[];
}) {
  const { showToast } = useToast();
  const [banned, setBanned] = useState(initialBanned);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function unban(b: BannedRow) {
    setBusyId(b.userId);
    try {
      await unbanMember(createClient(), communityId, b.userId, userId);
      setBanned((prev) => prev.filter((x) => x.userId !== b.userId));
    } catch (err) {
      showToast("error", "Не вдалося розблокувати учасника.");
      console.error("unbanMember failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[16px] font-semibold text-ink-primary">Заблоковані учасники</p>
        <p className="mt-0.5 text-[12.5px] text-ink-tertiary">Не бачать стрічку та не можуть подати заявку повторно</p>
      </div>

      {banned.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-16 text-center">
          <ShieldOff size={20} className="text-ink-tertiary" />
          <p className="text-[13.5px] text-ink-tertiary">Немає заблокованих учасників</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {banned.map((b) => (
            <div
              key={b.userId}
              className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-danger/20 bg-danger/[0.05] p-3.5"
            >
              <Avatar
                src={b.avatarUrl}
                name={b.fullName}
                size={42}
                className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-[13px] font-semibold text-ink-secondary"
              />
              <div className="min-w-[150px] flex-1">
                <p className="text-[14px] font-semibold text-ink-secondary">{b.fullName}</p>
                {b.reason ? <p className="mt-0.5 text-[12.5px] text-ink-tertiary">{b.reason}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                {b.bannedByName ? <p className="text-[11.5px] text-ink-tertiary">{b.bannedByName}</p> : null}
                <p className="mt-0.5 text-[11px] text-ink-tertiary">{timeAgo(b.createdAt)}</p>
              </div>
              <button
                type="button"
                disabled={busyId === b.userId}
                onClick={() => unban(b)}
                className="shrink-0 rounded-lg border border-border-subtle bg-white/[0.05] px-3.5 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.1] disabled:opacity-60"
              >
                Розблокувати
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
