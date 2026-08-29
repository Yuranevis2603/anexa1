import { createClient } from "@/lib/supabase/server";
import { getAdminUsers } from "@/lib/admin";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const users = await getAdminUsers(supabase);

  return <AdminUsersTable initialUsers={users} />;
}
