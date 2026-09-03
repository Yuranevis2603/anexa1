import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Product-analytics events for the onboarding/activation funnel. Written to
 * `analytics_events` (append-only, admin-readable only — see schema.sql).
 * Extend this union rather than passing arbitrary strings, so every event
 * name in the funnel is greppable from one place.
 */
export type AnalyticsEvent =
  | "onboarding_started"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "profile_completed"
  | "first_connection"
  | "first_community_join";

/**
 * Fire-and-forget analytics write. Never throws — a failed/slow analytics
 * insert must never block or error out the real user action it's attached
 * to (finishing onboarding, sending a connection request, joining a
 * community). Failures are only logged.
 */
export async function trackEvent(
  supabase: SupabaseClient,
  userId: string,
  event: AnalyticsEvent,
  detail?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabase.from("analytics_events").insert({
      user_id: userId,
      event,
      detail: detail ?? {},
    });
    if (error) {
      console.error(`trackEvent(${event}) failed:`, error.message);
    }
  } catch (err) {
    console.error(`trackEvent(${event}) failed:`, err);
  }
}
