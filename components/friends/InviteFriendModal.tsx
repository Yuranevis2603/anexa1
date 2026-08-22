"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { requestConnection } from "@/lib/connections";
import { useToast } from "@/components/ui/ToastProvider";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import Avatar from "@/components/ui/Avatar";

type SearchResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_title: string | null;
  company: string | null;
};

export default function InviteFriendModal({
  userId,
  excludeIds,
  onClose,
}: {
  userId: string;
  excludeIds: Set<string>;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role_title, company")
      .ilike("full_name", `%${term}%`)
      .neq("id", userId)
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("friend search failed:", error.message);
          setResults([]);
        } else {
          setResults((data ?? []).filter((p) => !excludeIds.has(p.id)));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, userId, excludeIds]);

  async function handleInvite(person: SearchResult) {
    if (pendingId) return;
    setPendingId(person.id);
    try {
      const supabase = createClient();
      await requestConnection(supabase, userId, person.id);
      setSentIds((prev) => new Set(prev).add(person.id));
      showToast("success", `Запит на знайомство надіслано ${person.full_name}.`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати запит.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md overflow-hidden rounded-t-2xl border border-border-subtle bg-base-card p-6 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-ink-primary">Запросити друга</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2">
          <Search size={16} className="shrink-0 text-ink-tertiary" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ім'я учасника..."
            className="w-full min-w-0 bg-transparent text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
          />
        </div>

        <div className="mt-3 flex max-h-80 flex-col gap-1.5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={18} className="animate-spin text-ink-tertiary" />
            </div>
          ) : query.trim().length < 2 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-tertiary">Введіть щонайменше 2 символи.</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-ink-tertiary">Нікого не знайдено.</p>
          ) : (
            results.map((person) => {
              const isSent = sentIds.has(person.id);
              const isPending = pendingId === person.id;
              return (
                <div key={person.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Avatar
                    src={person.avatar_url}
                    name={person.full_name}
                    size={36}
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[12px] font-semibold text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-primary">{person.full_name}</p>
                    {person.role_title || person.company ? (
                      <p className="truncate text-[11.5px] text-ink-tertiary">
                        {[person.role_title, person.company].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInvite(person)}
                    disabled={isPending || isSent}
                    aria-label="Запросити"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grad-purple-blue text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isSent ? (
                      <Check size={14} />
                    ) : (
                      <UserPlus size={14} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
