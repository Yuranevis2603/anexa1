import type { SupabaseClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  full_name: string;
  role_title: string | null;
  company: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  industries: string[];
  links: Record<string, string>;
  location: string | null;
  skills: string[];
  interests: string[];
  username: string | null;
  cover_url: string | null;
  membership_tier: "standard" | "black";
  business_goals: string[];
  languages: unknown[];
};

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("getProfile failed:", error.message);
    return null;
  }

  return data as Profile;
}

// Simple, transparent completeness score. Each field is worth an equal
// share; extend this list if new editable profile fields are added.
const COMPLETENESS_TEXT_FIELDS: (keyof Profile)[] = [
  "full_name",
  "role_title",
  "company",
  "avatar_url",
  "bio",
  "location",
  "username",
];
const COMPLETENESS_ARRAY_FIELDS: (keyof Profile)[] = ["skills", "interests", "business_goals"];

export function profileCompleteness(profile: Profile): number {
  const textFilled = COMPLETENESS_TEXT_FIELDS.filter((f) => {
    const value = profile[f];
    return typeof value === "string" && value.trim().length > 0;
  }).length;
  const arrayFilled = COMPLETENESS_ARRAY_FIELDS.filter((f) => {
    const value = profile[f];
    return Array.isArray(value) && value.length > 0;
  }).length;

  const total = COMPLETENESS_TEXT_FIELDS.length + COMPLETENESS_ARRAY_FIELDS.length;
  return Math.round(((textFilled + arrayFilled) / total) * 100);
}

/** "AI, Automation, CRM" -> ["AI", "Automation", "CRM"], trimmed and deduped. */
export function parseTagInput(value: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of value.split(",")) {
    const tag = raw.trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return tags;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
