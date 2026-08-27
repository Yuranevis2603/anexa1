import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getDisabledNotificationTypes } from "@/lib/notifications";
import SettingsView from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, disabledTypes] = await Promise.all([
    getProfile(supabase, user.id),
    getDisabledNotificationTypes(supabase, user.id),
  ]);

  return (
    <SettingsView
      userId={user.id}
      email={user.email ?? ""}
      initialDisabledTypes={disabledTypes}
      initialHideOnlineStatus={profile?.hide_online_status ?? false}
    />
  );
}
