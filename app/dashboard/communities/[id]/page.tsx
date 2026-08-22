import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunity, getCommunityMembers } from "@/lib/communities";
import { getEvents } from "@/lib/events";
import { getCommunityFeed, getUserLikes, getUserSaves } from "@/lib/feed";
import { getActiveLivestream, getPastLivestreams } from "@/lib/livestreams";
import CommunityDetailView from "@/components/communities/CommunityDetailView";

export const dynamic = "force-dynamic";

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const community = await getCommunity(supabase, params.id, user.id);

  if (!community) {
    notFound();
  }

  const [events, posts, members, activeLivestream, pastLivestreams] = await Promise.all([
    getEvents(supabase, user.id, community.id),
    getCommunityFeed(supabase, community.id),
    getCommunityMembers(supabase, community.id, community.createdBy),
    getActiveLivestream(supabase, community.id),
    getPastLivestreams(supabase, community.id),
  ]);

  const postIds = posts.map((p) => p.id);
  const [likedIds, savedIds] = await Promise.all([
    getUserLikes(supabase, user.id, postIds),
    getUserSaves(supabase, user.id, postIds),
  ]);

  return (
    <CommunityDetailView
      userId={user.id}
      initialCommunity={community}
      initialEvents={events}
      initialPosts={posts}
      initialLikedIds={Array.from(likedIds)}
      initialSavedIds={Array.from(savedIds)}
      initialMembers={members}
      initialActiveLivestream={activeLivestream}
      initialPastLivestreams={pastLivestreams}
    />
  );
}
