"use client";

import { useState } from "react";
import { Loader2, Radio, Video } from "lucide-react";
import { endLivestream, startLivestream, type Livestream } from "@/lib/livestreams";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";

export default function LivestreamPanel({
  userId,
  communityId,
  canHost,
  active,
  onActiveChange,
  initialPast,
}: {
  userId: string;
  communityId: string;
  /** Owner or Admin — matches community_livestreams' insert RLS. */
  canHost: boolean;
  /** Lifted to the community page so the Feed tab's live banner and this
   * tab always agree on whether a stream is running. */
  active: Livestream | null;
  onActiveChange: (next: Livestream | null) => void;
  initialPast: Livestream[];
}) {
  const { showToast } = useToast();
  const [past, setPast] = useState(initialPast);
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (starting || !title.trim()) return;
    setStarting(true);
    try {
      const stream = await startLivestream(communityId, title.trim());
      onActiveChange(stream);
      setTitle("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося розпочати ефір.");
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (!active || ending) return;
    setEnding(true);
    try {
      await endLivestream(active.id);
      setPast((prev) => [{ ...active, status: "ended", endedAt: new Date().toISOString() }, ...prev]);
      onActiveChange(null);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося завершити ефір.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div>
      {active ? (
        <div className="glass overflow-hidden rounded-2xl border border-border-subtle">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger">
                <Radio size={11} />
                НАЖИВО
              </span>
              <p className="text-[13.5px] font-medium text-ink-primary">{active.title}</p>
            </div>
            {active.hostId === userId ? (
              <button
                type="button"
                onClick={handleEnd}
                disabled={ending}
                className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[12px] font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
              >
                {ending ? <Loader2 size={13} className="animate-spin" /> : null}
                Завершити ефір
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-[12px] text-ink-tertiary">
            <Avatar
              src={active.hostAvatarUrl}
              name={active.hostName}
              size={20}
              className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[9px] font-semibold text-white"
            />
            Веде {active.hostName}
          </div>
          {active.roomUrl ? (
            <iframe
              src={active.roomUrl}
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              className="aspect-video w-full border-0"
            />
          ) : null}
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
          <Video size={22} className="mx-auto text-ink-tertiary" />
          <p className="mt-2 text-[13px] text-ink-tertiary">Зараз немає прямих ефірів.</p>

          {canHost ? (
            <form onSubmit={handleStart} className="mx-auto mt-4 flex max-w-sm items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Назва ефіру..."
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none"
              />
              <button
                type="submit"
                disabled={starting || !title.trim()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
              >
                {starting ? <Loader2 size={14} className="animate-spin" /> : null}
                Розпочати ефір
              </button>
            </form>
          ) : null}
        </div>
      )}

      {past.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-tertiary">
            Минулі ефіри
          </h3>
          <div className="flex flex-col gap-2">
            {past.map((stream) => (
              <div
                key={stream.id}
                className="glass flex items-center gap-3 rounded-xl border border-border-subtle px-4 py-3"
              >
                <Avatar
                  src={stream.hostAvatarUrl}
                  name={stream.hostName}
                  size={32}
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink-primary">{stream.title}</p>
                  <p className="truncate text-[11.5px] text-ink-tertiary">
                    {stream.hostName} · {new Date(stream.startedAt).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
