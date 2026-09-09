import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Matches the shape of
 * admin_broadcast_notification(p_title, p_body) in lib/admin.ts:519 — a
 * platform-admin-authored title + body sent to every member. Sample
 * content below. */
export default function AdminBroadcastEmail() {
  const title = "Оновлення платформи: нові можливості спільноти";
  const body =
    "Ми додали нові функції для спільнот ANEXA: розширену адмін-панель, кращу модерацію та оновлений дизайн подій. Деталі — у застосунку.";

  return (
    <EmailLayout preview={title} showManagePreferences>
      <Card>
        <Text style={{ color: colors.blueSoft, fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", margin: "0 0 8px", fontFamily }}>
          ANEXA · ОГОЛОШЕННЯ
        </Text>
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          {title}
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          {body}
        </Text>
        <Button href={siteUrl}>Відкрити ANEXA</Button>
      </Card>
    </EmailLayout>
  );
}
