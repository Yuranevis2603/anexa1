import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import ToastProvider from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getTotalUnreadCount } from "@/lib/messages";
import { getIncomingConnectionCount } from "@/lib/connections";
import { getUnreadNotificationCount } from "@/lib/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Four independent reads for the same user — run in parallel instead of
  // one round trip after another, since this layout re-runs on every
  // dashboard navigation.
  const [profile, unreadMessages, pendingConnections, unreadNotifications] = user
    ? await Promise.all([
        getProfile(supabase, user.id),
        getTotalUnreadCount(supabase, user.id),
        getIncomingConnectionCount(supabase, user.id),
        getUnreadNotificationCount(supabase, user.id),
      ])
    : [null, 0, 0, 0];

  // New members are guided through /onboarding before they see any
  // dashboard route — keeps them out of an empty feed right after signup.
  if (user && profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

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
        unreadNotifications={unreadNotifications}
        isPlatformAdmin={profile?.is_platform_admin ?? false}
        hideOnlineStatus={profile?.hide_online_status ?? false}
      >
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
