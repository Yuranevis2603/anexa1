import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Generic wrapper for the simpler
 * notification types that don't need a person/event card of their own
 * (like/comment/follow/review/profile_approved) — sample shown here is
 * `profile_approved`, mirroring its in-app copy. */
export default function GeneralNotificationEmail() {
  return (
    <EmailLayout preview="Ваш профіль підтверджено" showManagePreferences>
      <Card>
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Ваш профіль підтверджено
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          Модератор підтвердив ваш профіль в ANEXA — тепер він видимий іншим учасникам спільноти.
        </Text>
        <Button href={`${siteUrl}/dashboard/profile`}>Переглянути профіль</Button>
      </Card>
    </EmailLayout>
  );
}
