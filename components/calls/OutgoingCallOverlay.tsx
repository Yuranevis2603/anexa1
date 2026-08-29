"use client";

import { PhoneOff } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";
import { useCall } from "./CallProvider";

/** Shown while I'm the caller waiting for the other side to pick up.
 * Auto-cancels after 45s (see CallProvider's RING_TIMEOUT_MS effect) if
 * nobody answers. */
export default function OutgoingCallOverlay() {
  const { call, peer, hangUp } = useCall();
  if (!call || !peer) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4">
        <div className="glass w-full max-w-xs rounded-2xl border border-border-subtle bg-base-card p-6 text-center">
          <Avatar
            src={peer.avatarUrl}
            name={peer.fullName}
            size={72}
            className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[22px] font-semibold text-white"
          />
          <p className="mt-4 text-[15px] font-semibold text-ink-primary">{peer.fullName}</p>
          <p className="mt-1 text-[12.5px] text-ink-tertiary">Дзвонимо…</p>

          <button
            type="button"
            onClick={hangUp}
            aria-label="Скасувати"
            className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white shadow-lg transition-opacity hover:opacity-90"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
