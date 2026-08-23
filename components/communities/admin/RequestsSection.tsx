"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { approveJoinRequest, rejectJoinRequest, timeAgo, type JoinRequestRow } from "@/lib/communityAdmin";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

export default function RequestsSection({
  communityId,
  userId,
  initialRequests,
}: {
  communityId: string;
  userId: string;
  initialRequests: JoinRequestRow[];
}) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(request: JoinRequestRow, approve: boolean) {
    setBusyId(request.userId);
    try {
      const supabase = createClient();
      if (approve) {
        await approveJoinRequest(supabase, communityId, request.userId, userId);
      } else {
        await rejectJoinRequest(supabase, communityId, request.userId, userId);
      }
      setRequests((prev) => prev.filter((r) => r.userId !== request.userId));
    } catch (err) {
      showToast("error", "Не вдалося обробити заявку.");
      console.error("decide join request failed:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function approveAll() {
    if (requests.length === 0) return;
    const supabase = createClient();
    for (const r of requests) {
      try {
        await approveJoinRequest(supabase, communityId, r.userId, userId);
      } catch (err) {
        console.error("approveAll failed for", r.userId, err);
      }
    }
    setRequests([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-ink-primary">Заявки на вступ</p>
          <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
            {requests.length > 0 ? `${requests.length} заявок очікують рішення` : "Нових заявок немає"}
          </p>
        </div>
        {requests.length > 0 ? (
          <button
            type="button"
            onClick={approveAll}
            className="rounded-xl bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
          >
            Схвалити всі
          </button>
        ) : null}
      </div>

      {requests.length === 0 ? (
        <div className="glass flex flex-col items-center gap-2.5 rounded-2xl border border-border-subtle p-20 text-center">
          <Check size={22} className="text-ink-tertiary" />
          <p className="text-[13.5px] text-ink-tertiary">Усі заявки опрацьовані</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-border-subtle bg-white/[0.028] p-4"
            >
              <Avatar
                src={r.avatarUrl}
                name={r.fullName}
                size={44}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13.5px] font-semibold text-white"
              />
              <div className="min-w-[160px] flex-1">
                <p className="text-[14px] font-semibold text-ink-primary">{r.fullName}</p>
                {r.roleTitle || r.company ? (
                  <p className="mt-0.5 text-[12.5px] text-ink-tertiary">
                    {[r.roleTitle, r.company].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {r.note ? <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">«{r.note}»</p> : null}
              </div>
              <p className="shrink-0 text-[11px] text-ink-tertiary">{timeAgo(r.createdAt)}</p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busyId === r.userId}
                  onClick={() => decide(r, true)}
                  className="rounded-lg border border-success/30 bg-success/[0.14] px-3.5 py-2 text-[12.5px] font-medium text-success transition-colors hover:bg-success/[0.22] disabled:opacity-60"
                >
                  Схвалити
                </button>
                <button
                  type="button"
                  disabled={busyId === r.userId}
                  onClick={() => decide(r, false)}
                  className="rounded-lg border border-border-subtle bg-white/[0.04] px-3.5 py-2 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.09] disabled:opacity-60"
                >
                  Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
