import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunities } from "@/lib/communities";
import CommunitiesView from "@/components/communities/CommunitiesView";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const communities = await getCommunities(supabase, user.id);

  return <CommunitiesView userId={user.id} initialCommunities={communities} />;
}
