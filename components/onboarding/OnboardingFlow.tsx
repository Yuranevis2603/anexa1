"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { profileCompleteness, type Profile } from "@/lib/profile";
import { trackEvent } from "@/lib/analytics";
import { GOAL_OPTIONS, INDUSTRY_OPTIONS, INTEREST_OPTIONS, ONBOARDING_TOTAL_STEPS, SKILL_OPTIONS, completeOnboarding } from "@/lib/onboarding";
import OnboardingProgress from "./OnboardingProgress";
import WelcomeStep from "./steps/WelcomeStep";
import ProfileStep from "./steps/ProfileStep";
import TagPickerStep from "./steps/TagPickerStep";
import CommunitiesStep from "./steps/CommunitiesStep";
import PeopleStep from "./steps/PeopleStep";
import CompleteStep from "./steps/CompleteStep";

export type OnboardingDraft = {
  full_name: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  role_title: string;
  company: string;
  industries: string[];
  skills: string[];
  interests: string[];
  business_goals: string[];
};

function toDraft(profile: Profile): OnboardingDraft {
  return {
    full_name: profile.full_name ?? "",
    avatar_url: profile.avatar_url,
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    role_title: profile.role_title ?? "",
    company: profile.company ?? "",
    industries: profile.industries ?? [],
    skills: profile.skills ?? [],
    interests: profile.interests ?? [],
    business_goals: profile.business_goals ?? [],
  };
}

// What each step persists to `profiles` on Continue/Skip — steps without an
// entry (Welcome, Communities, People) only advance onboarding_step, since
// community joins and connection requests are already written immediately
// by the reused CommunityCard/RecommendationCard components.
const STEP_FIELDS: Partial<Record<number, (d: OnboardingDraft) => Record<string, unknown>>> = {
  2: (d) => ({
    full_name: d.full_name.trim(),
    avatar_url: d.avatar_url,
    bio: d.bio.trim() || null,
    location: d.location.trim() || null,
    role_title: d.role_title.trim() || null,
    company: d.company.trim() || null,
    industries: d.industries,
  }),
  3: (d) => ({ skills: d.skills }),
  4: (d) => ({ interests: d.interests }),
  5: (d) => ({ business_goals: d.business_goals }),
};

export default function OnboardingFlow({ userId, profile }: { userId: string; profile: Profile }) {
  const router = useRouter();
  const [draft, setDraft] = useState<OnboardingDraft>(() => toDraft(profile));
  const [step, setStep] = useState(() => {
    if (profile.onboarding_completed) return ONBOARDING_TOTAL_STEPS;
    return Math.min(Math.max(profile.onboarding_step || 1, 1), ONBOARDING_TOTAL_STEPS);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileCompletedTracked = useRef(false);

  // Fires once, only when this is a genuine first arrival (step 1, not yet
  // completed) — not on every resume of an in-progress flow.
  useEffect(() => {
    if (step === 1 && !profile.onboarding_completed) {
      void trackEvent(createClient(), userId, "onboarding_started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(fields: Partial<OnboardingDraft>) {
    setDraft((d) => ({ ...d, ...fields }));
  }

  async function goNext(overrideFields: Record<string, unknown> = {}) {
    if (step === 2 && !draft.full_name.trim()) {
      setError("Вкажіть ім'я, щоб продовжити.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const nextStep = Math.min(step + 1, ONBOARDING_TOTAL_STEPS);
      const fields = { ...(STEP_FIELDS[step]?.(draft) ?? {}), ...overrideFields };
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ ...fields, onboarding_step: nextStep })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
      setStep(nextStep);

      // Fire profile_completed the first time the draft (with this step's
      // fields applied) satisfies the same completeness definition used
      // everywhere else in the app (lib/profile.ts's profileCompleteness) —
      // reused as-is, not reimplemented.
      if (!profileCompletedTracked.current) {
        const merged = { ...draft, ...fields } as unknown as Profile;
        if (profileCompleteness(merged) >= 100) {
          profileCompletedTracked.current = true;
          void trackEvent(supabase, userId, "profile_completed");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти. Перевірте з'єднання і спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  }

  function goSkip() {
    void trackEvent(createClient(), userId, "onboarding_skipped", { step });
    void goNext();
  }

  function goBack() {
    setError(null);
    const prevStep = Math.max(step - 1, 1);
    setStep(prevStep);
    const supabase = createClient();
    void supabase.from("profiles").update({ onboarding_step: prevStep }).eq("id", userId);
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      await completeOnboarding(supabase, userId);
      void trackEvent(supabase, userId, "onboarding_completed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Не вдалося завершити. Спробуйте ще раз.");
    }
  }

  const wide = step === 6 || step === 7;

  return (
    <div className="relative min-h-screen overflow-hidden bg-base">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,92,255,0.18)_0%,transparent_70%)]" />
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className={`w-full transition-[max-width] duration-200 ${wide ? "max-w-2xl" : "max-w-md"}`}>
          {step > 1 && step < ONBOARDING_TOTAL_STEPS ? <OnboardingProgress step={step} total={ONBOARDING_TOTAL_STEPS} /> : null}

          <div className="glass mt-4 rounded-2xl border border-border-subtle p-6 sm:p-8">
            {step === 1 && <WelcomeStep onNext={() => goNext()} saving={saving} />}

            {step === 2 && (
              <ProfileStep
                userId={userId}
                draft={draft}
                onChange={patch}
                onBack={goBack}
                onNext={goNext}
                saving={saving}
                error={error}
                industryOptions={INDUSTRY_OPTIONS}
              />
            )}

            {step === 3 && (
              <TagPickerStep
                title="Ваші навички"
                subtitle="Оберіть те, у чому ви сильні — це допоможе точніше підбирати людей і спільноти."
                options={SKILL_OPTIONS}
                values={draft.skills}
                onChange={(v) => patch({ skills: v })}
                placeholder="напр. Копірайтинг"
                onBack={goBack}
                onSkip={goSkip}
                onNext={() => goNext()}
                saving={saving}
                error={error}
              />
            )}

            {step === 4 && (
              <TagPickerStep
                title="Ваші інтереси"
                subtitle="Що вам цікаво в бізнесі? Це впливає на рекомендації, підбір людей і стрічку."
                options={INTEREST_OPTIONS}
                values={draft.interests}
                onChange={(v) => patch({ interests: v })}
                placeholder="напр. Логістика"
                onBack={goBack}
                onSkip={goSkip}
                onNext={() => goNext()}
                saving={saving}
                error={error}
              />
            )}

            {step === 5 && (
              <TagPickerStep
                title="Чого ви хочете досягти в ANEXA?"
                subtitle="Оберіть одну або декілька цілей."
                options={GOAL_OPTIONS}
                values={draft.business_goals}
                onChange={(v) => patch({ business_goals: v })}
                placeholder="Своя ціль"
                onBack={goBack}
                onSkip={goSkip}
                onNext={() => goNext()}
                saving={saving}
                error={error}
              />
            )}

            {step === 6 && (
              <CommunitiesStep
                userId={userId}
                draft={draft}
                onBack={goBack}
                onSkip={goSkip}
                onNext={() => goNext()}
                saving={saving}
                error={error}
              />
            )}

            {step === 7 && (
              <PeopleStep
                userId={userId}
                draft={draft}
                onBack={goBack}
                onSkip={goSkip}
                onNext={() => goNext()}
                saving={saving}
                error={error}
              />
            )}

            {step === 8 && <CompleteStep draft={draft} onFinish={finish} saving={saving} error={error} />}
          </div>
        </div>
      </div>
    </div>
  );
}
