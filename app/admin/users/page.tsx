import { createClient } from "@/lib/supabase/server";
import { getAdminUsers, type AdminUserStatusFilter } from "@/lib/admin";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

function parseStatus(value: string | string[] | undefined): AdminUserStatusFilter {
  return value === "active" || value === "pending" ? value : "all";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1);
  const usersPage = await getAdminUsers(supabase, {
    search: searchParams.q,
    status: parseStatus(searchParams.status),
    page,
  });

  return <AdminUsersTable usersPage={usersPage} search={searchParams.q ?? ""} status={parseStatus(searchParams.status)} />;
}
