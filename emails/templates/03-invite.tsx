import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import PersonRow from "../components/PersonRow";
import { colors, fontFamily, siteUrl, tagline } from "../components/tokens";

/** RESERVE — not wired to any sender. Today invites are a link/QR the
 * referrer copies and shares themselves (components/invite/InviteFriendView.tsx);
 * this is what an emailed invite could look like if that flow is ever
 * extended to email the invitee directly. Sample content below. */
export default function InviteEmail() {
  const inviterName = "Олена Коваль";
  const inviteLink = `${siteUrl}/register?invite=A1B2C3D4`;

  return (
    <EmailLayout preview={`${inviterName} запрошує вас в ANEXA`}>
      <Card>
        <PersonRow name={inviterName} subtitle="Засновниця · Kovalenko Studio" />
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Вас запросили в ANEXA
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 12px", fontFamily }}>
          {tagline}
        </Text>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          Засновники, інвестори та фрілансери — в одному фокусованому просторі. Приєднуйтесь за запрошенням {inviterName}.
        </Text>
        <Button href={inviteLink}>Приєднатися до ANEXA</Button>
      </Card>
    </EmailLayout>
  );
}
