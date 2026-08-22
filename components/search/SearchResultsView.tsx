"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { search, type SearchResults } from "@/lib/search";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { postTypeMeta } from "@/lib/feed";
import ProfilePreviewCard from "@/components/profile/ProfilePreviewCard";
import Avatar from "@/components/ui/Avatar";

export default function SearchResultsView({
  initialQuery,
  initialResults,
}: {
  initialQuery: string;
  initialResults: SearchResults;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 350);
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = debouncedQuery.trim();
    router.replace(term ? `/dashboard/search?q=${encodeURIComponent(term)}` : "/dashboard/search", {
      scroll: false,
    });

    if (term.length < 2) {
      setResults({ people: [], posts: [], communities: [], projects: [] });
      return;
    }

    let cancelled = false;
    setLoading(true);
    search(createClient(), term, 20).then((data) => {
      if (cancelled) return;
      setResults(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const total = results.people.length + results.posts.length + results.communities.length + results.projects.length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-xl font-semibold text-ink-primary">Пошук</h1>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2.5">
        <Search size={16} className="shrink-0 text-ink-tertiary" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук людей, постів, спільнот, проєктів..."
          className="w-full min-w-0 bg-transparent text-[14px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
        />
      </div>

      <div className="mt-6">
        {query.trim().length < 2 ? (
          <p className="text-[13px] text-ink-tertiary">Введіть щонайменше 2 символи.</p>
        ) : loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-6">
            <p className="text-[13px] text-ink-tertiary">Нічого не знайдено за «{query.trim()}».</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {results.people.length > 0 ? (
              <section>
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Люди</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {results.people.map((p) => (
                    <ProfilePreviewCard key={p.id} userId={p.id}>
                      <div className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-4">
                        <Avatar
                          src={p.avatarUrl}
                          name={p.fullName}
                          size={40}
                          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-medium text-ink-primary">{p.fullName}</p>
                          {p.roleTitle || p.company ? (
                            <p className="truncate text-[12px] text-ink-tertiary">
                              {[p.roleTitle, p.company].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </ProfilePreviewCard>
                  ))}
                </div>
              </section>
            ) : null}

            {results.posts.length > 0 ? (
              <section>
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Пости</h2>
                <div className="flex flex-col gap-3">
                  {results.posts.map((post) => {
                    const meta = postTypeMeta(post.postType);
                    return (
                      <Link
                        key={post.id}
                        href={`/dashboard/post/${post.id}`}
                        className="glass flex items-start gap-3 rounded-2xl border border-border-subtle p-4 transition-colors hover:bg-white/[0.03]"
                      >
                        <span className="mt-0.5 shrink-0 text-[18px] leading-none">{meta?.emoji ?? "📝"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13.5px] text-ink-primary">{post.body}</p>
                          <p className="mt-1 truncate text-[12px] text-ink-tertiary">{post.authorName}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {results.communities.length > 0 ? (
              <section>
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Спільноти</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {results.communities.map((c) => (
                    <Link
                      key={c.id}
                      href="/dashboard/communities"
                      className="glass flex flex-col items-center gap-2 rounded-2xl border border-border-subtle p-4 text-center transition-colors hover:bg-white/[0.03]"
                    >
                      <Avatar
                        src={c.iconUrl}
                        name={c.name}
                        size={40}
                        className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                      />
                      <p className="truncate text-[12.5px] text-ink-primary">{c.name}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {results.projects.length > 0 ? (
              <section>
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">Проєкти</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {results.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/people/${p.ownerId}`}
                      className="glass flex items-start gap-3 rounded-2xl border border-border-subtle p-4 transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue/10">
                        <FolderKanban size={16} className="text-blue" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink-primary">{p.title}</p>
                        {p.description ? (
                          <p className="line-clamp-1 text-[12px] text-ink-tertiary">{p.description}</p>
                        ) : null}
                        <p className="mt-1 truncate text-[11px] text-ink-tertiary">{p.ownerName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
