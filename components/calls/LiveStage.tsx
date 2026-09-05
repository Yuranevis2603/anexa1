"use client";

import { useEffect, useRef, useState } from "react";
import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import {
  Loader2,
  Maximize,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";

type TrackState = { track: MediaStreamTrack | null; on: boolean };
const OFF_TRACK: TrackState = { track: null, on: false };

/** "good" is the silent default — a banner only appears for a state worth
 * interrupting the video for, matching CallStage's weak-network badge. */
type ConnectionState = "good" | "poor" | "reconnecting";

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

function connectionLabel(state: ConnectionState): string {
  switch (state) {
    case "reconnecting":
      return "Відновлюємо з'єднання…";
    case "poor":
      return "Слабке з'єднання";
    default:
      return "";
  }
}

/**
 * Custom "Ефір" video surface built on the same @daily-co/daily-js call
 * object API as CallStage — no Daily UI, no iframe. Unlike CallStage (fixed
 * 1:1), this renders either the local broadcaster's own camera/screen or,
 * for a viewer, the one host among however many silent participants are in
 * the room. Rooms stay public/tokenless (see app/api/daily/rooms/route.ts);
 * the host is identified by matching join-time `userData.appUserId` against
 * `hostId` rather than a server-verified role, the same trust level the
 * previous plain <iframe> already had.
 *
 * Screen sharing reuses Daily's built-in startScreenShare/stopScreenShare —
 * it publishes as separate screenVideo/screenAudio tracks alongside the
 * regular camera track (not a second connection), so camera + mic keep
 * flowing while a screen share is live.
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
  const [screenSharing, setScreenSharing] = useState(false);
  const [hostVideo, setHostVideo] = useState<TrackState>(OFF_TRACK);
  const [hostAudio, setHostAudio] = useState<TrackState>(OFF_TRACK);
  const [hostScreen, setHostScreen] = useState<TrackState>(OFF_TRACK);
  const [viewerMuted, setViewerMuted] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>("good");
  const stageRef = useRef<HTMLDivElement>(null);

  // Daily reports this per-browser, not per-call — safe to read once.
  const [screenShareSupported] = useState(() => {
    try {
      return Daily.supportedBrowser().supportsScreenShare;
    } catch {
      return false;
    }
  });

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
          setHostScreen(readTrack(host.tracks.screenVideo));
          const quality = host.networkQualityState;
          setConnection((prev) => (prev === "reconnecting" ? prev : quality === "bad" ? "poor" : "good"));
        } else {
          setHostVideo(OFF_TRACK);
          setHostAudio(OFF_TRACK);
          setHostScreen(OFF_TRACK);
        }
      }
    }

    function handleNetworkQuality(ev: { threshold: "good" | "low" | "very-low" }) {
      if (role !== "broadcaster") return;
      setConnection((prev) => (prev === "reconnecting" ? prev : ev.threshold === "good" ? "good" : "poor"));
    }

    function handleNetworkConnection(ev: { type: string; event: string }) {
      if (ev.type !== "signaling" && ev.type !== "sfu") return;
      if (ev.event === "interrupted") setConnection("reconnecting");
      else if (ev.event === "connected") setConnection("good");
    }

    call
      .on("joined-meeting", () => {
        setJoined(true);
        sync();
      })
      .on("participant-joined", sync)
      .on("participant-updated", sync)
      .on("participant-left", sync)
      .on("network-quality-change", handleNetworkQuality)
      .on("network-connection", handleNetworkConnection)
      .on("local-screen-share-started", () => setScreenSharing(true))
      .on("local-screen-share-stopped", () => setScreenSharing(false))
      .on("local-screen-share-canceled", () => setScreenSharing(false))
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

  function toggleScreenShare() {
    const call = callRef.current;
    if (!call || !screenShareSupported) return;
    if (screenSharing) {
      call.stopScreenShare();
    } else {
      try {
        call.startScreenShare();
      } catch {
        showToast("error", "Не вдалося розпочати демонстрацію екрана.");
      }
    }
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

  const connectionText = connectionLabel(connection);
  const showPresentation = role === "viewer" && hostScreen.on;
  const mainVideo = role === "broadcaster" ? localVideo : hostVideo;
  const mainAudio = role === "broadcaster" ? null : hostAudio;

  return (
    <div ref={stageRef} className="relative bg-[#0c0d14]">
      <div className="relative aspect-video w-full overflow-hidden">
        {showPresentation ? (
          <>
            {/* Presentation is the dominant surface — never cropped/blurred
                like the cover-fit camera fallback below, since cutting off
                part of a slide is far worse than a bit of letterboxing. */}
            <TrackVideo
              video={hostScreen.track}
              audio={hostAudio.track}
              muted={viewerMuted}
              className="h-full w-full bg-black object-contain"
            />
            {hostVideo.on ? (
              <div className="absolute bottom-3 right-3 h-20 w-32 overflow-hidden rounded-xl border border-white/10 bg-base-card shadow-lg sm:h-24 sm:w-40">
                <TrackVideo video={hostVideo.track} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-ink-primary">
              <ScreenShare size={12} />
              Демонстрація екрана
            </span>
          </>
        ) : mainVideo.on ? (
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

        {role === "broadcaster" && screenSharing ? (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-success">
            <ScreenShare size={12} />
            Ви показуєте екран
          </span>
        ) : null}

        {connectionText ? (
          <span
            role="status"
            aria-live="polite"
            className={`absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium ${
              connection === "reconnecting" ? "text-gold" : "text-gold"
            }`}
          >
            {connection === "reconnecting" ? <Loader2 size={11} className="animate-spin" /> : <WifiOff size={11} />}
            {connectionText}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/[0.06] bg-base-card py-3">
        {role === "broadcaster" ? (
          <>
            <button
              type="button"
              onClick={toggleMic}
              aria-label={localAudioOn ? "Вимкнути мікрофон" : "Увімкнути мікрофон"}
              aria-pressed={!localAudioOn}
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
              aria-pressed={!localVideo.on}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                localVideo.on ? "bg-white/[0.08] text-ink-primary hover:bg-white/[0.14]" : "bg-danger text-white"
              }`}
            >
              {localVideo.on ? <Video size={18} /> : <VideoOff size={18} />}
            </button>
            <button
              type="button"
              onClick={toggleScreenShare}
              disabled={!screenShareSupported}
              aria-label={screenSharing ? "Зупинити демонстрацію екрана" : "Показати екран"}
              aria-pressed={screenSharing}
              title={screenShareSupported ? undefined : "Демонстрація екрана не підтримується у цьому браузері."}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                screenSharing ? "bg-grad-purple-blue text-white" : "bg-white/[0.08] text-ink-primary hover:bg-white/[0.14]"
              }`}
            >
              {screenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setViewerMuted((m) => !m)}
            aria-label={viewerMuted ? "Увімкнути звук" : "Вимкнути звук"}
            aria-pressed={viewerMuted}
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
