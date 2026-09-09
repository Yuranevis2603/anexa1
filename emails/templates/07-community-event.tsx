import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Sample event card using the real
 * `events` table shape (title, description, location, event_date) —
 * mirrors event_registration/event_reminder in-app notification copy. */
export default function CommunityEventEmail() {
  return (
    <EmailLayout preview="Нагадування: подія за 2 години" showManagePreferences>
      <Card>
        <Text style={{ color: colors.gold, fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", margin: "0 0 8px", fontFamily }}>
          НАГАДУВАННЯ ПРО ПОДІЮ
        </Text>
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Founders Breakfast: обмін досвідом
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 8px", fontFamily }}>
          Закрита зустріч засновників за сніданком — короткі презентації та нетворкінг.
        </Text>
        <Text style={{ color: colors.inkTertiary, fontSize: "13px", lineHeight: "20px", margin: "0 0 28px", fontFamily }}>
          Сьогодні, 10:00 · Kyiv Business Hub
        </Text>
        <Button href={`${siteUrl}/dashboard/events`}>Деталі події</Button>
      </Card>
    </EmailLayout>
  );
}
