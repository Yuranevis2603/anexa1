# ANEXA Email Design System

Premium, dark, branded HTML email templates for ANEXA, built with
[React Email](https://react.email) and rendered to static, self-contained
HTML — table-based layout, inline styles, Outlook/Gmail/Apple-Mail-safe.

**This directory is not part of the running platform.** Nothing under
`app/` or `components/` imports anything here, `emails/` is excluded from
the root `tsconfig.json`, and `react-email`/`@react-email/*`/`tsx` are
`devDependencies` only — `npm run build`/`next build`, `npm run dev`, and
`npm run start` are completely unaffected whether this directory exists or
not.

## What's wired vs. what's in reserve

ANEXA sends exactly **3 real emails today**, all through Supabase Auth's
built-in mailer (not custom code) — see `templates/01-email-confirmation.tsx`
and `templates/02-password-reset.tsx`. Every other template in here is
**built and ready, but not connected to any sender** — there is no email
provider, API route, or database trigger wired to send them yet. They exist
as a finished design-system library for whenever that's built.

| Template | Status |
|---|---|
| `01-email-confirmation.tsx` (2 variants: signup + change-email) | **Wired** — paste into Supabase Dashboard |
| `02-password-reset.tsx` | **Wired** — paste into Supabase Dashboard |
| `03-invite.tsx` | Reserve |
| `04-new-connection.tsx` | Reserve |
| `05-new-message.tsx` | Reserve |
| `06-notification-general.tsx` | Reserve |
| `07-community-event.tsx` | Reserve |
| `08-referral.tsx` | Reserve |
| `09-admin-broadcast.tsx` | Reserve |

## Preview locally

```
npm run emails:build
```

Renders every template to `emails/dist/*.html`. Open any file directly in a
browser for an immediate visual check (colors, button, layout). This
sandbox has no access to real cross-client rendering services (Litmus/Email
on Acid) — see "Testing" below for the real verification step.

## Connecting the 3 wired templates (manual, one-time)

There is no Supabase CLI project in this repo (no `supabase/config.toml`)
and no MCP tool available that can push Auth email template HTML
programmatically — Supabase Auth email templates live only in the
project's Dashboard. To activate the branded versions:

1. Run `npm run emails:build` if you haven't already.
2. Open the [Supabase Dashboard](https://supabase.com/dashboard) → your
   ANEXA project → **Authentication → Email Templates**.
3. **Confirm signup**: open `emails/dist/email-confirmation.html`, copy its
   full contents, paste into the template's "Message body" HTML field. Set
   a subject, e.g. `Підтвердіть email — ANEXA`. Save.
4. **Reset Password**: paste `emails/dist/password-reset.html`. Subject
   e.g. `Скидання пароля — ANEXA`. Save.
5. **Change Email Address**: paste
   `emails/dist/email-confirmation--change-email.html`. Subject e.g.
   `Підтвердіть нову адресу — ANEXA`. Save.

Supabase's editor preserves inline styles and the `{{ .ConfirmationURL }}` /
`{{ .NewEmail }}` template tokens verbatim — no extra escaping needed. The
tokens are already the correct ones for each slot (confirmed against
Supabase's documented variable set for these three templates).

## Testing after connecting

The only real cross-client check available is triggering the actual flow:

- Sign up with a throwaway email address (or use a test invite code) → check
  the "Confirm signup" email.
- Use "Forgot password" on the login screen → check the "Reset Password"
  email.
- Change your email in Settings → check the "Change Email Address" email.

Open each received email in at least **Gmail (web + mobile app)**, **Apple
Mail**, and **Outlook** if available — this is a manual step; nothing in
this sandbox can substitute for checking a real inbox in a real client.

## What a future "wire up the other 6" pass would need

Not implemented here — a sketch only. Connection/message/event/referral/admin
emails would need: an email provider (Resend, Postmark, or SES are the
common choices), a small dispatch layer that the existing Postgres trigger
functions in `supabase/schema.sql` (`notify_connection_request`, the
message-insert trigger, `notify_event_registration`, `send_event_reminders()`,
`handle_new_user()`'s referral branch, `admin_broadcast_notification()`)
would call — either via the `pg_net`/`http` extension (not currently
enabled) or a Supabase Edge Function — and that layer must check
`notification_preferences.disabled_types` (already read by
`getDisabledNotificationTypes()` in `lib/notifications.ts`) before sending,
so a user's in-app notification opt-outs also apply to email.

## Files

```
emails/
  README.md                      # this file
  components/
    tokens.ts                    # brand colors/fonts/logo URL, mirrored from tailwind.config.ts
    EmailLayout.tsx               # shared header/footer/dark-mode-safety shell
    Card.tsx                      # rounded content card
    Button.tsx                    # bulletproof gradient CTA button
    PersonRow.tsx                 # avatar-initial + name row for person-centric emails
  templates/
    01-email-confirmation.tsx     # wired
    02-password-reset.tsx         # wired
    03-invite.tsx                 # reserve
    04-new-connection.tsx         # reserve
    05-new-message.tsx            # reserve
    06-notification-general.tsx   # reserve
    07-community-event.tsx        # reserve
    08-referral.tsx               # reserve
    09-admin-broadcast.tsx        # reserve
  build.tsx                      # renders every template to dist/*.html
  dist/                          # gitignored — regenerate with `npm run emails:build`
```
