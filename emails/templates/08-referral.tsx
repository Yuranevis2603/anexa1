import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import PersonRow from "../components/PersonRow";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Mirrors the in-app `referral_joined`
 * copy ("{actor} приєднався(лась) за вашим запрошенням") — same
 * gender-neutral phrasing already established in lib/notifications.ts. */
export default function ReferralEmail() {
  const joinedName = "Тарас Кравець";

  return (
    <EmailLayout preview={`${joinedName} приєднався(лась) за вашим запрошенням`} showManagePreferences>
      <Card>
        <PersonRow name={joinedName} />
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Ваше запрошення спрацювало
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 12px", fontFamily }}>
          {joinedName} приєднався(лась) до ANEXA за вашим запрошенням.
        </Text>
        <Text style={{ color: colors.success, fontSize: "14px", fontWeight: 600, margin: "0 0 28px", fontFamily }}>
          +100 AX нараховано на ваш баланс
        </Text>
        <Button href={`${siteUrl}/dashboard/invite`}>Мої запрошення</Button>
      </Card>
    </EmailLayout>
  );
}
