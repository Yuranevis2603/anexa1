import { createClient } from "@/lib/supabase/server";
import { getOpenReports } from "@/lib/moderation";
import ReportsQueueView from "@/components/admin/ReportsQueueView";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const supabase = createClient();
  const reports = await getOpenReports(supabase);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Модерація</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">Скарги учасників, що очікують розгляду.</p>
      <ReportsQueueView initialReports={reports} />
    </div>
  );
}
