import { createClient } from "@/lib/supabase/server";
import { getAdminAnalytics } from "@/lib/admin";
import AdminAnalyticsView from "@/components/admin/AdminAnalyticsView";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const analytics = await getAdminAnalytics(supabase);

  return <AdminAnalyticsView analytics={analytics} />;
}
