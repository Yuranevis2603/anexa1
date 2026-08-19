import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getTopMatch } from "@/lib/match";
import FeedView from "@/components/feed/FeedView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);
  const topMatch = profile ? await getTopMatch(supabase, profile) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <FeedView userId={user.id} profile={profile} topMatch={topMatch} />
    </div>
  );
}
