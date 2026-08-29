import { createClient } from "@/lib/supabase/server";
import { getAdminOverviewStats } from "@/lib/admin";
import AdminBroadcast from "@/components/admin/AdminBroadcast";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const supabase = createClient();
  const stats = await getAdminOverviewStats(supabase);

  return <AdminBroadcast totalUsers={stats.totalUsers} />;
}
