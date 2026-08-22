"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders `children` into document.body instead of wherever the component
 * tree happens to be. Every modal in this app is `position: fixed`, which
 * normally spans the whole viewport — but `backdrop-filter` (used by the
 * .glass class on nearly every card) creates a new containing block for
 * fixed descendants per spec, so a modal triggered from inside a .glass
 * card gets trapped inside that card's box instead of covering the screen.
 * Portaling to <body> sidesteps that entirely.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
