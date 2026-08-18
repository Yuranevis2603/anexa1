"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PostComposer({ userId }: { userId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Напишіть щось перед публікацією.");
      return;
    }

    setPosting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("activity_items").insert({
      user_id: userId,
      type: "post",
      body: trimmed,
    });

    setPosting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass rounded-2xl border border-border-subtle p-4"
    >
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Поділіться новиною, думкою чи прогресом..."
        rows={3}
        className="w-full resize-none rounded-lg border border-border-subtle bg-base-surface px-3 py-2.5 text-[13.5px] text-ink-primary placeholder:text-ink-tertiary focus:border-purple/40 focus:outline-none"
      />

      {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}

      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          disabled={posting}
          className="flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[13px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
        >
          {posting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
          Опублікувати
        </button>
      </div>
    </form>
  );
}
