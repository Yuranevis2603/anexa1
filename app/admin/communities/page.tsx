import { createClient } from "@/lib/supabase/server";
import { getAdminCommunities } from "@/lib/admin";
import AdminCommunitiesTable from "@/components/admin/AdminCommunitiesTable";

export const dynamic = "force-dynamic";

export default async function AdminCommunitiesPage() {
  const supabase = createClient();
  const communities = await getAdminCommunities(supabase);

  return <AdminCommunitiesTable communities={communities} />;
}
