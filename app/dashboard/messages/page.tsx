import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/messages";
import MessagesView from "@/components/messages/MessagesView";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const conversations = await getConversations(supabase, user.id);

  return (
    <div className="h-full">
      <Suspense fallback={null}>
        <MessagesView userId={user.id} initialConversations={conversations} />
      </Suspense>
    </div>
  );
}
