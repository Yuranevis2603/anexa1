import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIncomingConnectionRequests } from "@/lib/connections";
import ConnectionRequestsView from "@/components/connections/ConnectionRequestsView";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const requests = await getIncomingConnectionRequests(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-xl font-semibold text-ink-primary">Запити на знайомство</h1>
      <ConnectionRequestsView initialRequests={requests} />
    </div>
  );
}
