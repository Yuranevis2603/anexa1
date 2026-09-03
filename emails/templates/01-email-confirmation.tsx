import React from "react";
import { Heading, Text } from "@react-email/components";
import EmailLayout from "../components/EmailLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { colors, fontFamily, tagline } from "../components/tokens";

/**
 * Two Supabase Auth slots share this exact visual, differing only in copy:
 * "Confirm signup" (supabase.auth.signUp, AuthCard.tsx:162) and
 * "Change Email Address" (supabase.auth.updateUser({email}),
 * SettingsView.tsx:103). Both use Supabase's {{ .ConfirmationURL }}
 * template variable verbatim as the CTA href -- left untouched as a plain
 * string, Supabase substitutes it server-side when the real email sends.
 */
function Confirmation({ heading, body, ctaLabel }: { heading: string; body: string; ctaLabel: string }) {
  return (
    <EmailLayout preview={heading}>
      <Card>
        <Heading
          as="h1"
          style={{ color: colors.inkPrimary, fontSize: "20px", lineHeight: "28px", margin: "0 0 12px", fontFamily }}
        >
          {heading}
        </Heading>
        <Text style={{ color: colors.inkSecondary, fontSize: "14px", lineHeight: "22px", margin: "0 0 28px", fontFamily }}>
          {body}
        </Text>
        <Button href="{{ .ConfirmationURL }}">{ctaLabel}</Button>
        <Text style={{ color: colors.inkTertiary, fontSize: "12px", lineHeight: "18px", margin: "24px 0 0", fontFamily }}>
          Якщо це були не ви — просто проігноруйте цей лист.
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

export function SignupConfirmationEmail() {
  return (
    <Confirmation
      heading="Підтвердіть свій email"
      body="Ще один крок — підтвердіть адресу, щоб активувати акаунт в ANEXA."
      ctaLabel="Підтвердити email"
    />
  );
}

export function ChangeEmailConfirmationEmail() {
  return (
    <Confirmation
      heading="Підтвердіть нову адресу"
      body="Ви запросили зміну email для акаунта ANEXA. Підтвердьте нову адресу, щоб завершити зміну."
      ctaLabel="Підтвердити нову адресу"
    />
  );
}

export default SignupConfirmationEmail;
