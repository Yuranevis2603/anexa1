import { createClient } from "@/lib/supabase/server";
import { getAdminLevels } from "@/lib/admin";
import AdminLevelsSettings from "@/components/admin/AdminLevelsSettings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const levels = await getAdminLevels(supabase);

  return <AdminLevelsSettings initialLevels={levels} />;
}
