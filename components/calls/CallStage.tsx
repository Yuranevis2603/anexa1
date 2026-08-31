"use client";

import { useEffect, useRef, useState } from "react";
import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/ToastProvider";
import type { CallKind } from "@/lib/calls";

type Peer = { id: string; fullName: string; avatarUrl: string | null };
type TrackState = { track: MediaStreamTrack | null; on: boolean };

const OFF_TRACK: TrackState = { track: null, on: false };

function readTrack(state: DailyParticipant["tracks"]["video"] | undefined): TrackState {
  return { track: state?.persistentTrack ?? null, on: state?.state === "playable" };
}

/** Binds one or two MediaStreamTracks to a <video> element's srcObject —
 * the DOM-level plumbing custom Daily UIs all need, since daily-js only
 * hands you raw tracks, never a ready-made element. */
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
 * Custom call surface built directly on the @daily-co/daily-js "call
 * object" API (no visual UI from Daily at all) — the only way to get
 * Ukrainian labels, since Daily's own hosted prebuilt UI has no Ukrainian
 * locale (confirmed: 15 supported languages, uk not among them). Renders
 * into InCallView's existing chrome (header/minimize/hang-up already
 * Ukrainian); this component owns just the video/audio surface and the
 * mic/camera controls.
 */
export default function CallStage({
  kind,
  roomUrl,
  token,
  peer,
}: {
  kind: CallKind;
  roomUrl: string;
  token: string;
  peer: Peer;
}) {
  const { showToast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const [joined, setJoined] = useState(false);
  const [localVideo, setLocalVideo] = useState<TrackState>(OFF_TRACK);
  const [localAudioOn, setLocalAudioOn] = useState(true);
  const [remoteVideo, setRemoteVideo] = useState<TrackState>(OFF_TRACK);
  const [remoteAudio, setRemoteAudio] = useState<TrackState>(OFF_TRACK);
  const [remoteWeakNetwork, setRemoteWeakNetwork] = useState(false);

  useEffect(() => {
    if (callRef.current) return; // guards React StrictMode's double-invoke in dev
    const call = Daily.createCallObject();
    callRef.current = call;

    function sync() {
      const all = call.participants();
      const local = all.local;
      if (local) {
        setLocalVideo(readTrack(local.tracks.video));
        setLocalAudioOn(local.tracks.audio.state === "playable");
      }
      const remote = Object.values(all).find((p) => !p.local);
      if (remote) {
        setRemoteVideo(readTrack(remote.tracks.video));
        setRemoteAudio(readTrack(remote.tracks.audio));
        setRemoteWeakNetwork(remote.networkQualityState === "bad" || remote.networkQualityState === "warning");
      } else {
        setRemoteVideo(OFF_TRACK);
        setRemoteAudio(OFF_TRACK);
        setRemoteWeakNetwork(false);
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
      .on("network-quality-change", sync)
      .on("camera-error", () => showToast("error", "Немає доступу до камери або мікрофона."))
      .on("error", () => showToast("error", "Помилка з'єднання дзвінка."));

    call
      .join({ url: roomUrl, token, startVideoOff: kind === "audio", startAudioOff: false })
      .catch(() => showToast("error", "Не вдалося приєднатися до дзвінка."));

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
  }, [roomUrl, token, kind]);

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

  return (
    <div className="relative flex flex-1 flex-col bg-base">
      <div className="relative flex-1 overflow-hidden bg-[#0c0d14]">
        {remoteVideo.on ? (
          <>
            {/* Blurred cover layer fills the box regardless of aspect ratio;
                the sharp layer on top uses object-contain so the full frame
                is always visible — a portrait phone camera inside this wide
                container would otherwise get cropped top/bottom by cover
                alone, cutting off most of the person's face. */}
            <TrackVideo
              video={remoteVideo.track}
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
            />
            <TrackVideo
              video={remoteVideo.track}
              audio={remoteAudio.track}
              className="relative h-full w-full object-contain"
            />
          </>
        ) : (
          <>
            {/* Keep audio flowing even with no video frame to show (audio-only
                calls, or the peer's camera is off) — an invisible-but-mounted
                <video> avoids the browser pausing playback the way display:none
                sometimes does. */}
            <TrackVideo video={null} audio={remoteAudio.track} className="hidden" />
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Avatar
                src={peer.avatarUrl}
                name={peer.fullName}
                size={96}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[28px] font-semibold text-white"
              />
              <p className="text-[13.5px] font-medium text-ink-primary">{peer.fullName}</p>
              {!joined ? (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-tertiary">
                  <Loader2 size={13} className="animate-spin" /> З&apos;єднання...
                </p>
              ) : null}
            </div>
          </>
        )}

        {remoteWeakNetwork ? (
          <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-gold">
            Слабкий сигнал у співрозмовника
          </span>
        ) : null}

        {kind === "video" ? (
          <div className="absolute bottom-3 right-3 h-28 w-20 overflow-hidden rounded-xl border border-white/10 bg-base-card shadow-lg sm:h-36 sm:w-24">
            {localVideo.on ? (
              <TrackVideo video={localVideo.track} muted mirrored className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-base-surface">
                <VideoOff size={18} className="text-ink-tertiary" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-border-subtle bg-base-card py-3.5">
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
        {kind === "video" ? (
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
        ) : null}
      </div>
    </div>
  );
}
