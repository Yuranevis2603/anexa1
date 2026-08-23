import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunity, getCommunityMembers, getCommunityPostCount, getMemberActivityCounts } from "@/lib/communities";
import { getAuditLog, getBannedMembers, getJoinRequests } from "@/lib/communityAdmin";
import { getEvents } from "@/lib/events";
import { getCommunityFeed, getUserLikes, getUserSaves } from "@/lib/feed";
import { getActiveLivestream, getPastLivestreams } from "@/lib/livestreams";
import { getThreads } from "@/lib/discussions";
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

  const [events, posts, members, activeLivestream, pastLivestreams, threads, postCount, activityCounts] =
    await Promise.all([
      getEvents(supabase, user.id, community.id),
      getCommunityFeed(supabase, community.id, 50, user.id),
      getCommunityMembers(supabase, community.id, community.createdBy),
      getActiveLivestream(supabase, community.id),
      getPastLivestreams(supabase, community.id),
      getThreads(supabase, community.id),
      getCommunityPostCount(supabase, community.id),
      getMemberActivityCounts(supabase, community.id),
    ]);

  const postIds = posts.map((p) => p.id);
  const [likedIds, savedIds] = await Promise.all([
    getUserLikes(supabase, user.id, postIds),
    getUserSaves(supabase, user.id, postIds),
  ]);

  const isOwner = community.createdBy === user.id;
  const myRole = members.find((m) => m.userId === user.id)?.communityRole ?? "member";
  const isAdmin = isOwner || myRole === "admin";
  const isStaff = isAdmin || myRole === "moderator";

  const [joinRequests, banned, auditLog] = await Promise.all([
    isStaff ? getJoinRequests(supabase, community.id) : Promise.resolve([]),
    isAdmin ? getBannedMembers(supabase, community.id) : Promise.resolve([]),
    isAdmin ? getAuditLog(supabase, community.id) : Promise.resolve([]),
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
      initialThreads={threads}
      initialPostCount={postCount}
      initialActivityCounts={Object.fromEntries(activityCounts)}
      initialJoinRequests={joinRequests}
      initialBanned={banned}
      initialAuditLog={auditLog}
    />
  );
}
