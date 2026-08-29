"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import ModalPortal from "@/components/ui/ModalPortal";
import { useCall } from "./CallProvider";

/** Global "incoming call" modal — can appear from any dashboard page, since
 * CallProvider (and this component) is mounted app-wide, not inside the
 * Messages module. */
export default function IncomingCallModal() {
  const { call, peer, answerCall, hangUp } = useCall();
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
          <p className="mt-1 text-[12.5px] text-ink-tertiary">
            {call.kind === "video" ? "Відеодзвінок" : "Аудіодзвінок"}
          </p>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={hangUp}
              aria-label="Відхилити"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white shadow-lg transition-opacity hover:opacity-90"
            >
              <PhoneOff size={22} />
            </button>
            <button
              type="button"
              onClick={answerCall}
              aria-label="Прийняти"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-lg transition-opacity hover:opacity-90"
            >
              {call.kind === "video" ? <Video size={22} /> : <Phone size={22} />}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
