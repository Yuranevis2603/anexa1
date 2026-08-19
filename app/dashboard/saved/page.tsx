import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import FeedView from "@/components/feed/FeedView";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <FeedView userId={user.id} profile={profile} topMatch={null} initialFilter="saved" />
    </div>
  );
}
