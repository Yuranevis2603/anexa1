"use client";

import { useState } from "react";
import { Loader2, Megaphone, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminBroadcastNotification } from "@/lib/admin";
import { useToast } from "@/components/ui/ToastProvider";

export default function AdminBroadcast({ totalUsers }: { totalUsers: number }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSentCount, setLastSentCount] = useState<number | null>(null);

  async function handleSend() {
    if (sending || !title.trim()) return;
    setSending(true);
    try {
      const count = await adminBroadcastNotification(createClient(), title.trim(), body.trim());
      setLastSentCount(count);
      showToast("success", `Сповіщення надіслано ${count} користувачам.`);
      setTitle("");
      setBody("");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося надіслати сповіщення.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink-primary">Сповіщення</h1>
      <p className="mt-1 text-[13px] text-ink-tertiary">
        Надішле сповіщення (дзвіночок у застосунку) усім {totalUsers.toLocaleString("uk-UA")} користувачам, крім тих, хто вимкнув цей тип сповіщень у Налаштуваннях.
      </p>

      <div className="glass mt-5 max-w-xl rounded-2xl border border-border-subtle p-5">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-purple-soft" />
          <p className="text-[13px] font-semibold text-ink-primary">Нове повідомлення</p>
        </div>

        <label className="mt-4 block text-[11.5px] font-medium text-ink-tertiary">Заголовок</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Наприклад: Технічні роботи 30.08"
          className="mt-1.5 w-full rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
        />

        <label className="mt-3 block text-[11.5px] font-medium text-ink-tertiary">Текст (необов&apos;язково)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Деталі повідомлення..."
          className="mt-1.5 w-full resize-none rounded-lg border border-border-subtle bg-white/[0.03] px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-1 focus:ring-purple/40"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !title.trim()}
          className="mt-4 flex items-center gap-2 rounded-lg bg-grad-purple-blue px-4 py-2 text-[12.5px] font-medium text-white shadow-glow-purple transition-opacity disabled:opacity-60"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Надіслати усім
        </button>

        {lastSentCount !== null ? (
          <p className="mt-3 text-[12px] text-success">Востаннє надіслано {lastSentCount} користувачам.</p>
        ) : null}
      </div>
    </div>
  );
}
