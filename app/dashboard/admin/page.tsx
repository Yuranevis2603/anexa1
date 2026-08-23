import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getPendingProfiles } from "@/lib/admin";
import PendingApprovalsView from "@/components/admin/PendingApprovalsView";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile?.is_platform_admin) {
    redirect("/dashboard");
  }

  const pending = await getPendingProfiles(supabase);

  return <PendingApprovalsView initialPending={pending} />;
}
