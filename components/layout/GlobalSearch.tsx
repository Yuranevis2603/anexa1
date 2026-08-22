"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Loader2, Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { search, EMPTY_RESULTS, type SearchResults } from "@/lib/search";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { postTypeMeta } from "@/lib/feed";
import Avatar from "@/components/ui/Avatar";

export default function GlobalSearch() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    let cancelled = false;
    setLoading(true);
    search(createClient(), term, 4).then((data) => {
      if (cancelled) return;
      setResults(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const hasResults =
    results.people.length > 0 || results.posts.length > 0 || results.communities.length > 0 || results.projects.length > 0;

  function goToResults() {
    const term = query.trim();
    if (term.length < 2) return;
    setOpen(false);
    router.push(`/dashboard/search?q=${encodeURIComponent(term)}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      goToResults();
    }
  }

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <div className="flex w-full items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
        <Search size={16} className="shrink-0 text-ink-tertiary" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Пошук людей, постів, спільнот, проєктів..."
          className="w-full min-w-0 bg-transparent text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
        />
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 top-11 z-20 w-full min-w-[320px] overflow-hidden rounded-xl border border-border-strong bg-base-card shadow-2xl">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={18} className="animate-spin text-ink-tertiary" />
              </div>
            ) : !hasResults ? (
              <p className="px-4 py-5 text-center text-[12.5px] text-ink-tertiary">Нічого не знайдено.</p>
            ) : (
              <>
                {results.people.length > 0 ? (
                  <div className="border-b border-border-subtle py-1.5">
                    <p className="px-4 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                      Люди
                    </p>
                    {results.people.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard/people/${p.id}`)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <Avatar
                          src={p.avatarUrl}
                          name={p.fullName}
                          size={32}
                          className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink-primary">{p.fullName}</p>
                          {p.roleTitle || p.company ? (
                            <p className="truncate text-[11px] text-ink-tertiary">
                              {[p.roleTitle, p.company].filter(Boolean).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {results.posts.length > 0 ? (
                  <div className="border-b border-border-subtle py-1.5">
                    <p className="px-4 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                      Пости
                    </p>
                    {results.posts.map((post) => {
                      const meta = postTypeMeta(post.postType);
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => handleSelect(`/dashboard/post/${post.id}`)}
                          className="flex w-full items-start gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.05]"
                        >
                          <span className="mt-0.5 shrink-0 text-[15px] leading-none">{meta?.emoji ?? "📝"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-[13px] text-ink-primary">{post.body}</p>
                            <p className="truncate text-[11px] text-ink-tertiary">{post.authorName}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {results.communities.length > 0 ? (
                  <div className="border-b border-border-subtle py-1.5">
                    <p className="px-4 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                      Спільноти
                    </p>
                    {results.communities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelect("/dashboard/communities")}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple/10">
                          <Users size={14} className="text-purple-soft" />
                        </div>
                        <p className="truncate text-[13px] text-ink-primary">{c.name}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {results.projects.length > 0 ? (
                  <div className="py-1.5">
                    <p className="px-4 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                      Проєкти
                    </p>
                    {results.projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard/people/${p.ownerId}`)}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue/10">
                          <FolderKanban size={14} className="text-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-ink-primary">{p.title}</p>
                          <p className="truncate text-[11px] text-ink-tertiary">{p.ownerName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {hasResults ? (
            <button
              type="button"
              onClick={goToResults}
              className="block w-full border-t border-border-subtle px-4 py-2.5 text-center text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.05] hover:text-ink-primary"
            >
              Усі результати за "{query.trim()}"
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
