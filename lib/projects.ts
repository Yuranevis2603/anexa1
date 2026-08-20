import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectStatus = "active" | "completed";

export type Project = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  team_size: number | null;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
};

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "У роботі" },
  { value: "completed", label: "Завершено" },
];

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

/**
 * Only renders a project link if it's http(s) — link_url is free-text
 * written by whoever owns the project and read by any authenticated member,
 * so a javascript: URI here would be a stored XSS vector against viewers.
 */
export function safeExternalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function getUserProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, title, description, status, team_size, image_url, link_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserProjects failed:", error.message);
    return [];
  }

  return (data ?? []) as Project[];
}

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  teamSize?: number | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
};

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "active",
      team_size: input.teamSize ?? null,
      image_url: input.imageUrl ?? null,
      link_url: input.linkUrl ?? null,
    })
    .select("id, user_id, title, description, status, team_size, image_url, link_url, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Project;
}

export async function deleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw new Error(error.message);
  }
}
