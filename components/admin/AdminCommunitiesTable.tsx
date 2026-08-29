"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdminCommunity } from "@/lib/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function AdminCommunitiesTable({ communities }: { communities: AdminCommunity[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return communities;
    return communities.filter((c) => c.name.toLowerCase().includes(term) || c.ownerName.toLowerCase().includes(term));
  }, [communities, search]);

  const totalMembers = communities.reduce((s, c) => s + c.memberCount, 0);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Спільноти</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">
        {communities.length} спільнот · {totalMembers.toLocaleString("uk-UA")} учасників сумарно
      </p>

      <div className="glass mt-5 rounded-2xl border border-border-subtle p-3">
        <div className="flex min-w-[220px] max-w-sm items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12.5px]">
          <Search size={14} className="shrink-0 text-ink-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук спільноти або власника..."
            className="w-full bg-transparent text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-left text-[11px] uppercase tracking-wide text-ink-tertiary">
                <th className="px-3 py-2 font-medium">Спільнота</th>
                <th className="px-3 py-2 font-medium">Власник</th>
                <th className="px-3 py-2 font-medium">Учасники</th>
                <th className="px-3 py-2 font-medium">Пости</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Створено</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-[13px] text-ink-tertiary">
                    Нічого не знайдено.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border-subtle last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {c.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.iconUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grad-purple-blue text-[11px] font-semibold text-white">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <p className="truncate text-[13px] font-medium text-ink-primary">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{c.ownerName}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{c.memberCount.toLocaleString("uk-UA")}</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{c.postCount.toLocaleString("uk-UA")}</td>
                    <td className="px-3 py-2.5">
                      {c.archivedAt ? (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-tertiary" /> Архівована
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Активна
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-secondary">{formatDate(c.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <a
                        href={`/dashboard/communities/${c.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
                      >
                        Відкрити
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
