"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCommunities, type Community } from "@/lib/communities";
import { scoreCommunityRelevance } from "@/lib/onboarding";
import CommunityCard from "@/components/communities/CommunityCard";
import StepNav from "../StepNav";
import type { OnboardingDraft } from "../OnboardingFlow";

export default function CommunitiesStep({
  userId,
  draft,
  onBack,
  onSkip,
  onNext,
  saving,
  error,
}: {
  userId: string;
  draft: OnboardingDraft;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  const tags = useMemo(
    () => [...draft.skills, ...draft.interests, ...draft.business_goals, ...draft.industries],
    [draft.skills, draft.interests, draft.business_goals, draft.industries]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const all = await getCommunities(supabase, userId);
      if (cancelled) return;
      setCommunities(all);
      setLoadError(all.length === 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleChanged(communityId: string, isMember: boolean, hasPendingRequest = false) {
    setCommunities((prev) => prev.map((c) => (c.id === communityId ? { ...c, isMember, hasPendingRequest } : c)));
  }

  const recommended = useMemo(() => {
    const joinable = communities.filter((c) => !c.isMember && !c.archivedAt);
    return joinable
      .map((c) => ({ community: c, score: scoreCommunityRelevance(c, tags) }))
      .sort((a, b) => b.score - a.score || b.community.memberCount - a.community.memberCount)
      .slice(0, 6)
      .map((x) => x.community);
  }, [communities, tags]);

  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold text-ink-primary">Рекомендовані спільноти</h2>
      <p className="mt-1.5 text-[13.5px] text-ink-secondary">
        На основі ваших навичок, інтересів і цілей — ось спільноти, з яких варто почати.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-ink-tertiary">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : recommended.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recommended.map((c) => (
              <CommunityCard key={c.id} userId={userId} community={c} onChanged={handleChanged} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-white/[0.02] p-4 text-[13px] text-ink-tertiary">
            {loadError
              ? "Поки немає доступних спільнот — можна приєднатися пізніше з розділу «Спільноти»."
              : "Ви вже приєдналися до всіх релевантних спільнот."}
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-[12.5px] text-danger">{error}</p>}

      <StepNav onBack={onBack} onSkip={onSkip} onNext={onNext} saving={saving} />
    </div>
  );
}
