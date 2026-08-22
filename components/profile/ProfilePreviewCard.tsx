"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Star, Trophy, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getProfile, type Profile } from "@/lib/profile";
import { getProfileStats, type ProfileStats } from "@/lib/gamification";
import Avatar from "@/components/ui/Avatar";

/**
 * Wraps a name/avatar so clicking it opens a small preview card instead of
 * navigating straight to the profile — the actual navigation only happens
 * from the "Відвідати профіль" button inside. The wrapping <button> uses
 * display:contents so it's invisible to the surrounding flex/grid layout;
 * `children` should be the existing avatar/name markup, unchanged.
 *
 * Profile data is fetched lazily on first open (once, cached in state) —
 * not eagerly per avatar, which would turn a feed of 50 posts into 50
 * requests before anyone even clicks anything.
 */
export default function ProfilePreviewCard({
  userId,
  isOwn = false,
  children,
}: {
  userId: string;
  isOwn?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  function openPreview() {
    setOpen(true);
    if (!profile && !loading) {
      setLoading(true);
      const supabase = createClient();
      Promise.all([getProfile(supabase, userId), getProfileStats(supabase, userId)]).then(([p, s]) => {
        setProfile(p);
        setStats(s);
        setLoading(false);
      });
    }
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openPreview();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      openPreview();
    }
  }

  const profileHref = isOwn ? "/dashboard/profile" : `/dashboard/people/${userId}`;

  return (
    <>
      {/* span, not button: this is often nested inside another clickable
          element (e.g. a whole ChatListItem row is a <button>), and a real
          <button> can't validly nest inside one — role="button" + key
          handling keeps it keyboard-accessible without that problem. */}
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="contents cursor-pointer text-left"
      >
        {children}
      </span>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 sm:items-center sm:px-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-sm overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Профіль</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрити"
                className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <X size={16} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-ink-tertiary" />
              </div>
            ) : profile ? (
              <>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar
                    src={profile.avatar_url}
                    name={profile.full_name}
                    size={56}
                    className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[15px] font-semibold text-white"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-ink-primary">{profile.full_name}</p>
                    {profile.role_title || profile.company ? (
                      <p className="truncate text-[12.5px] text-ink-secondary">
                        {[profile.role_title, profile.company].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {profile.location ? (
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-tertiary">
                        <MapPin size={11} /> {profile.location}
                      </p>
                    ) : null}
                  </div>
                </div>

                {stats ? (
                  <div className="mt-4 flex items-center gap-4 rounded-xl border border-border-subtle bg-white/[0.02] px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Star size={14} className="text-gold" />
                      <span className="text-[13px] font-medium text-ink-primary">
                        {stats.reputation !== null ? stats.reputation.toFixed(1) : "—"}
                      </span>
                      <span className="text-[11px] text-ink-tertiary">репутація</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-purple-soft" />
                      <span className="text-[13px] font-medium text-ink-primary">{stats.level}</span>
                      <span className="text-[11px] text-ink-tertiary">{stats.levelTitle}</span>
                    </div>
                  </div>
                ) : null}

                <Link
                  href={profileHref}
                  onClick={() => setOpen(false)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2.5 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
                >
                  Відвідати профіль
                </Link>
              </>
            ) : (
              <p className="mt-4 text-[13px] text-ink-tertiary">Не вдалося завантажити профіль.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
