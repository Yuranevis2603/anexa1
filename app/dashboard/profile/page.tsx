import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards /dashboard/*, but keep this safe on its own.
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="glass rounded-2xl border border-border-subtle p-6">
          <p className="text-[13.5px] text-ink-secondary">
            Не вдалося завантажити профіль. Спробуйте оновити сторінку.
          </p>
        </div>
      </div>
    );
  }

  return <ProfileView profile={profile} viewerId={user.id} />;
}
