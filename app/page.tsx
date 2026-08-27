import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingView from "@/components/landing/LandingView";

export default async function RootPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return <LandingView />;
}
