import { createClient } from "@/lib/supabase/server";
import { getAdminAxStats } from "@/lib/admin";
import AdminEconomy from "@/components/admin/AdminEconomy";

export const dynamic = "force-dynamic";

export default async function AdminEconomyPage() {
  const supabase = createClient();
  const stats = await getAdminAxStats(supabase);

  return <AdminEconomy stats={stats} />;
}
