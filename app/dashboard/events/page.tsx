import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/lib/events";
import EventsView from "@/components/events/EventsView";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const events = await getEvents(supabase, user.id);

  return <EventsView userId={user.id} initialEvents={events} />;
}
