import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import PersonRow from "../components/PersonRow";
import { colors, fontFamily, siteUrl } from "../components/tokens";

/** RESERVE — not wired to any sender. Mirrors the in-app `message`
 * notification copy ("Нове повідомлення від {actor}"). Sample content
 * below. */
export default function NewMessageEmail() {
  const senderName = "Ірина Пасічник";
  const preview = "Привіт! Дивилась твій профіль — думаю, нам варто...";

  return (
    <EmailLayout preview={`Нове повідомлення від ${senderName}`} showManagePreferences>
      <Card>
        <PersonRow name={senderName} />
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Нове повідомлення
        </Heading>
        <Text
          style={{
            color: colors.inkSecondary,
            fontSize: "14px",
            lineHeight: "22px",
            margin: "0 0 28px",
            fontFamily,
            fontStyle: "italic",
          }}
        >
          «{preview}»
        </Text>
        <Button href={`${siteUrl}/dashboard/messages`}>Відповісти</Button>
      </Card>
    </EmailLayout>
  );
}
