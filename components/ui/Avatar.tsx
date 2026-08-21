"use client";

import { useState } from "react";
import Image from "next/image";
import { initials } from "@/lib/profile";

/**
 * Avatar image with a graceful fallback to initials — not just when there's
 * no avatar_url, but also when next/image fails to load one (a transient
 * optimizer/network hiccup otherwise leaves Next's broken-image + clipped
 * alt-text in place, which reads as "the photo is missing" even though the
 * URL is fine). `className` carries all box styling (size, bg, text size,
 * rounding) exactly as each call site already had it — this component only
 * decides image vs. initials.
 */
export default function Avatar({
  src,
  name,
  size,
  className,
}: {
  src?: string | null;
  name: string;
  /** px hint for next/image's `sizes` attribute — doesn't need to be exact. */
  size: number;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={className}>
      {src && !failed ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
