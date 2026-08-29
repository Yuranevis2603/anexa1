import { createClient } from "@/lib/supabase/server";
import { getAdminEventsAndLive } from "@/lib/admin";
import AdminEventsLive from "@/components/admin/AdminEventsLive";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const supabase = createClient();
  const { events, livestreams } = await getAdminEventsAndLive(supabase);

  return <AdminEventsLive events={events} livestreams={livestreams} />;
}
