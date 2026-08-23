import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommunity, getCommunityMembers } from "@/lib/communities";
import { getAuditLog, getBannedMembers, getJoinRequests, type CommunityRole } from "@/lib/communityAdmin";
import { getEvents } from "@/lib/events";
import CommunityAdminView from "@/components/communities/admin/CommunityAdminView";

export const dynamic = "force-dynamic";

export default async function CommunityAdminPage({ params }: { params: { id: string } }) {
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

  const members = await getCommunityMembers(supabase, community.id, community.createdBy);

  const isOwner = community.createdBy === user.id;
  const myRole = members.find((m) => m.userId === user.id)?.communityRole ?? "member";
  const role: CommunityRole = isOwner ? "owner" : myRole;

  if (role === "member") {
    redirect(`/dashboard/communities/${community.id}`);
  }

  const isAdmin = role === "owner" || role === "admin";
  const isStaff = isAdmin || role === "moderator";

  const [joinRequests, banned, auditLog, events] = await Promise.all([
    isStaff ? getJoinRequests(supabase, community.id) : Promise.resolve([]),
    isAdmin ? getBannedMembers(supabase, community.id) : Promise.resolve([]),
    isAdmin ? getAuditLog(supabase, community.id) : Promise.resolve([]),
    isAdmin ? getEvents(supabase, user.id, community.id, true) : Promise.resolve([]),
  ]);

  return (
    <CommunityAdminView
      community={community}
      role={role}
      userId={user.id}
      initialMembers={members}
      initialJoinRequests={joinRequests}
      initialBanned={banned}
      initialAuditLog={auditLog}
      initialEvents={events}
    />
  );
}
