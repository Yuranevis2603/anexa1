import React from "react";
import { Button as EmailButton } from "@react-email/components";
import { colors, fontFamily, gradient } from "./tokens";

/**
 * Primary CTA — wraps react-email's Button, which already implements the
 * "bulletproof button" technique (padding-based <a>, MSO-only invisible
 * spacer characters via conditional comments) rather than a hand-rolled
 * VML block. `backgroundColor` is declared before the gradient `background`
 * shorthand so Outlook's Word engine (which ignores CSS gradients) falls
 * back to the solid purple instead of rendering no background at all.
 */
export default function Button({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: colors.purple,
        background: gradient,
        color: "#FFFFFF",
        fontFamily,
        fontSize: "14px",
        fontWeight: 600,
        textDecoration: "none",
        textAlign: "center",
        borderRadius: "12px",
        padding: "13px 28px",
        display: "inline-block",
      }}
    >
      {children}
    </EmailButton>
  );
}
