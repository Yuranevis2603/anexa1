import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getTopMatch } from "@/lib/match";
import FeedView from "@/components/feed/FeedView";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

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
      <DashboardOverview supabase={supabase} userId={user.id} />
      <FeedView userId={user.id} profile={profile} topMatch={topMatch} />
    </div>
  );
}
