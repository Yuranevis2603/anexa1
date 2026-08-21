import DashboardShell from "@/components/layout/DashboardShell";
import ToastProvider from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getTotalUnreadCount } from "@/lib/messages";
import { getIncomingConnectionCount } from "@/lib/connections";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfile(supabase, user.id) : null;
  const unreadMessages = user ? await getTotalUnreadCount(supabase, user.id) : 0;
  const pendingConnections = user ? await getIncomingConnectionCount(supabase, user.id) : 0;

  return (
    <ToastProvider>
      <DashboardShell
        userId={user?.id}
        userName={profile?.full_name}
        userRole={
          [profile?.role_title, profile?.company].filter(Boolean).join(" · ") ||
          undefined
        }
        avatarUrl={profile?.avatar_url ?? undefined}
        initialUnreadMessages={unreadMessages}
        pendingConnections={pendingConnections}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
