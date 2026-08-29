import { createClient } from "@/lib/supabase/server";
import { getAdminAuditLog } from "@/lib/admin";
import AdminAuditLogView from "@/components/admin/AdminAuditLogView";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  const supabase = createClient();
  const entries = await getAdminAuditLog(supabase);

  return <AdminAuditLogView entries={entries} />;
}
