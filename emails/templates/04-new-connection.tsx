import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import PersonRow from "../components/PersonRow";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Mirrors the in-app
 * connection_request notification copy ("Запит на знайомство від
 * {actor}", lib/notifications.ts describeNotification()). Sample content
 * below. */
export default function NewConnectionEmail() {
  const requesterName = "Максим Дорошенко";

  return (
    <EmailLayout preview={`Запит на знайомство від ${requesterName}`} showManagePreferences>
      <Card>
        <PersonRow name={requesterName} subtitle="Product Manager · Nova Labs" />
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Запит на знайомство
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          {requesterName} хоче з вами познайомитись в ANEXA.
        </Text>
        <Button href={`${siteUrl}/dashboard/friends?tab=requests`}>Переглянути запит</Button>
      </Card>
    </EmailLayout>
  );
}
