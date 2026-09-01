import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import ToastProvider from "@/components/ui/ToastProvider";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(supabase, user.id);

  if (!profile || profile.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <ToastProvider>
      <OnboardingFlow userId={user.id} profile={profile} />
    </ToastProvider>
  );
}
