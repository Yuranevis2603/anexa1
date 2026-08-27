import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
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

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    redirect("/login");
  }

  return <SettingsView profile={profile} email={user.email ?? ""} />;
}
