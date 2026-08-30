"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import {
  cancelCall,
  declineCall,
  endCall,
  getCallById,
  getMyActiveCall,
  joinCall,
  pingCall,
  startCall as startCallRequest,
  toCall,
  type Call,
  type CallKind,
  type CallRow,
} from "@/lib/calls";
import IncomingCallModal from "./IncomingCallModal";
import OutgoingCallOverlay from "./OutgoingCallOverlay";
import InCallView from "./InCallView";

const RING_TIMEOUT_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 45_000;
const POLL_INTERVAL_MS = 3_000;
const IDLE_POLL_INTERVAL_MS = 5_000;

type Peer = { id: string; fullName: string; avatarUrl: string | null };
type Entry = { roomUrl: string; token: string };

type CallContextValue = {
  call: Call | null;
  peer: Peer | null;
  isIncoming: boolean;
  isOutgoing: boolean;
  isActive: boolean;
  entry: Entry | null;
  minimized: boolean;
  setMinimized: (value: boolean) => void;
  startCall: (conversationId: string, kind: CallKind) => Promise<void>;
  answerCall: () => Promise<void>;
  hangUp: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within CallProvider");
  }
  return ctx;
}

const TERMINAL_STATUSES = ["declined", "cancelled", "missed", "ended"];

/**
 * App-wide 1:1 call state, mounted once in DashboardShell alongside
 * OnlinePresenceProvider — so an incoming call surfaces no matter which
 * dashboard page the callee is currently on, not just an open ChatThread.
 * Signaling rides `postgres_changes` on conversation_calls (see the plan
 * at /root/.claude/plans/validated-moseying-lollipop.md) rather than
 * Presence/Broadcast, since the row is needed anyway for RLS authorization
 * on the join route and the stale-cleanup sweep.
 */
export default function CallProvider({ userId, children }: { userId: string | undefined; children: React.ReactNode }) {
  const { showToast } = useToast();
  const [call, setCall] = useState<Call | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [minimized, setMinimized] = useState(false);
  const entryForCallId = useRef<string | null>(null);
  const peerForId = useRef<string | null>(null);

  const clearCall = useCallback(() => {
    setCall(null);
    setPeer(null);
    setEntry(null);
    setMinimized(false);
    entryForCallId.current = null;
    peerForId.current = null;
  }, []);

  // Recover in-flight call state after a refresh/reconnect, and subscribe
  // to any change to a call where I'm caller or callee — the same
  // postgres_changes pattern useUnreadMessagesBadge uses for messages.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();

    getMyActiveCall(supabase, userId).then((existing) => {
      if (!cancelled && existing) setCall(existing);
    });

    function applyChange(newRow: CallRow) {
      const incoming = toCall(newRow);
      if (incoming.callerId !== userId && incoming.calleeId !== userId) return;

      setCall((prev) => {
        if (prev && prev.id !== incoming.id && !TERMINAL_STATUSES.includes(prev.status)) {
          return prev; // already tracking a different in-progress call — first one wins for v1
        }
        return TERMINAL_STATUSES.includes(incoming.status) ? null : incoming;
      });
    }

    const channel = supabase
      .channel(`calls:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_calls", filter: `callee_id=eq.${userId}` },
        (payload) => applyChange(payload.new as CallRow)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_calls", filter: `caller_id=eq.${userId}` },
        (payload) => applyChange(payload.new as CallRow)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Safety net for the *idle* case (no call currently tracked): the
  // subscription above only reacts to events it actually receives, and a
  // dropped/reconnecting WebSocket (flaky mobile network -- the same
  // "Weak network" condition Daily itself flags mid-call) can silently
  // swallow the INSERT for a brand-new incoming call with nothing else to
  // ever surface it, since getMyActiveCall's one-time mount fetch already
  // ran before the call existed. Polls only while idle -- once a call is
  // tracked, the effect above takes over.
  useEffect(() => {
    if (!userId || call) return;
    const supabase = createClient();
    const interval = setInterval(() => {
      getMyActiveCall(supabase, userId).then((existing) => {
        if (existing) setCall((prev) => prev ?? existing);
      });
    }, IDLE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, call]);

  // Clear local UI state once the tracked call reaches a terminal status.
  useEffect(() => {
    if (call && TERMINAL_STATUSES.includes(call.status)) {
      clearCall();
    }
  }, [call, clearCall]);

  // Load the other participant's name/avatar for the modal/overlay/in-call UI.
  useEffect(() => {
    if (!call || !userId) return;
    const peerId = call.callerId === userId ? call.calleeId : call.callerId;
    if (peerForId.current === peerId) return;
    peerForId.current = peerId;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", peerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPeer({ id: data.id, fullName: data.full_name, avatarUrl: data.avatar_url });
      });
  }, [call, userId]);

  // Once the call is active, mint/refresh the meeting token+room URL needed
  // to actually render the iframe (the caller's original POST /api/calls
  // token isn't persisted across a refresh, so both sides always go
  // through the same join route to enter the room).
  useEffect(() => {
    if (!call || call.status !== "active") return;
    if (entryForCallId.current === call.id) return;
    entryForCallId.current = call.id;

    joinCall(call.id)
      .then(({ roomUrl, token }) => setEntry({ roomUrl, token }))
      .catch((err) => {
        showToast("error", err instanceof Error ? err.message : "Не вдалося приєднатися до дзвінка.");
      });
  }, [call, showToast]);

  // Safety net on top of the postgres_changes subscription above: a
  // backgrounded mobile tab (screen lock, app-switch while waiting for the
  // other side to pick up) can miss a WebSocket event during a brief
  // reconnect, leaving this device stuck showing a stale status (e.g. still
  // "ringing"/OutgoingCallOverlay after the other side already answered).
  // Cheap direct re-fetch, reconciled the same way a Realtime row would be.
  useEffect(() => {
    if (!call) return;
    const supabase = createClient();
    const interval = setInterval(() => {
      getCallById(supabase, call.id).then((fresh) => {
        if (!fresh) return;
        setCall((prev) => (prev && prev.id === fresh.id ? fresh : prev));
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.id]);

  // Caller-side auto-give-up: mirrors the 60s threshold end_stale_calls()
  // uses server-side, so the UI doesn't sit waiting on a sweep it can
  // trigger itself.
  useEffect(() => {
    if (!call || call.status !== "ringing" || call.callerId !== userId) return;
    const timeout = setTimeout(() => {
      cancelCall(call.id).catch(() => undefined);
    }, RING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [call, userId]);

  // Heartbeat while genuinely in an active call.
  useEffect(() => {
    if (!call || call.status !== "active") return;
    const supabase = createClient();
    const interval = setInterval(() => {
      pingCall(supabase, call.id);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [call]);

  const startCall = useCallback(
    async (conversationId: string, kind: CallKind) => {
      try {
        const { call: started } = await startCallRequest(conversationId, kind);
        setCall(started);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "Не вдалося розпочати дзвінок.");
      }
    },
    [showToast]
  );

  const answerCall = useCallback(async () => {
    if (!call) return;
    try {
      const { roomUrl, token, call: updated } = await joinCall(call.id);
      entryForCallId.current = updated.id;
      setEntry({ roomUrl, token });
      setCall(updated);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося прийняти дзвінок.");
    }
  }, [call, showToast]);

  const hangUp = useCallback(async () => {
    if (!call) return;
    const isRinging = call.status === "ringing";
    const isCaller = call.callerId === userId;
    const request = isRinging ? (isCaller ? cancelCall : declineCall) : endCall;
    clearCall();
    try {
      await request(call.id);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Не вдалося завершити дзвінок.");
    }
  }, [call, userId, showToast, clearCall]);

  const isIncoming = call?.status === "ringing" && call.calleeId === userId;
  const isOutgoing = call?.status === "ringing" && call.callerId === userId;
  const isActive = call?.status === "active";

  return (
    <CallContext.Provider
      value={{ call, peer, isIncoming, isOutgoing, isActive, entry, minimized, setMinimized, startCall, answerCall, hangUp }}
    >
      {children}
      {isIncoming && peer ? <IncomingCallModal /> : null}
      {isOutgoing && peer ? <OutgoingCallOverlay /> : null}
      {isActive && entry ? <InCallView /> : null}
    </CallContext.Provider>
  );
}
