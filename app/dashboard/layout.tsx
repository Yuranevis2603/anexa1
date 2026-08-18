import DashboardShell from "@/components/layout/DashboardShell";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";

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

  return (
    <DashboardShell
      userName={profile?.full_name}
      userRole={
        [profile?.role_title, profile?.company].filter(Boolean).join(" · ") ||
        undefined
      }
      avatarUrl={profile?.avatar_url ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
