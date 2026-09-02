import React from "react";
import { Section } from "@react-email/components";
import { colors } from "./tokens";

/** The rounded, bordered content card every template's body sits inside —
 * same visual language as .glass cards across the app (base-card
 * background, subtle border), simplified for email (no backdrop-filter,
 * which email clients don't support at all). */
export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: colors.baseCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: "18px",
        padding: "32px",
      }}
    >
      {children}
    </Section>
  );
}
