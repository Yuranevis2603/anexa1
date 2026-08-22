import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getFriends, getIncomingConnectionRequests } from "@/lib/connections";
import { getMatchRecommendations } from "@/lib/match";
import FriendsView from "@/components/friends/FriendsView";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  const [friends, requests, recommendations] = await Promise.all([
    getFriends(supabase, user.id),
    getIncomingConnectionRequests(supabase, user.id),
    profile ? getMatchRecommendations(supabase, profile, 12) : Promise.resolve([]),
  ]);

  return (
    <FriendsView
      userId={user.id}
      initialFriends={friends}
      initialRequests={requests}
      initialRecommendations={recommendations}
    />
  );
}
