"use client";

import { BadgeCheck } from "lucide-react";
import type { CommunityMember } from "@/lib/communities";
import type { EventItem } from "@/lib/events";
import Avatar from "@/components/ui/Avatar";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";

function formatDayMonth(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("uk-UA", { day: "numeric" }),
    month: date.toLocaleDateString("uk-UA", { month: "short" }).replace(".", ""),
  };
}

export default function CommunitySidebar({
  memberCount,
  postCount,
  onlineCount,
  owner,
  upcomingEvents,
  topMembers,
  onSelectEvents,
}: {
  memberCount: number;
  postCount: number;
  onlineCount: number;
  owner: CommunityMember | null;
  upcomingEvents: EventItem[];
  topMembers: { member: CommunityMember; count: number }[];
  onSelectEvents: () => void;
}) {
  return (
    <aside className="flex flex-col gap-3.5 lg:sticky lg:top-5">
      <div className="glass rounded-2xl border border-border-subtle p-4">
        <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Про спільноту</p>
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <p className="font-display text-[19px] font-semibold text-ink-primary">{memberCount}</p>
            <p className="text-[11px] text-ink-tertiary">Учасників</p>
          </div>
          <div>
            <p className="font-display text-[19px] font-semibold text-ink-primary">{postCount}</p>
            <p className="text-[11px] text-ink-tertiary">Постів</p>
          </div>
          <div>
            <p className="font-display text-[19px] font-semibold text-success">{onlineCount}</p>
            <p className="text-[11px] text-ink-tertiary">Онлайн</p>
          </div>
        </div>
      </div>

      {owner ? (
        <div className="glass rounded-2xl border border-border-subtle p-4">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Власник спільноти</p>
          <ProfilePreviewCard userId={owner.userId}>
            <div className="flex items-center gap-3">
              <Avatar
                src={owner.avatarUrl}
                name={owner.fullName}
                size={42}
                className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-semibold text-ink-primary hover:underline">
                    {owner.fullName}
                  </span>
                  <BadgeCheck size={13} className="shrink-0 text-purple-soft" />
                </div>
                <p className="truncate text-[12px] text-ink-tertiary">
                  {[owner.roleTitle, owner.company].filter(Boolean).join(" · ") || "Власник спільноти"}
                </p>
              </div>
            </div>
          </ProfilePreviewCard>
        </div>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <div className="glass rounded-2xl border border-border-subtle p-4">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Найближчі події</p>
          <div className="flex flex-col gap-3">
            {upcomingEvents.map((event) => {
              const { day, month } = formatDayMonth(event.eventDate);
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={onSelectEvents}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-xl border border-purple/30 bg-purple/10 py-1.5">
                    <span className="text-[14.5px] font-semibold text-ink-primary">{day}</span>
                    <span className="text-[9.5px] uppercase tracking-wide text-purple-soft">{month}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-primary">{event.title}</p>
                    <p className="truncate text-[11.5px] text-ink-tertiary">{event.attendeeCount} учасників ідуть</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {topMembers.length > 0 ? (
        <div className="glass rounded-2xl border border-border-subtle p-4">
          <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Найактивніші</p>
          <div className="flex flex-col gap-3">
            {topMembers.map(({ member, count }, i) => (
              <ProfilePreviewCard key={member.userId} userId={member.userId}>
                <div className="flex items-center gap-3">
                  <span className="w-3.5 shrink-0 text-[12px] font-semibold text-ink-tertiary">{i + 1}</span>
                  <Avatar
                    src={member.avatarUrl}
                    name={member.fullName}
                    size={32}
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-primary">{member.fullName}</p>
                    <p className="truncate text-[11px] text-ink-tertiary">{member.roleTitle ?? "Учасник"}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-purple-soft">{count}</span>
                </div>
              </ProfilePreviewCard>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
