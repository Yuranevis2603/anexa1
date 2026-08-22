"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PostCard from "./PostCard";
import type { FeedItem } from "@/lib/feed";

export default function PostDetailView({
  post,
  userId,
  initiallyLiked,
  initiallySaved,
  autoOpenComments,
}: {
  post: FeedItem;
  userId: string;
  initiallyLiked: boolean;
  initiallySaved: boolean;
  autoOpenComments: boolean;
}) {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-tertiary transition-colors hover:text-ink-primary"
      >
        <ArrowLeft size={14} />
        До стрічки
      </Link>

      <PostCard
        item={post}
        userId={userId}
        initiallyLiked={initiallyLiked}
        initiallySaved={initiallySaved}
        onDeleted={() => router.push("/dashboard")}
        autoOpenComments={autoOpenComments}
      />
    </div>
  );
}
