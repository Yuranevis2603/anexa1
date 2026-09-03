import { redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/profile";
import { getProjects } from "@/lib/projects";
import { getReviews, getProfileStats, getLevels } from "@/lib/gamification";
import { getUserActivity, getUserLikes, getUserSaves } from "@/lib/feed";
import { getFollowCounts } from "@/lib/follows";
import { getAchievements } from "@/lib/achievements";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();

  const user = await getCachedUser(supabase);

  // Middleware already guards /dashboard/*, but keep this safe on its own.
  if (!user) {
    redirect("/login");
  }

  const profile = await getCachedProfile(supabase, user.id);

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
  const [likedIds, savedIds, achievements] = await Promise.all([
    getUserLikes(supabase, user.id, activityIds),
    getUserSaves(supabase, user.id, activityIds),
    getAchievements(supabase, profile.id, profile, stats.level),
  ]);

  return (
    <ProfileView
      profile={profile}
      viewerId={user.id}
      initialProjects={projects}
      initialReviews={reviews}
      initialActivity={activity}
      initialStats={stats}
      initialLevels={levels}
      initialFollowCounts={followCounts}
      initialLikedIds={Array.from(likedIds)}
      initialSavedIds={Array.from(savedIds)}
      initialAchievements={achievements}
    />
  );
}
