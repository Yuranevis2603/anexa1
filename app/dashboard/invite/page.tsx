import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyInvites } from "@/lib/invites";
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

  const invites = await getMyInvites(supabase, user.id);

  return <InviteFriendView userId={user.id} initialInvites={invites} />;
}
