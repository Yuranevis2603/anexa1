"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "anexa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Prompts the visitor to install ANEXA as an app (PWA). Chrome/Edge/Android
 * fire `beforeinstallprompt` when the site qualifies (manifest + icons +
 * served over HTTPS — see app/manifest.ts); iOS Safari never fires that
 * event, so it gets manual "Поділитися → На екран Домівки" instructions
 * instead. Hidden once installed or dismissed (remembered per-browser). */
export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    function onInstalled() {
      setInstalled(true);
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private browsing — just hide for this session */
    }
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }

  if (installed || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="glass mb-4 flex items-center gap-3 rounded-2xl border border-border-subtle p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grad-purple-blue text-white shadow-glow-purple">
        <Download size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink-primary">Встановити ANEXA як застосунок</p>
        <p className="text-[11.5px] text-ink-secondary">
          {isIOS ? "Поділитися → На екран «Домівка»" : "Швидкий доступ з екрана, без відкриття браузера"}
        </p>
      </div>
      {!isIOS ? (
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-xl bg-grad-purple-blue px-3.5 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity hover:opacity-90"
        >
          Встановити
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Приховати"
        className="shrink-0 rounded-lg p-1.5 text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-ink-primary"
      >
        <X size={16} />
      </button>
    </div>
  );
}
