import { createClient } from "@/lib/supabase/server";
import { getAdminPosts } from "@/lib/admin";
import AdminPostsTable from "@/components/admin/AdminPostsTable";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const supabase = createClient();
  const posts = await getAdminPosts(supabase);

  return <AdminPostsTable initialPosts={posts} />;
}
