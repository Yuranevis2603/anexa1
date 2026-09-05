"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Radio, Video, Wifi, WifiOff, X } from "lucide-react";
import { startLivestream, type Livestream } from "@/lib/livestreams";
import ModalPortal from "@/components/ui/ModalPortal";

type DeviceOption = { deviceId: string; label: string };

/** getUserMedia's DOMException.name values, mapped to plain-language Ukrainian
 * — a speaker about to go live should never see "NotReadableError". */
function describeMediaError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Доступ до камери й мікрофона заборонено. Дозвольте доступ у налаштуваннях браузера і спробуйте ще раз.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Камеру або мікрофон не знайдено. Перевірте, чи підключено пристрій.";
    case "NotReadableError":
    case "TrackStartError":
      return "Камера або мікрофон вже використовуються іншим застосунком.";
    default:
      return "Немає доступу до камери або мікрофона. Можна все одно почати ефір — доступ запитається ще раз.";
  }
}

export default function PreLiveModal({
  communityId,
  memberCount,
  onClose,
  onStarted,
}: {
  communityId: string;
  memberCount: number;
  onClose: () => void;
  onStarted: (stream: Livestream, devices: { cameraDeviceId?: string; micDeviceId?: string }) => void;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [online, setOnline] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  function stopPreview() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  /** Quick isolated getUserMedia probe just to know whether one specific
   * device works — used only to fill in the Камера/Мікрофон checklist when
   * the combined request below fails, never kept open. */
  async function probeDevice(constraints: MediaStreamConstraints): Promise<boolean> {
    try {
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      s.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async function openPreview(constraints: MediaStreamConstraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stopPreview();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPreviewReady(true);
      setPreviewError(null);
      setCameraOk(stream.getVideoTracks().length > 0);
      setMicOk(stream.getAudioTracks().length > 0);

      const all = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        all.filter((d) => d.kind === "videoinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Камера ${i + 1}` }))
      );
      setMics(
        all.filter((d) => d.kind === "audioinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Мікрофон ${i + 1}` }))
      );
      const videoTrackId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      const audioTrackId = stream.getAudioTracks()[0]?.getSettings().deviceId;
      if (videoTrackId) setCameraId(videoTrackId);
      if (audioTrackId) setMicId(audioTrackId);
    } catch (err) {
      setPreviewReady(false);
      setPreviewError(describeMediaError(err));
      const [cam, mic] = await Promise.all([
        probeDevice({ video: constraints.video ?? true, audio: false }),
        probeDevice({ video: false, audio: constraints.audio ?? true }),
      ]);
      setCameraOk(cam);
      setMicOk(mic);
    }
  }

  useEffect(() => {
    openPreview({ video: true, audio: true });
    return () => stopPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCameraChange(deviceId: string) {
    setCameraId(deviceId);
    openPreview({ video: { deviceId: { exact: deviceId } }, audio: micId ? { deviceId: { exact: micId } } : true });
  }

  function handleMicChange(deviceId: string) {
    setMicId(deviceId);
    openPreview({ video: cameraId ? { deviceId: { exact: cameraId } } : true, audio: { deviceId: { exact: deviceId } } });
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (starting || !title.trim()) return;
    setStarting(true);
    setError(null);
    try {
      const stream = await startLivestream(communityId, title.trim(), description.trim());
      stopPreview();
      onStarted(stream, { cameraDeviceId: cameraId || undefined, micDeviceId: micId || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося розпочати ефір.");
      setStarting(false);
    }
  }

  function handleClose() {
    stopPreview();
    onClose();
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4">
        <div className="glass max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border-subtle bg-base-card sm:rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <Radio size={16} />
              </span>
              <p className="font-display text-[15px] font-semibold text-ink-primary">Новий ефір</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Закрити"
              className="rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleStart} className="flex flex-col gap-4 p-5">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-border-subtle bg-[#0c0d14]">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              {!previewReady && previewError ? (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-[12px] text-ink-tertiary">
                  {previewError}
                </div>
              ) : !previewReady ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-ink-tertiary" />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
              <span className={`flex items-center gap-1.5 ${cameraOk ? "text-success" : cameraOk === false ? "text-danger" : "text-ink-tertiary"}`}>
                {cameraOk ? <Check size={13} /> : cameraOk === false ? <X size={13} /> : <Loader2 size={13} className="animate-spin" />}
                Камера
              </span>
              <span className={`flex items-center gap-1.5 ${micOk ? "text-success" : micOk === false ? "text-danger" : "text-ink-tertiary"}`}>
                {micOk ? <Check size={13} /> : micOk === false ? <X size={13} /> : <Loader2 size={13} className="animate-spin" />}
                Мікрофон
              </span>
              <span className={`flex items-center gap-1.5 ${online ? "text-success" : "text-danger"}`}>
                {online ? <Wifi size={13} /> : <WifiOff size={13} />}
                Інтернет
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                Назва ефіру
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Напр. Weekly Founder Session"
                className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                Опис <span className="normal-case tracking-normal text-ink-tertiary">— необов&apos;язково</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Про що буде ефір..."
                className="w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13.5px] leading-relaxed text-ink-primary placeholder:text-ink-tertiary focus:border-purple/50 focus:outline-none"
              />
            </div>

            {cameras.length > 0 || mics.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                    <Video size={11} /> Камера
                  </label>
                  <select
                    value={cameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12.5px] text-ink-primary focus:border-purple/50 focus:outline-none"
                  >
                    {cameras.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-tertiary">
                    <Mic size={11} /> Мікрофон
                  </label>
                  <select
                    value={micId}
                    onChange={(e) => handleMicChange(e.target.value)}
                    className="w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[12.5px] text-ink-primary focus:border-purple/50 focus:outline-none"
                  >
                    {mics.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <p className="text-[11.5px] text-ink-tertiary">
              Учасники спільноти ({memberCount.toLocaleString("uk-UA")}) побачать ефір одразу після старту.
            </p>

            {!online ? <p className="text-[12.5px] text-danger">Немає інтернету — ефір не вдасться розпочати.</p> : null}
            {error ? <p className="text-[12.5px] text-danger">{error}</p> : null}

            <div className="mt-1 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={starting || !title.trim() || !online}
                className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {starting ? <Loader2 size={14} className="animate-spin" /> : <Radio size={14} />}
                Почати ефір
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
