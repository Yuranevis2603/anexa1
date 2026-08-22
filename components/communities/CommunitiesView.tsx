"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Community } from "@/lib/communities";
import CommunityCard from "./CommunityCard";

export default function CommunitiesView({
  userId,
  initialCommunities,
}: {
  userId: string;
  initialCommunities: Community[];
}) {
  const [communities, setCommunities] = useState(initialCommunities);
  useEffect(() => setCommunities(initialCommunities), [initialCommunities]);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return communities;
    return communities.filter((c) => c.name.toLowerCase().includes(term));
  }, [communities, query]);

  const myCount = communities.filter((c) => c.isMember).length;

  function handleChanged(communityId: string, isMember: boolean) {
    setCommunities((prev) =>
      prev.map((c) =>
        c.id === communityId
          ? { ...c, isMember, memberCount: c.memberCount + (isMember ? 1 : -1) }
          : c
      )
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-primary">Спільноти</h1>
          <p className="mt-1 text-[12.5px] text-ink-tertiary">
            {communities.length} спільнот, ви в {myCount}
          </p>
        </div>

        <div className="flex w-full min-w-0 max-w-[260px] items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 sm:w-64">
          <Search size={15} className="shrink-0 text-ink-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук спільнот..."
            className="w-full min-w-0 bg-transparent text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-6">
            <p className="text-[13px] text-ink-tertiary">
              {communities.length === 0 ? "Поки немає жодної спільноти." : "Нікого не знайдено."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((community) => (
              <CommunityCard key={community.id} userId={userId} community={community} onChanged={handleChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
