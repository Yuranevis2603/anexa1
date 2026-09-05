"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Radio, Video } from "lucide-react";
import { endLivestream, pingLivestream, type Livestream } from "@/lib/livestreams";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import Avatar from "@/components/ui/Avatar";
import LivestreamChat, { type MemberDirectory } from "./LivestreamChat";
import PreLiveModal from "./PreLiveModal";

// @daily-co/daily-js is sizable and only needed once a stream is actually
// live/being watched, not on every community page load — same reasoning
// InCallView already applies to CallStage.
const LiveStage = dynamic(() => import("@/components/calls/LiveStage"), { ssr: false });

/** Well under end_stale_livestreams' 2-minute cutoff so a normal viewer
 * (whose tab may throttle timers in the background) never gets flagged. */
const HEARTBEAT_INTERVAL_MS = 45_000;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LivestreamPanel({
  userId,
  communityId,
  canHost,
  active,
  onActiveChange,
  initialPast,
  memberDirectory,
}: {
  userId: string;
  communityId: string;
  /** Owner, Admin, or Moderator — matches community_livestreams' insert RLS
   * (is_community_staff). Also who can end a stream they didn't start. */
  canHost: boolean;
  /** Lifted to the community page so the Feed tab's live banner and this
   * tab always agree on whether a stream is running. */
  active: Livestream | null;
  onActiveChange: (next: Livestream | null) => void;
  initialPast: Livestream[];
  /** For resolving chat message senders without an extra query per incoming
   * realtime message — every sender is, by RLS, a member of this community. */
  memberDirectory: MemberDirectory;
}) {
  const { showToast } = useToast();
  const [past, setPast] = useState(initialPast);
  const [preLiveOpen, setPreLiveOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [devices, setDevices] = useState<{ cameraDeviceId?: string; micDeviceId?: string }>({});
  const [viewerCount, setViewerCount] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const isHost = active?.hostId === userId;
  const myName = memberDirectory.get(userId)?.name ?? "Учасник ANEXA";

  // Keep the DB's last_heartbeat_at fresh while this browser is the one
  // hosting the stream, so a stale-cleanup pass elsewhere never treats a
  // genuinely live session as abandoned.
  useEffect(() => {
    if (!active || !isHost) return;
    const supabase = createClient();
    const id = setInterval(() => {
      pingLivestream(supabase, active.id);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, isHost]);

  // "Ефір у цифрах" duration ticker — host view only.
  useEffect(() => {
    if (!active || !isHost) return;
    const startedAt = new Date(active.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, isHost]);

  useEffect(() => {
    setPeakViewers((peak) => Math.max(peak, viewerCount));
  }, [viewerCount]);

  function handleStarted(stream: Livestream, chosenDevices: { cameraDeviceId?: string; micDeviceId?: string }) {
    setDevices(chosenDevices);
    setViewerCount(0);
    setPeakViewers(0);
    setMessageCount(0);
    onActiveChange(stream);
    setPreLiveOpen(false);
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="glass overflow-hidden rounded-2xl border border-border-subtle">
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger">
                    <Radio size={11} />
                    НАЖИВО
                  </span>
                  <p className="text-[13.5px] font-medium text-ink-primary">{active.title}</p>
                  {isHost ? <span className="font-mono text-[11.5px] text-ink-tertiary">{formatDuration(elapsed)}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
                    <Video size={13} />
                    {viewerCount.toLocaleString("uk-UA")}
                  </span>
                  {isHost || canHost ? (
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
              </div>
              <div className="flex items-center gap-2 px-4 py-2 text-[12px] text-ink-tertiary">
                <Avatar
                  src={active.hostAvatarUrl}
                  name={active.hostName}
                  size={20}
                  className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[9px] font-semibold text-white"
                />
                Веде {active.hostName}
                {active.description ? <span className="truncate">· {active.description}</span> : null}
              </div>
              {active.roomUrl ? (
                <LiveStage
                  role={isHost ? "broadcaster" : "viewer"}
                  roomUrl={active.roomUrl}
                  userId={userId}
                  userName={myName}
                  hostId={active.hostId}
                  cameraDeviceId={isHost ? devices.cameraDeviceId : undefined}
                  micDeviceId={isHost ? devices.micDeviceId : undefined}
                  onParticipantCountChange={setViewerCount}
                />
              ) : null}
            </div>

            {isHost ? (
              <div className="glass rounded-2xl border border-border-subtle p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary">Ефір у цифрах</p>
                <div className="grid grid-cols-4 gap-2 text-center sm:text-left">
                  <div>
                    <p className="font-display text-[19px] font-semibold text-ink-primary">{viewerCount}</p>
                    <p className="text-[11px] text-ink-tertiary">Дивляться</p>
                  </div>
                  <div>
                    <p className="font-display text-[19px] font-semibold text-ink-primary">{peakViewers}</p>
                    <p className="text-[11px] text-ink-tertiary">Пік</p>
                  </div>
                  <div>
                    <p className="font-display text-[19px] font-semibold text-purple-soft">{messageCount}</p>
                    <p className="text-[11px] text-ink-tertiary">Повідомлень</p>
                  </div>
                  <div>
                    <p className="font-display text-[19px] font-semibold text-success">{formatDuration(elapsed)}</p>
                    <p className="text-[11px] text-ink-tertiary">Тривалість</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <LivestreamChat
            livestreamId={active.id}
            userId={userId}
            memberDirectory={memberDirectory}
            onMessageCountChange={setMessageCount}
          />
        </div>
      ) : (
        <div className="glass rounded-2xl border border-border-subtle p-6 text-center">
          <Video size={22} className="mx-auto text-ink-tertiary" />
          <p className="mt-2 text-[13px] text-ink-tertiary">Зараз немає прямих ефірів.</p>

          {canHost ? (
            <button
              type="button"
              onClick={() => setPreLiveOpen(true)}
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
            >
              <Radio size={14} />
              Розпочати ефір
            </button>
          ) : null}
        </div>
      )}

      {preLiveOpen ? (
        <PreLiveModal
          communityId={communityId}
          memberCount={memberDirectory.size}
          onClose={() => setPreLiveOpen(false)}
          onStarted={handleStarted}
        />
      ) : null}

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
