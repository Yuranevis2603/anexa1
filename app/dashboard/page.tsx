import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/profile";
import { getTopMatch } from "@/lib/match";
import FeedView from "@/components/feed/FeedView";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import InstallAppCard from "@/components/dashboard/InstallAppCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const user = await getCachedUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(supabase, user.id);
  const topMatch = profile ? await getTopMatch(supabase, profile) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <InstallAppCard />
      <DashboardOverview supabase={supabase} userId={user.id} />
      <FeedView userId={user.id} profile={profile} topMatch={topMatch} />
    </div>
  );
}
