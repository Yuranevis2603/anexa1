import React from "react";
/**
 * Renders every email template to static, self-contained HTML in
 * emails/dist/. Not part of the Next.js app -- run manually with
 * `npm run emails:build`. Output is gitignored (regenerated on demand,
 * same treatment as .next/).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@react-email/render";

import { SignupConfirmationEmail, ChangeEmailConfirmationEmail } from "./templates/01-email-confirmation";
import PasswordResetEmail from "./templates/02-password-reset";
import InviteEmail from "./templates/03-invite";
import NewConnectionEmail from "./templates/04-new-connection";
import NewMessageEmail from "./templates/05-new-message";
import GeneralNotificationEmail from "./templates/06-notification-general";
import CommunityEventEmail from "./templates/07-community-event";
import ReferralEmail from "./templates/08-referral";
import AdminBroadcastEmail from "./templates/09-admin-broadcast";

const outDir = join(__dirname, "dist");

const templates: { file: string; element: React.ReactElement }[] = [
  { file: "email-confirmation.html", element: <SignupConfirmationEmail /> },
  { file: "email-confirmation--change-email.html", element: <ChangeEmailConfirmationEmail /> },
  { file: "password-reset.html", element: <PasswordResetEmail /> },
  { file: "invite.html", element: <InviteEmail /> },
  { file: "new-connection.html", element: <NewConnectionEmail /> },
  { file: "new-message.html", element: <NewMessageEmail /> },
  { file: "notification-general.html", element: <GeneralNotificationEmail /> },
  { file: "community-event.html", element: <CommunityEventEmail /> },
  { file: "referral.html", element: <ReferralEmail /> },
  { file: "admin-broadcast.html", element: <AdminBroadcastEmail /> },
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const { file, element } of templates) {
    const html = await render(element, { pretty: true });
    writeFileSync(join(outDir, file), html, "utf-8");
    console.log(`wrote emails/dist/${file}`);
  }
  console.log(`\n${templates.length} templates rendered to emails/dist/`);
}

main();
