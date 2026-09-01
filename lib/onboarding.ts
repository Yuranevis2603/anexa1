import type { SupabaseClient } from "@supabase/supabase-js";

export const ONBOARDING_TOTAL_STEPS = 8;

// Preset chip options for the onboarding picker steps. These are just
// starting suggestions — every step also accepts free-text via TagInput,
// so nothing here is a hard enum in the database (skills/interests/
// business_goals stay plain text[] columns, same as the profile editor).
export const SKILL_OPTIONS = [
  "Маркетинг",
  "Продажі",
  "Розробка",
  "Дизайн",
  "Фінанси",
  "Менеджмент",
  "AI",
  "Контент",
  "Продукт",
  "Business Development",
] as const;

export const INTEREST_OPTIONS = [
  "Стартапи",
  "Інвестиції",
  "SaaS",
  "E-commerce",
  "AI та автоматизація",
  "Web3 та крипто",
  "Маркетинг і бренд",
  "Нерухомість",
  "Медіа та контент",
  "HR та рекрутинг",
] as const;

export const GOAL_OPTIONS = [
  "Знайти бізнес-партнерів",
  "Знайти клієнтів",
  "Знайти співзасновника",
  "Знайти талановитих людей",
  "Навчатися",
  "Реалізувати проєкт",
  "Розширити нетворк",
  "Ділитися експертизою",
] as const;

export const INDUSTRY_OPTIONS = [
  "IT та розробка",
  "Маркетинг та реклама",
  "E-commerce",
  "Фінанси та інвестиції",
  "Нерухомість",
  "Освіта",
  "Медицина та здоров'я",
  "Виробництво",
  "Консалтинг",
  "Медіа та розваги",
] as const;

export async function completeOnboarding(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, onboarding_step: ONBOARDING_TOTAL_STEPS })
    .eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Ranks communities for the "Communities" onboarding step by how much
 * their name/description/category overlaps with the member's picked
 * skills/interests/goals — no separate matching system, just a small local
 * heuristic since there's no existing community-recommendation logic to
 * reuse (unlike people matches, which reuse lib/match.ts as-is). */
export function scoreCommunityRelevance(
  community: { name: string; description: string | null; category: string | null },
  tags: string[]
): number {
  const haystack = [community.name, community.description, community.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack || tags.length === 0) return 0;
  return tags.reduce((score, tag) => (haystack.includes(tag.toLowerCase()) ? score + 1 : score), 0);
}
