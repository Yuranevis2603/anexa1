import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { getAxEarnedFromSource, getLevels, getProfileStats } from "@/lib/gamification";
import { getMyReferrals, getSecondLevelReferralCount, REFERRAL_AX } from "@/lib/invites";
import InviteFriendView from "@/components/invite/InviteFriendView";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, stats, levels, referrals, secondLevelCount, axFromReferrals] = await Promise.all([
    getProfile(supabase, user.id),
    getProfileStats(supabase, user.id),
    getLevels(supabase),
    getMyReferrals(supabase, user.id),
    getSecondLevelReferralCount(supabase, user.id),
    getAxEarnedFromSource(supabase, user.id, "referral"),
  ]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <InviteFriendView
      profile={profile}
      stats={stats}
      levels={levels}
      referrals={referrals}
      secondLevelCount={secondLevelCount}
      axFromReferrals={axFromReferrals}
      referralAx={REFERRAL_AX}
    />
  );
}
