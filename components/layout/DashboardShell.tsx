"use client";

import { useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { OnlinePresenceProvider, useUnreadMessagesBadge } from "@/lib/presence";
import CallProvider from "@/components/calls/CallProvider";

// Swipe gesture tuning: only arm "open" near the screen's left edge (like a
// native app drawer) so it doesn't hijack horizontal scrollers elsewhere on
// the page; "close" is armed anywhere once the drawer is already open.
const EDGE_ZONE_PX = 28;
const SWIPE_THRESHOLD_PX = 60;
const MAX_VERTICAL_DRIFT_PX = 50;

function DashboardShellInner({
  children,
  userId,
  userName,
  userRole,
  avatarUrl,
  initialUnreadMessages,
  pendingConnections,
  unreadNotifications,
  isPlatformAdmin,
}: {
  children: React.ReactNode;
  userId?: string;
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  initialUnreadMessages: number;
  pendingConnections: number;
  unreadNotifications: number;
  isPlatformAdmin: boolean;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const unreadMessages = useUnreadMessagesBadge(userId, initialUnreadMessages);

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    if (!touch) return;
    if (!navOpen && touch.clientX > EDGE_ZONE_PX) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (deltaY > MAX_VERTICAL_DRIFT_PX) return; // vertical scroll, not a swipe

    if (!navOpen && deltaX > SWIPE_THRESHOLD_PX) {
      setNavOpen(true);
    } else if (navOpen && deltaX < -SWIPE_THRESHOLD_PX) {
      setNavOpen(false);
    }
  }

  return (
    <div
      className="flex h-screen overflow-hidden bg-base"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {navOpen ? (
        <div
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      ) : null}

      <Sidebar
        open={navOpen}
        onClose={() => setNavOpen(false)}
        unreadMessages={unreadMessages}
        pendingConnections={pendingConnections}
        unreadNotifications={unreadNotifications}
        isPlatformAdmin={isPlatformAdmin}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userId={userId}
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
          onMenuClick={() => setNavOpen(true)}
          unreadNotifications={unreadNotifications}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardShell({
  children,
  userId,
  userName,
  userRole,
  avatarUrl,
  initialUnreadMessages = 0,
  pendingConnections = 0,
  unreadNotifications = 0,
  isPlatformAdmin = false,
  hideOnlineStatus = false,
}: {
  children: React.ReactNode;
  userId?: string;
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  initialUnreadMessages?: number;
  pendingConnections?: number;
  unreadNotifications?: number;
  isPlatformAdmin?: boolean;
  hideOnlineStatus?: boolean;
}) {
  return (
    <OnlinePresenceProvider userId={userId} hideOnlineStatus={hideOnlineStatus}>
      <CallProvider userId={userId}>
        <DashboardShellInner
          userId={userId}
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
          initialUnreadMessages={initialUnreadMessages}
          pendingConnections={pendingConnections}
          unreadNotifications={unreadNotifications}
          isPlatformAdmin={isPlatformAdmin}
        >
          {children}
        </DashboardShellInner>
      </CallProvider>
    </OnlinePresenceProvider>
  );
}
