"use client";

import Image from "next/image";

/**
 * A scannable QR code with the ANEXA "A" mark centered on top. Uses the
 * same external QR image service InviteFriendView already relies on, just
 * with ecc=H (30% error-correction tolerance) so the center cutout for the
 * logo doesn't break scannability — the logo is layered on with CSS rather
 * than baked into the image, so no canvas compositing or new dependency.
 */
export default function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const src = value
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&ecc=H&data=${encodeURIComponent(value)}`
    : "";
  const logoSize = Math.round(size * 0.22);

  if (!src) return null;

  return (
    <div className="relative inline-block overflow-hidden rounded-xl" style={{ width: size, height: size }}>
      <img src={src} alt="QR-код" width={size} height={size} />
      <span
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow"
        style={{ width: logoSize + 8, height: logoSize + 8 }}
      >
        <Image src="/anexa-logo.png" alt="" width={logoSize} height={logoSize} className="rounded-md" />
      </span>
    </div>
  );
}
