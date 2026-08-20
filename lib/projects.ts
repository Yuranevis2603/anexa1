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

export async function getProjects(supabase: SupabaseClient, userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, title, description, status, team_size, image_url, link_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProjects failed:", error.message);
    return [];
  }

  return (data ?? []) as Project[];
}

export type CreateProjectInput = {
  title: string;
  description?: string | null;
  status: ProjectStatus;
  team_size?: number | null;
  link_url?: string | null;
};

export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput
): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    team_size: input.team_size ?? null,
    link_url: input.link_url ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteProject(supabase: SupabaseClient, projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    throw new Error(error.message);
  }
}
