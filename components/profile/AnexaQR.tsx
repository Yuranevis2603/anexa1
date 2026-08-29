"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

let gradientCounter = 0;

/** Modules of quiet zone around the code — scanners rely on this margin to
 * find the code's edges; without it decoding gets unreliable or fails
 * outright (verified with zbar/OpenCV during development). */
const QUIET_ZONE = 4;

/**
 * Branded QR code — gradient dot modules, rounded corner "eyes", optional
 * centered logo, on a light card (own background + quiet zone) so it reads
 * as a normal dark-on-light code to scanners regardless of what surface
 * it's placed on. An inverted light-on-dark version looked closer to the
 * app's own dark UI but failed to decode in testing (zbar and OpenCV both
 * missed it, even with a correct quiet zone) — this light card is the
 * deliberate trade-off for a code that actually scans.
 */
export default function AnexaQR({
  value,
  size = 160,
  logo = true,
  className,
}: {
  value: string;
  size?: number;
  logo?: boolean;
  className?: string;
}) {
  // One stable id per mounted instance — SVG gradient ids must be unique on
  // the page (two QR codes sharing an id would both take whichever def the
  // browser resolves last).
  const gradientId = useMemo(() => `anexa-qr-gradient-${++gradientCounter}`, []);

  const { count, dots, eyePositions, logoBox } = useMemo(() => {
    const qr = qrcode(0, "H");
    qr.addData(value || " ");
    qr.make();
    const moduleCount = qr.getModuleCount();

    const isEye = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= moduleCount - 7) || (r >= moduleCount - 7 && c < 7);

    // Blank square reserved for the center logo — kept well inside H-level
    // error correction's recoverable budget even combined with normal
    // print/scan noise.
    const logoModules = logo && moduleCount >= 21 ? Math.floor(moduleCount * 0.22) : 0;
    const logoStart = Math.floor((moduleCount - logoModules) / 2);
    const isLogoArea = (r: number, c: number) =>
      logoModules > 0 && r >= logoStart && r < logoStart + logoModules && c >= logoStart && c < logoStart + logoModules;

    const dotList: { x: number; y: number }[] = [];
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (!qr.isDark(r, c) || isEye(r, c) || isLogoArea(r, c)) continue;
        dotList.push({ x: c, y: r });
      }
    }

    return {
      count: moduleCount,
      dots: dotList,
      eyePositions: [
        { x: 0, y: 0 },
        { x: moduleCount - 7, y: 0 },
        { x: 0, y: moduleCount - 7 },
      ],
      logoBox: logoModules > 0 ? { start: logoStart, size: logoModules } : null,
    };
  }, [value, logo]);

  const outer = count + QUIET_ZONE * 2;

  return (
    <svg
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${outer} ${outer}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="QR-код"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#4E8CFF" />
        </linearGradient>
      </defs>
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={outer} height={outer} rx={QUIET_ZONE * 1.2} fill="#F5F5F7" />
      {dots.map((d, i) => (
        <rect key={i} x={d.x + 0.12} y={d.y + 0.12} width={0.76} height={0.76} rx={0.22} fill={`url(#${gradientId})`} />
      ))}
      {eyePositions.map((e, i) => (
        <g key={i}>
          <rect
            x={e.x + 0.4}
            y={e.y + 0.4}
            width={6.2}
            height={6.2}
            rx={1.7}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={1.3}
          />
          <rect x={e.x + 2.15} y={e.y + 2.15} width={2.7} height={2.7} rx={0.9} fill={`url(#${gradientId})`} />
        </g>
      ))}
      {logoBox ? (
        <>
          <rect
            x={logoBox.start - 0.3}
            y={logoBox.start - 0.3}
            width={logoBox.size + 0.6}
            height={logoBox.size + 0.6}
            rx={logoBox.size * 0.18}
            fill="#F5F5F7"
          />
          <image
            href="/anexa-logo.png"
            x={logoBox.start + logoBox.size * 0.08}
            y={logoBox.start + logoBox.size * 0.08}
            width={logoBox.size * 0.84}
            height={logoBox.size * 0.84}
            preserveAspectRatio="xMidYMid meet"
          />
        </>
      ) : null}
    </svg>
  );
}
