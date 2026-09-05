"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Filter, Loader2, Search, UserCheck, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { searchMembers, type MemberSearchResult } from "@/lib/people";
import { acceptConnection, requestConnection, type ConnectionState } from "@/lib/connections";
import { follow, unfollow } from "@/lib/follows";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useToast } from "@/components/ui/ToastProvider";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";

function connectionLabel(state: ConnectionState): string {
  switch (state.status) {
    case "connected":
      return "Ви друзі";
    case "pending_sent":
      return "Заявку надіслано";
    case "pending_received":
      return "Прийняти заявку";
    default:
      return "Додати в друзі";
  }
}

function MemberCard({ userId, member }: { userId: string; member: MemberSearchResult }) {
  const { showToast } = useToast();
  const [connection, setConnection] = useState(member.connection);
  const [following, setFollowing] = useState(member.following);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [togglingFollow, setTogglingFollow] = useState(false);

  async function handleAddFriend() {
    if (sendingRequest || connection.status === "connected" || connection.status === "pending_sent") return;
    setSendingRequest(true);
    try {
      const supabase = createClient();
      if (connection.status === "pending_received") {
        await acceptConnection(supabase, connection.connectionId);
        setConnection({ status: "connected" });
        showToast("success", `Тепер ви знайомі з ${member.fullName}.`);
      } else {
        await requestConnection(supabase, userId, member.id);
        setConnection({ status: "pending_sent" });
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося виконати дію.");
    } finally {
      setSendingRequest(false);
    }
  }

  async function handleToggleFollow() {
    if (togglingFollow) return;
    setTogglingFollow(true);
    try {
      const supabase = createClient();
      if (following) {
        await unfollow(supabase, userId, member.id);
        setFollowing(false);
      } else {
        await follow(supabase, userId, member.id);
        setFollowing(true);
      }
    } catch (err) {
      showToast("error", "Не вдалося оновити підписку.");
      console.error("toggle follow failed:", err);
    } finally {
      setTogglingFollow(false);
    }
  }

  const addFriendDisabled = sendingRequest || connection.status === "connected" || connection.status === "pending_sent";

  return (
    <div className="glass flex flex-col rounded-2xl border border-border-subtle p-4">
      <div className="flex items-start gap-3">
        <ProfilePreviewCard userId={member.id}>
          <div className="shrink-0">
            <Avatar
              src={member.avatarUrl}
              name={member.fullName}
              size={44}
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white"
            />
          </div>
        </ProfilePreviewCard>

        <div className="min-w-0 flex-1">
          <ProfilePreviewCard userId={member.id}>
            <p className="truncate text-[13.5px] font-medium text-ink-primary hover:underline">{member.fullName}</p>
          </ProfilePreviewCard>
          {member.roleTitle || member.company ? (
            <p className="truncate text-[12px] text-ink-tertiary">
              {[member.roleTitle, member.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {member.location ? <p className="truncate text-[11.5px] text-ink-tertiary">{member.location}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/dashboard/people/${member.id}`}
          className="flex flex-1 items-center justify-center rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-primary transition-colors hover:bg-white/[0.06]"
        >
          Переглянути профіль
        </Link>

        <button
          type="button"
          onClick={handleToggleFollow}
          disabled={togglingFollow}
          aria-label={following ? "Відписатися" : "Підписатися"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-60 ${
            following
              ? "border-border-subtle text-ink-primary hover:bg-white/[0.06]"
              : "border-border-subtle text-ink-tertiary hover:bg-white/[0.06] hover:text-ink-primary"
          }`}
        >
          {togglingFollow ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
        </button>
      </div>

      <button
        type="button"
        onClick={handleAddFriend}
        disabled={addFriendDisabled}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
      >
        {sendingRequest ? (
          <Loader2 size={14} className="animate-spin" />
        ) : connection.status === "connected" || connection.status === "pending_sent" ? (
          <Check size={14} />
        ) : (
          <UserPlus size={14} />
        )}
        {connectionLabel(connection)}
      </button>
    </div>
  );
}

export default function FindPeopleView({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    searchMembers(supabase, userId, debouncedQuery)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (!cancelled) showToast("error", "Не вдалося завантажити список учасників.");
        console.error("searchMembers failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, userId]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.location) set.add(r.location);
    });
    return Array.from(set).sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!selectedLocation) return results;
    return results.filter((r) => r.location === selectedLocation);
  }, [results, selectedLocation]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex w-full min-w-0 max-w-xs items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
          <Search size={15} className="shrink-0 text-ink-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ім'я, компанія..."
            className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>

        {locations.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
            >
              <Filter size={14} />
              Локація
              {selectedLocation ? (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-grad-purple-blue px-1 text-[10px] text-white">
                  1
                </span>
              ) : null}
            </button>

            {filterOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                <div className="absolute left-0 top-11 z-20 w-56 overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
                  <div className="max-h-72 overflow-y-auto p-2">
                    {locations.map((location) => (
                      <label
                        key={location}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-ink-primary transition-colors hover:bg-white/[0.05]"
                      >
                        <input
                          type="radio"
                          name="find-people-location-filter"
                          checked={selectedLocation === location}
                          onChange={() => setSelectedLocation(location === selectedLocation ? null : location)}
                          className="h-3.5 w-3.5 shrink-0 accent-purple"
                        />
                        <span className="truncate">{location}</span>
                      </label>
                    ))}
                  </div>
                  {selectedLocation ? (
                    <div className="border-t border-border-subtle p-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLocation(null)}
                        className="w-full rounded-lg px-3 py-2 text-center text-[12.5px] font-medium text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                      >
                        Скинути
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-ink-tertiary" />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-6">
            <p className="text-[13px] text-ink-tertiary">Нікого не знайдено.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResults.map((member) => (
              <MemberCard key={member.id} userId={userId} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
