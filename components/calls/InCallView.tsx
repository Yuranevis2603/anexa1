"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2, Minimize2, PhoneOff } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";
import { useCall } from "./CallProvider";

// @daily-co/daily-js is a sizable dependency, only ever needed once a call
// is actually active — lazy-load it instead of shipping it in every
// dashboard page's initial bundle (CallProvider, which renders this
// component, is mounted app-wide).
const CallStage = dynamic(() => import("./CallStage"), { ssr: false });

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Custom call surface (CallStage, built on @daily-co/daily-js) inside this
 * component's own chrome — needed because Daily's hosted prebuilt UI has no
 * Ukrainian locale. Defaults to a large centered overlay (a 1:1 call is the
 * primary activity while it's happening); "minimize" collapses it to a
 * small bottom-right pill so the call survives navigating to other
 * dashboard pages, since CallProvider is mounted at the DashboardShell
 * level, not inside ChatThread. */
export default function InCallView() {
  const { call, peer, entry, minimized, setMinimized, hangUp } = useCall();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!call?.answeredAt) return;
    const startedAt = new Date(call.answeredAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [call?.answeredAt]);

  if (!call || !peer || !entry) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[105] flex items-center gap-2.5 rounded-full border border-border-subtle bg-base-card/95 py-2 pl-2 pr-3 shadow-lg backdrop-blur">
        <Avatar
          src={peer.avatarUrl}
          name={peer.fullName}
          size={32}
          className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[11px] font-semibold text-white"
        />
        <span className="text-[12.5px] font-medium text-ink-primary">{formatElapsed(elapsed)}</span>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Розгорнути дзвінок"
          className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
        >
          <Maximize2 size={15} />
        </button>
        <button
          type="button"
          onClick={hangUp}
          aria-label="Завершити дзвінок"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-danger text-white transition-opacity hover:opacity-90"
        >
          <PhoneOff size={13} />
        </button>
      </div>
    );
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 p-4">
        <div className="flex h-[80vh] w-[85vw] max-w-4xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-base-card">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Avatar
                src={peer.avatarUrl}
                name={peer.fullName}
                size={28}
                className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[10.5px] font-semibold text-white"
              />
              <div>
                <p className="text-[13px] font-medium text-ink-primary">{peer.fullName}</p>
                <p className="text-[11px] text-ink-tertiary">{formatElapsed(elapsed)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                aria-label="Згорнути"
                className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                onClick={hangUp}
                aria-label="Завершити дзвінок"
                className="flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
              >
                <PhoneOff size={14} />
                Завершити
              </button>
            </div>
          </div>
          <CallStage kind={call.kind} roomUrl={entry.roomUrl} token={entry.token} peer={peer} />
        </div>
      </div>
    </ModalPortal>
  );
}
