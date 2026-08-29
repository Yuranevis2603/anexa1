import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getPendingProfiles } from "@/lib/admin";
import { getOpenReports } from "@/lib/moderation";
import ToastProvider from "@/components/ui/ToastProvider";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile?.is_platform_admin) {
    redirect("/dashboard");
  }

  const [pending, reports] = await Promise.all([getPendingProfiles(supabase), getOpenReports(supabase)]);

  return (
    <ToastProvider>
      <AdminShell
        fullName={profile.full_name}
        avatarUrl={profile.avatar_url}
        pendingUsers={pending.length}
        openReports={reports.length}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
