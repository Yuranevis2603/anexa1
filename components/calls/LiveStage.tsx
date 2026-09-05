"use client";

import { useEffect, useRef, useState } from "react";
import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { Loader2, Maximize, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

type TrackState = { track: MediaStreamTrack | null; on: boolean };
const OFF_TRACK: TrackState = { track: null, on: false };

function readTrack(state: DailyParticipant["tracks"]["video"] | undefined): TrackState {
  return { track: state?.persistentTrack ?? null, on: state?.state === "playable" };
}

/** Binds one or two MediaStreamTracks to a <video> element's srcObject — see
 * components/calls/CallStage.tsx, which this mirrors exactly. */
function TrackVideo({
  video,
  audio,
  muted,
  mirrored,
  className,
}: {
  video: MediaStreamTrack | null;
  audio?: MediaStreamTrack | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tracks = [video, audio].filter((t): t is MediaStreamTrack => Boolean(t));
    el.srcObject = tracks.length > 0 ? new MediaStream(tracks) : null;
  }, [video, audio]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className ?? ""} ${mirrored ? "-scale-x-100" : ""}`}
    />
  );
}

/**
 * Custom "Ефір" video surface built on the same @daily-co/daily-js call
 * object API as CallStage — no Daily UI, no iframe. Unlike CallStage (fixed
 * 1:1), this renders either the local broadcaster's own camera or, for a
 * viewer, the one host among however many silent participants are in the
 * room. Rooms stay public/tokenless (see app/api/daily/rooms/route.ts); the
 * host is identified by matching join-time `userData.appUserId` against
 * `hostId` rather than a server-verified role, the same trust level the
 * previous plain <iframe> already had.
 */
export default function LiveStage({
  role,
  roomUrl,
  userId,
  userName,
  hostId,
  cameraDeviceId,
  micDeviceId,
  onParticipantCountChange,
}: {
  role: "broadcaster" | "viewer";
  roomUrl: string;
  userId: string;
  userName: string;
  hostId: string;
  /** Broadcaster only — device picked in the pre-live setup modal. */
  cameraDeviceId?: string;
  micDeviceId?: string;
  /** Total people in the room right now, excluding the host — i.e. viewers. */
  onParticipantCountChange?: (count: number) => void;
}) {
  const { showToast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const [joined, setJoined] = useState(false);
  const [localVideo, setLocalVideo] = useState<TrackState>(OFF_TRACK);
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [hostVideo, setHostVideo] = useState<TrackState>(OFF_TRACK);
  const [hostAudio, setHostAudio] = useState<TrackState>(OFF_TRACK);
  const [viewerMuted, setViewerMuted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (callRef.current) return; // guards React StrictMode's double-invoke in dev
    const call = Daily.createCallObject();
    callRef.current = call;

    function sync() {
      const all = call.participants();
      const total = Object.keys(all).length;
      onParticipantCountChange?.(Math.max(total - 1, 0));

      const local = all.local;
      if (local) {
        setLocalVideo(readTrack(local.tracks.video));
        setLocalAudioOn(local.tracks.audio.state === "playable");
      }

      if (role === "viewer") {
        const host =
          Object.values(all).find((p) => !p.local && p.userData && (p.userData as { appUserId?: string }).appUserId === hostId) ??
          Object.values(all).find((p) => !p.local);
        if (host) {
          setHostVideo(readTrack(host.tracks.video));
          setHostAudio(readTrack(host.tracks.audio));
        } else {
          setHostVideo(OFF_TRACK);
          setHostAudio(OFF_TRACK);
        }
      }
    }

    call
      .on("joined-meeting", () => {
        setJoined(true);
        sync();
      })
      .on("participant-joined", sync)
      .on("participant-updated", sync)
      .on("participant-left", sync)
      .on("camera-error", () => showToast("error", "Немає доступу до камери або мікрофона."))
      .on("error", () => showToast("error", "Помилка з'єднання з ефіром."));

    call
      .join({
        url: roomUrl,
        userName,
        userData: { appUserId: userId },
        startVideoOff: role === "viewer",
        startAudioOff: role === "viewer",
      })
      .then(() => {
        if (role === "broadcaster" && (cameraDeviceId || micDeviceId)) {
          call.setInputDevicesAsync({ videoDeviceId: cameraDeviceId, audioDeviceId: micDeviceId }).catch(() => undefined);
        }
      })
      .catch(() => showToast("error", "Не вдалося приєднатися до ефіру."));

    return () => {
      call
        .leave()
        .catch(() => undefined)
        .finally(() => {
          call.destroy().catch(() => undefined);
        });
      callRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, role, hostId]);

  function toggleMic() {
    const call = callRef.current;
    if (!call) return;
    const next = !localAudioOn;
    call.setLocalAudio(next);
    setLocalAudioOn(next);
  }

  function toggleCamera() {
    const call = callRef.current;
    if (!call) return;
    const next = !localVideo.on;
    call.setLocalVideo(next);
    setLocalVideo((v) => ({ ...v, on: next }));
  }

  function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen?.().catch(() => undefined);
    }
  }

  const mainVideo = role === "broadcaster" ? localVideo : hostVideo;
  const mainAudio = role === "broadcaster" ? null : hostAudio;

  return (
    <div ref={stageRef} className="relative bg-[#0c0d14]">
      <div className="relative aspect-video w-full overflow-hidden">
        {mainVideo.on ? (
          <TrackVideo
            video={mainVideo.track}
            audio={mainAudio?.track}
            muted={role === "broadcaster" || viewerMuted}
            mirrored={role === "broadcaster"}
            className="h-full w-full object-contain"
          />
        ) : (
          <>
            {role === "viewer" ? <TrackVideo video={null} audio={hostAudio.track} muted={viewerMuted} className="hidden" /> : null}
            <div className="flex h-full flex-col items-center justify-center gap-2 text-ink-tertiary">
              {role === "broadcaster" ? (
                <VideoOff size={26} />
              ) : !joined ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <VideoOff size={26} />
              )}
              <p className="font-mono text-[11px] uppercase tracking-wide">
                {role === "broadcaster" ? "камеру вимкнено" : joined ? "камера доповідача вимкнена" : "з'єднання..."}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-white/[0.06] bg-base-card py-3">
        {role === "broadcaster" ? (
          <>
            <button
              type="button"
              onClick={toggleMic}
              aria-label={localAudioOn ? "Вимкнути мікрофон" : "Увімкнути мікрофон"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                localAudioOn ? "bg-white/[0.08] text-ink-primary hover:bg-white/[0.14]" : "bg-danger text-white"
              }`}
            >
              {localAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              aria-label={localVideo.on ? "Вимкнути камеру" : "Увімкнути камеру"}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                localVideo.on ? "bg-white/[0.08] text-ink-primary hover:bg-white/[0.14]" : "bg-danger text-white"
              }`}
            >
              {localVideo.on ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setViewerMuted((m) => !m)}
            aria-label={viewerMuted ? "Увімкнути звук" : "Вимкнути звук"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-ink-primary transition-colors hover:bg-white/[0.14]"
          >
            {viewerMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="На весь екран"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-ink-primary transition-colors hover:bg-white/[0.14]"
        >
          <Maximize size={15} />
        </button>
      </div>
    </div>
  );
}
