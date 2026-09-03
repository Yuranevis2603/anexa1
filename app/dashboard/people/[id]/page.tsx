import { notFound, redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";
import { getReviews, getProfileStats, getLevels } from "@/lib/gamification";
import { getUserActivity, getUserLikes, getUserSaves } from "@/lib/feed";
import { getFollowCounts } from "@/lib/follows";
import { getViewerRelation } from "@/lib/connections";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const user = await getCachedUser(supabase);

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

  // Same data ProfileView used to fetch client-side after mount (6 separate
  // round trips behind a spinner) — fetched server-side instead, same
  // pattern as communities/[id]/page.tsx's initial* props.
  const [projects, reviews, activity, stats, levels, followCounts] = await Promise.all([
    getProjects(supabase, profile.id),
    getReviews(supabase, profile.id),
    getUserActivity(supabase, profile.id, undefined, user.id),
    getProfileStats(supabase, profile.id),
    getLevels(supabase),
    getFollowCounts(supabase, profile.id),
  ]);

  const activityIds = activity.map((item) => item.id);
  const [likedIds, savedIds, relation] = await Promise.all([
    getUserLikes(supabase, user.id, activityIds),
    getUserSaves(supabase, user.id, activityIds),
    getViewerRelation(supabase, user.id, profile.id),
  ]);

  return (
    <ProfileView
      profile={profile}
      viewerIsOwner={false}
      viewerId={user.id}
      initialProjects={projects}
      initialReviews={reviews}
      initialActivity={activity}
      initialStats={stats}
      initialLevels={levels}
      initialFollowCounts={followCounts}
      initialLikedIds={Array.from(likedIds)}
      initialSavedIds={Array.from(savedIds)}
      initialRelation={relation}
    />
  );
}
