"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMatchRecommendations, type MatchCandidate } from "@/lib/match";
import RecommendationCard from "@/components/friends/RecommendationCard";
import StepNav from "../StepNav";
import type { OnboardingDraft } from "../OnboardingFlow";

export default function PeopleStep({
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
  const [matches, setMatches] = useState<MatchCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const recommendations = await getMatchRecommendations(
        supabase,
        { id: userId, skills: draft.skills, interests: draft.interests, business_goals: draft.business_goals },
        5
      );
      if (cancelled) return;
      setMatches(recommendations);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Recommendations are computed once from the picks made in prior steps —
    // no need to re-run as the user clicks Connect on cards below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold text-ink-primary">Люди, з якими варто познайомитися</h2>
      <p className="mt-1.5 text-[13.5px] text-ink-secondary">
        Підібрано на основі ваших навичок, інтересів і цілей.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-ink-tertiary">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matches.map((match) => (
              <RecommendationCard key={match.profile.id} userId={userId} match={match} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-border-subtle bg-white/[0.02] p-4 text-[13px] text-ink-tertiary">
            Поки що замало даних для точних рекомендацій — вони з'являться на дашборді, щойно спільнота підросте.
          </p>
        )}
      </div>

      {error && <p className="mt-4 text-[12.5px] text-danger">{error}</p>}

      <StepNav onBack={onBack} onSkip={onSkip} onNext={onNext} saving={saving} nextLabel="Завершити" />
    </div>
  );
}
