import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Viewing your own id here just shows the same profile — no separate
  // "own" branch needed since ProfileView already handles both.
  if (params.id === user.id) {
    redirect("/dashboard/profile");
  }

  const profile = await getProfile(supabase, params.id);

  if (!profile) {
    notFound();
  }

  return <ProfileView profile={profile} viewerIsOwner={false} viewerId={user.id} />;
}
