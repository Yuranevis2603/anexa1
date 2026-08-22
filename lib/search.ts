import type { SupabaseClient } from "@supabase/supabase-js";

export type PersonResult = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  roleTitle: string | null;
  company: string | null;
};

export type PostResult = {
  id: string;
  body: string;
  postType: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

export type CommunityResult = {
  id: string;
  name: string;
  iconUrl: string | null;
};

export type ProjectResult = {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  ownerName: string;
};

export type SearchResults = {
  people: PersonResult[];
  posts: PostResult[];
  communities: CommunityResult[];
  projects: ProjectResult[];
};

export const EMPTY_RESULTS: SearchResults = { people: [], posts: [], communities: [], projects: [] };

/** Global search across the entities members actually browse — people,
 * posts, communities, projects. Every table involved is select-all for
 * authenticated members (see schema.sql), so this is plain ilike queries,
 * no RPC needed. */
export async function search(supabase: SupabaseClient, query: string, limit: number = 5): Promise<SearchResults> {
  const term = query.trim();
  if (term.length < 2) return EMPTY_RESULTS;

  const like = `%${term}%`;

  const [peopleRes, postsRes, communitiesRes, projectsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role_title, company")
      .or(`full_name.ilike.${like},username.ilike.${like},company.ilike.${like}`)
      .limit(limit),
    supabase
      .from("activity_items")
      .select("id, body, post_type, user_id, author:profiles!activity_items_user_id_fkey(full_name, avatar_url)")
      .ilike("body", like)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("communities").select("id, name, icon_url").ilike("name", like).limit(limit),
    supabase
      .from("projects")
      .select("id, title, description, user_id, owner:profiles!projects_user_id_fkey(full_name)")
      .ilike("title", like)
      .limit(limit),
  ]);

  if (peopleRes.error) console.error("search (people) failed:", peopleRes.error.message);
  if (postsRes.error) console.error("search (posts) failed:", postsRes.error.message);
  if (communitiesRes.error) console.error("search (communities) failed:", communitiesRes.error.message);
  if (projectsRes.error) console.error("search (projects) failed:", projectsRes.error.message);

  const people = ((peopleRes.data ?? []) as unknown as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role_title: string | null;
    company: string | null;
  }[]).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    avatarUrl: p.avatar_url,
    roleTitle: p.role_title,
    company: p.company,
  }));

  const posts = ((postsRes.data ?? []) as unknown as {
    id: string;
    body: string;
    post_type: string | null;
    user_id: string;
    author: { full_name: string; avatar_url: string | null } | null;
  }[]).map((p) => ({
    id: p.id,
    body: p.body,
    postType: p.post_type,
    authorId: p.user_id,
    authorName: p.author?.full_name ?? "Учасник ANEXA",
    authorAvatarUrl: p.author?.avatar_url ?? null,
  }));

  const communities = ((communitiesRes.data ?? []) as { id: string; name: string; icon_url: string | null }[]).map(
    (c) => ({ id: c.id, name: c.name, iconUrl: c.icon_url })
  );

  const projects = ((projectsRes.data ?? []) as unknown as {
    id: string;
    title: string;
    description: string | null;
    user_id: string;
    owner: { full_name: string } | null;
  }[]).map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    ownerId: p.user_id,
    ownerName: p.owner?.full_name ?? "Учасник ANEXA",
  }));

  return { people, posts, communities, projects };
}
