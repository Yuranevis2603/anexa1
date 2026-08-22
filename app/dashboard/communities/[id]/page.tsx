import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunity } from "@/lib/communities";
import { getEvents } from "@/lib/events";
import CommunityDetailView from "@/components/communities/CommunityDetailView";

export const dynamic = "force-dynamic";

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const community = await getCommunity(supabase, params.id, user.id);

  if (!community) {
    notFound();
  }

  const events = await getEvents(supabase, user.id, community.id);

  return <CommunityDetailView userId={user.id} initialCommunity={community} initialEvents={events} />;
}
