import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={profile?.full_name}
          userRole={
            [profile?.role_title, profile?.company].filter(Boolean).join(" · ") ||
            undefined
          }
          avatarUrl={profile?.avatar_url ?? undefined}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
