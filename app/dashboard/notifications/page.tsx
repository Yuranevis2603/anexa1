import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications";
import NotificationsView from "@/components/notifications/NotificationsView";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await getNotifications(supabase, user.id, 50);

  return <NotificationsView userId={user.id} initialNotifications={notifications} />;
}
