"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { acceptConnection, declineConnection, type IncomingConnectionRequest } from "@/lib/connections";
import { initials } from "@/lib/profile";
import { useToast } from "@/components/ui/ToastProvider";

export default function ConnectionRequestsView({ initialRequests }: { initialRequests: IncomingConnectionRequest[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [requests, setRequests] = useState(initialRequests);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleAccept(request: IncomingConnectionRequest) {
    if (pendingId) return;
    setPendingId(request.id);
    try {
      const supabase = createClient();
      await acceptConnection(supabase, request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      showToast("success", `Тепер ви знайомі з ${request.requester?.full_name ?? "цим учасником"}.`);
      router.refresh(); // keeps the sidebar badge count in sync
    } catch (err) {
      showToast("error", "Не вдалося прийняти запит.");
      console.error("acceptConnection failed:", err);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDecline(request: IncomingConnectionRequest) {
    if (pendingId) return;
    setPendingId(request.id);
    try {
      const supabase = createClient();
      await declineConnection(supabase, request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      router.refresh();
    } catch (err) {
      showToast("error", "Не вдалося відхилити запит.");
      console.error("declineConnection failed:", err);
    } finally {
      setPendingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border-subtle p-6">
        <p className="text-[13.5px] text-ink-tertiary">Немає нових запитів на знайомство.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((request) => {
        const name = request.requester?.full_name ?? "Учасник ANEXA";
        const profileHref = `/dashboard/people/${request.requester_id}`;
        const isPending = pendingId === request.id;

        return (
          <div key={request.id} className="glass flex items-center gap-3 rounded-2xl border border-border-subtle p-4">
            <Link href={profileHref} className="shrink-0">
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-grad-purple-blue text-[13px] font-semibold text-white">
                {request.requester?.avatar_url ? (
                  <Image src={request.requester.avatar_url} alt={name} fill sizes="44px" className="object-cover" />
                ) : (
                  initials(name)
                )}
              </div>
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={profileHref} className="truncate text-[13.5px] font-medium text-ink-primary hover:underline">
                {name}
              </Link>
              {request.requester?.role_title || request.requester?.company ? (
                <p className="truncate text-[12px] text-ink-tertiary">
                  {[request.requester?.role_title, request.requester?.company].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => handleDecline(request)}
                disabled={isPending}
                aria-label="Відхилити"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-ink-tertiary transition-colors hover:bg-white/[0.06] hover:text-danger disabled:opacity-60"
              >
                <X size={15} />
              </button>
              <button
                type="button"
                onClick={() => handleAccept(request)}
                disabled={isPending}
                aria-label="Прийняти"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-grad-purple-blue text-white shadow-glow-purple transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
