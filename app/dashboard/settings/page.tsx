import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return <SettingsView email={user.email ?? ""} />;
}
