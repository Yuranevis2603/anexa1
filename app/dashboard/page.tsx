import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/feed";
import PostComposer from "@/components/feed/PostComposer";
import PostCard from "@/components/feed/PostCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const feed = await getFeed(supabase);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-ink-primary">
        Стрічка
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-secondary">
        Останні новини та думки спільноти Anexa.
      </p>

      <div className="mt-5">
        <PostComposer userId={user.id} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {feed.length === 0 ? (
          <div className="glass rounded-2xl border border-border-subtle p-8 text-center">
            <p className="text-[13.5px] text-ink-tertiary">
              Ще немає жодного поста. Будьте першим, хто поділиться новиною.
            </p>
          </div>
        ) : (
          feed.map((item) => <PostCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
