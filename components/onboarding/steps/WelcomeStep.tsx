"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function WelcomeStep({ onNext, saving }: { onNext: () => void; saving: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        className="drop-shadow-[0_4px_16px_rgba(124,92,255,0.45)]"
        src="/anexa-logo-wordmark.png"
        alt="ANEXA"
        width={132}
        height={40}
        priority
      />

      <h1 className="font-display mt-7 text-[24px] font-semibold leading-tight text-ink-primary sm:text-[27px]">
        Ласкаво просимо до ANEXA
      </h1>

      <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-ink-secondary">
        ANEXA — приватна бізнес-спільнота для знайомств, партнерств, розвитку та створення проєктів. Зробимо
        швидке налаштування, щоб одразу підібрати для вас релевантних людей і спільноти.
      </p>

      <button
        type="button"
        onClick={onNext}
        disabled={saving}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-grad-purple-blue px-6 py-3 text-[14.5px] font-semibold text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        Розпочати
      </button>

      <p className="mt-4 text-[12px] text-ink-tertiary">Це займе приблизно 1–2 хвилини</p>
    </div>
  );
}
