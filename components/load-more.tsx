"use client";

// components/load-more.tsx
//
// Client component: cursor-driven "Load more" for a feed page. Fetches
// /api/feed, never lib/a1/ directly — a "use client" file may not import
// from lib/a1/ (PLAN.md §5 rule 4).

import { useState } from "react";
import { PostCard } from "./post-card";
import type { WebPost, WebPostKind } from "@/types/web-post";

// What /api/feed actually sends over JSON: Date fields arrive as ISO
// strings, so they need to be revived before this shape is a real WebPost.
type RawFeedPost = Omit<WebPost, "publishedAt" | "updatedAt"> & {
  publishedAt: string;
  updatedAt: string | null;
};

function reviveDates(post: RawFeedPost): WebPost {
  return {
    ...post,
    publishedAt: new Date(post.publishedAt),
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
  };
}

export function LoadMore({
  kind,
  initialCursor,
  initialHasMore,
}: {
  kind: WebPostKind;
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  const [posts, setPosts] = useState<WebPost[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?kind=${kind}&cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("request failed");
      const data: { posts: RawFeedPost[]; next: string | null; hasMore: boolean } = await res.json();
      setPosts((prev) => [...prev, ...data.posts.map(reviveDates)]);
      setCursor(data.next);
      setHasMore(data.hasMore);
    } catch {
      setError("Не получилось загрузить ещё. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {posts.length > 0 && (
        <ul className="mt-4 flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50"
        >
          {loading ? "Загрузка…" : "Показать ещё"}
        </button>
      )}
    </>
  );
}
