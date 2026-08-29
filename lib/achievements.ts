import type { SupabaseClient } from "@supabase/supabase-js";
import { profileCompleteness, type Profile } from "./profile";

export type Achievement = {
  key: string;
  title: string;
  description: string;
  current: number;
  target: number;
  earned: boolean;
};

type AchievementCounts = {
  postsCount: number;
  connectionsCount: number;
  referralsCount: number;
  eventsCount: number;
};

/** One lightweight count query per metric — no new tables, everything is
 * derived from data that already exists elsewhere in the app. */
async function getAchievementCounts(supabase: SupabaseClient, userId: string): Promise<AchievementCounts> {
  const [posts, connections, referrals, events] = await Promise.all([
    supabase.from("activity_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("type", "post"),
    supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted"),
    supabase.from("referral_joins").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    supabase.from("event_registrations").select("event_id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "cancelled"),
  ]);

  for (const [label, res] of [
    ["posts", posts],
    ["connections", connections],
    ["referrals", referrals],
    ["events", events],
  ] as const) {
    if (res.error) console.error(`getAchievementCounts (${label}) failed:`, res.error.message);
  }

  return {
    postsCount: posts.count ?? 0,
    connectionsCount: connections.count ?? 0,
    referralsCount: referrals.count ?? 0,
    eventsCount: events.count ?? 0,
  };
}

/** Pure — turns raw counts + level/profile into the badge list shown on the
 * "Досягнення" tracker. Kept separate from the fetch so the definitions can
 * be tuned without touching any query. */
function buildAchievements(counts: AchievementCounts, profile: Profile, level: number): Achievement[] {
  const completeness = profileCompleteness(profile);

  const defs: Omit<Achievement, "earned">[] = [
    {
      key: "profile_complete",
      title: "Профіль заповнено",
      description: "Заповни всі поля профілю на 100%",
      current: completeness,
      target: 100,
    },
    {
      key: "first_post",
      title: "Перший пост",
      description: "Опублікуй пост у стрічці",
      current: counts.postsCount,
      target: 1,
    },
    {
      key: "author",
      title: "Автор",
      description: "Опублікуй 10 постів",
      current: counts.postsCount,
      target: 10,
    },
    {
      key: "networker",
      title: "Нетворкер",
      description: "Познайомся з 5 учасниками",
      current: counts.connectionsCount,
      target: 5,
    },
    {
      key: "ambassador",
      title: "Амбасадор",
      description: "Запроси 5 друзів у ANEXA",
      current: counts.referralsCount,
      target: 5,
    },
    {
      key: "event_goer",
      title: "Учасник подій",
      description: "Зареєструйся на подію спільноти",
      current: counts.eventsCount,
      target: 1,
    },
    {
      key: "level_5",
      title: "Рівень 5",
      description: "Досягни 5 рівня",
      current: level,
      target: 5,
    },
    {
      key: "level_10",
      title: "Рівень 10",
      description: "Досягни 10 рівня",
      current: level,
      target: 10,
    },
  ];

  return defs.map((d) => ({ ...d, current: Math.min(d.current, d.target), earned: d.current >= d.target }));
}

export async function getAchievements(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  level: number
): Promise<Achievement[]> {
  const counts = await getAchievementCounts(supabase, userId);
  return buildAchievements(counts, profile, level);
}
