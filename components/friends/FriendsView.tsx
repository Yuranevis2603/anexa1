"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, Search, UserPlus } from "lucide-react";
import type { FriendListItem, IncomingConnectionRequest } from "@/lib/connections";
import type { MatchCandidate } from "@/lib/match";
import { useOnlineUsers } from "@/lib/presence";
import ConnectionRequestsView from "@/components/connections/ConnectionRequestsView";
import FriendCard from "./FriendCard";
import RecommendationCard from "./RecommendationCard";
import InviteFriendModal from "./InviteFriendModal";

type Tab = "friends" | "requests" | "recommendations";

export default function FriendsView({
  userId,
  initialFriends,
  initialRequests,
  initialRecommendations,
}: {
  userId: string;
  initialFriends: FriendListItem[];
  initialRequests: IncomingConnectionRequest[];
  initialRecommendations: MatchCandidate[];
}) {
  const [friends, setFriends] = useState(initialFriends);
  const [requests, setRequests] = useState(initialRequests);
  const [recommendations, setRecommendations] = useState(initialRecommendations);

  // Keeps this view in sync after a server refresh (e.g. accepting a
  // request in the "Запити" tab bumps the friends list via router.refresh()).
  useEffect(() => setFriends(initialFriends), [initialFriends]);
  useEffect(() => setRequests(initialRequests), [initialRequests]);
  useEffect(() => setRecommendations(initialRecommendations), [initialRecommendations]);

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "requests" ? "requests" : "friends");
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const onlineUsers = useOnlineUsers();

  const allCompanies = useMemo(() => {
    const set = new Set<string>();
    friends.forEach((f) => {
      if (f.company) set.add(f.company);
    });
    return Array.from(set).sort();
  }, [friends]);

  const activeFilterCount = (selectedCompany ? 1 : 0) + (onlineOnly ? 1 : 0);

  function resetFilters() {
    setSelectedCompany(null);
    setOnlineOnly(false);
  }

  const filteredFriends = useMemo(() => {
    const term = query.trim().toLowerCase();
    return friends.filter((f) => {
      if (selectedCompany && f.company !== selectedCompany) return false;
      if (onlineOnly && !onlineUsers.has(f.friendId)) return false;
      if (!term) return true;
      const haystack = [f.fullName, f.roleTitle ?? "", f.company ?? "", ...f.tags].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [friends, query, selectedCompany, onlineOnly, onlineUsers]);

  const excludeIds = useMemo(() => new Set(friends.map((f) => f.friendId)), [friends]);

  function handleFriendRemoved(connectionId: string) {
    setFriends((prev) => prev.filter((f) => f.connectionId !== connectionId));
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "friends", label: "Мої друзі", count: friends.length },
    { id: "requests", label: "Запити", count: requests.length },
    { id: "recommendations", label: "Рекомендації", count: recommendations.length },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-primary">Друзі</h1>
          <p className="mt-1 text-[12.5px] text-ink-tertiary">{friends.length} контактів у вашій мережі</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full min-w-0 max-w-[220px] items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 sm:w-56">
            <Search size={15} className="shrink-0 text-ink-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Пошук серед друзів..."
              className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-2 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
            >
              <Filter size={14} />
              Фільтр
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-grad-purple-blue px-1 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>

            {filterOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
                  <div className="max-h-80 overflow-y-auto p-3">
                    <div>
                      <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">
                        Статус
                      </p>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-ink-primary transition-colors hover:bg-white/[0.05]">
                        <input
                          type="checkbox"
                          checked={onlineOnly}
                          onChange={() => setOnlineOnly((v) => !v)}
                          className="h-3.5 w-3.5 rounded border-border-strong accent-purple"
                        />
                        Тільки онлайн
                      </label>
                    </div>

                    {allCompanies.length > 0 ? (
                      <div className="mt-3">
                        <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">
                          Компанія
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {allCompanies.map((company) => (
                            <label
                              key={company}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] text-ink-primary transition-colors hover:bg-white/[0.05]"
                            >
                              <input
                                type="radio"
                                name="friends-company-filter"
                                checked={selectedCompany === company}
                                onChange={() => setSelectedCompany(company === selectedCompany ? null : company)}
                                className="h-3.5 w-3.5 shrink-0 accent-purple"
                              />
                              <span className="truncate">{company}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {activeFilterCount > 0 ? (
                    <div className="border-t border-border-subtle p-2">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="w-full rounded-lg px-3 py-2 text-center text-[12.5px] font-medium text-ink-tertiary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                      >
                        Скинути фільтри
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
          >
            <UserPlus size={14} />
            Запросити
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5 border-b border-border-subtle">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 border-b-2 px-0.5 pb-3 text-[13.5px] font-medium transition-colors ${
              tab === t.id
                ? "border-purple-soft text-ink-primary"
                : "border-transparent text-ink-tertiary hover:text-ink-secondary"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[11px] text-ink-tertiary">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "friends" ? (
          filteredFriends.length === 0 ? (
            <div className="glass rounded-2xl border border-border-subtle p-6">
              <p className="text-[13px] text-ink-tertiary">
                {friends.length === 0 ? "У вас поки немає друзів." : "Нікого не знайдено."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFriends.map((friend) => (
                <FriendCard key={friend.connectionId} userId={userId} friend={friend} onRemoved={handleFriendRemoved} />
              ))}
            </div>
          )
        ) : null}

        {tab === "requests" ? (
          <div className="max-w-2xl">
            <ConnectionRequestsView initialRequests={requests} />
          </div>
        ) : null}

        {tab === "recommendations" ? (
          recommendations.length === 0 ? (
            <div className="glass rounded-2xl border border-border-subtle p-6">
              <p className="text-[13px] text-ink-tertiary">Поки немає рекомендацій — заповніть профіль, щоб отримувати кращі збіги.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {recommendations.map((match) => (
                <RecommendationCard key={match.profile.id} userId={userId} match={match} />
              ))}
            </div>
          )
        ) : null}
      </div>

      {inviteOpen ? (
        <InviteFriendModal userId={userId} excludeIds={excludeIds} onClose={() => setInviteOpen(false)} />
      ) : null}
    </div>
  );
}
