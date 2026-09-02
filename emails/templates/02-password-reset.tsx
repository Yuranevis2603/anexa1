import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { colors, fontFamily, tagline } from "../components/tokens";

/** Supabase Auth "Reset Password" slot (supabase.auth.resetPasswordForEmail,
 * AuthCard.tsx:211). Uses {{ .ConfirmationURL }} verbatim as the CTA href. */
export default function PasswordResetEmail() {
  return (
    <EmailLayout preview="Скидання пароля ANEXA">
      <Card>
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          Скидання пароля
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          Отримано запит на скидання пароля для вашого акаунта ANEXA. Натисніть кнопку нижче, щоб встановити новий.
        </Text>
        <Button href="{{ .ConfirmationURL }}">Скинути пароль</Button>
        <Text style={{ color: colors.inkTertiary, fontSize: "12px", lineHeight: "18px", margin: "24px 0 0", fontFamily }}>
          Якщо ви не запитували скидання пароля — просто проігноруйте цей лист, ваш акаунт у безпеці.
        </Text>
      </Card>
      <Text
        style={{ color: colors.inkTertiary, fontSize: "12px", lineHeight: "18px", textAlign: "center", margin: "20px 0 0", fontFamily }}
      >
        {tagline}
      </Text>
    </EmailLayout>
  );
}
