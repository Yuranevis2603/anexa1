"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getFollowers, getFollowing, type FollowUser } from "@/lib/follows";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";

export default function FollowListModal({
  userId,
  kind,
  onClose,
}: {
  userId: string;
  kind: "followers" | "following";
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FollowUser[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const loader = kind === "followers" ? getFollowers : getFollowing;
    loader(supabase, userId).then((data) => {
      if (!cancelled) setUsers(data);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, kind]);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[16px] font-semibold text-ink-primary">
              {kind === "followers" ? "Підписники" : "Підписки"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          {users === null ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-ink-tertiary" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-tertiary">
              {kind === "followers" ? "Ще немає підписників." : "Ще ні на кого не підписані."}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {users.map((u) => (
                <Link
                  key={u.id}
                  href={`/dashboard/people/${u.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.04]"
                >
                  <Avatar
                    src={u.avatarUrl}
                    name={u.fullName}
                    size={40}
                    className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12.5px] font-semibold text-white"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink-primary">{u.fullName}</p>
                    <p className="truncate text-[11.5px] text-ink-tertiary">
                      {[u.roleTitle, u.company].filter(Boolean).join(" · ") || " "}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
