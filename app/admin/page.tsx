import { createClient } from "@/lib/supabase/server";
import { getAdminOverviewStats } from "@/lib/admin";
import AdminOverview from "@/components/admin/AdminOverview";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = createClient();
  const stats = await getAdminOverviewStats(supabase);

  return <AdminOverview stats={stats} />;
}
