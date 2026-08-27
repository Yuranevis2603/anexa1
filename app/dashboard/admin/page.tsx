import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getPendingProfiles } from "@/lib/admin";
import { getOpenReports } from "@/lib/moderation";
import PendingApprovalsView from "@/components/admin/PendingApprovalsView";
import ReportsQueueView from "@/components/admin/ReportsQueueView";

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

  const [pending, reports] = await Promise.all([getPendingProfiles(supabase), getOpenReports(supabase)]);

  return (
    <>
      <PendingApprovalsView initialPending={pending} />
      <ReportsQueueView initialReports={reports} />
    </>
  );
}
