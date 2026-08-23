import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPostById, getUserLikes, getUserSaves } from "@/lib/feed";
import PostDetailView from "@/components/feed/PostDetailView";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { comments?: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const post = await getPostById(supabase, params.id, user.id);

  if (!post) {
    notFound();
  }

  const [likedSet, savedSet] = await Promise.all([
    getUserLikes(supabase, user.id, [post.id]),
    getUserSaves(supabase, user.id, [post.id]),
  ]);

  return (
    <PostDetailView
      post={post}
      userId={user.id}
      initiallyLiked={likedSet.has(post.id)}
      initiallySaved={savedSet.has(post.id)}
      autoOpenComments={searchParams.comments === "1"}
    />
  );
}
