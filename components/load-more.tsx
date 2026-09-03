"use client";

// components/load-more.tsx
//
// Client component: cursor-driven "Load more" for a feed page. Fetches
// /api/feed, never lib/a1/ directly — a "use client" file may not import
// from lib/a1/ (PLAN.md §5 rule 4).

import { useState } from "react";
import { PostCard } from "./post-card";
import { T } from "./t";
import type { WebPost, WebPostKind } from "@/types/web-post";
import { authFetch } from "@/lib/auth-fetch";

// What /api/feed actually sends over JSON: Date fields arrive as ISO
// strings, so they need to be revived before this shape is a real WebPost.
// avatarBlurDataUrl rides along as an extra field (see app/api/feed/
// route.ts) rather than living on WebPost itself — it's a render-layer
// artifact (lib/avatar-blur.ts), not real post data.
type RawFeedPost = Omit<WebPost, "publishedAt" | "updatedAt"> & {
  publishedAt: string;
  updatedAt: string | null;
  avatarBlurDataUrl: string | null;
};

function reviveDates(post: RawFeedPost): WebPost & { avatarBlurDataUrl: string | null } {
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
  query,
  category,
  tags,
}: {
  kind: WebPostKind;
  initialCursor: string | null;
  initialHasMore: boolean;
  // The active filters (Phase 3), so "load more" pages keep respecting
  // them instead of silently reverting to the unfiltered feed.
  query?: string;
  category?: number;
  tags?: string[];
}) {
  const [posts, setPosts] = useState<(WebPost & { avatarBlurDataUrl: string | null })[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  // Just a flag — the actual bilingual copy renders via <T/> in JSX
  // below, same as everywhere else in this localization pass.
  const [error, setError] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ kind, cursor });
      if (query) params.set("q", query);
      if (category != null) params.set("category", String(category));
      for (const tag of tags ?? []) params.append("tag", tag);

      const res = await authFetch(`/api/feed?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("request failed");
      const data: { posts: RawFeedPost[]; next: string | null; hasMore: boolean } = await res.json();
      setPosts((prev) => [...prev, ...data.posts.map(reviveDates)]);
      setCursor(data.next);
      setHasMore(data.hasMore);
    } catch {
      setError(true);
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
              <PostCard post={post} avatarBlurDataUrl={post.avatarBlurDataUrl} />
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          <T uk="Не вдалося завантажити ще. Спробуйте ще раз." en="Couldn't load more. Try again." ru="Не получилось загрузить ещё. Попробуйте ещё раз." de="Konnte nicht mehr laden. Versuchen Sie es erneut." es="No se pudo cargar más. Inténtalo de nuevo." fr="Impossible de charger plus. Réessayez." pl="Nie udało się załadować więcej. Spróbuj ponownie." ptBR="Não foi possível carregar mais. Tente novamente." zh="加载更多失败，请重试。" />
        </p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500"
        >
          {loading ? <T uk="Завантаження…" en="Loading…" ru="Загрузка…" de="Wird geladen…" es="Cargando…" fr="Chargement…" pl="Ładowanie…" ptBR="Carregando…" zh="加载中…" /> : <T uk="Показати ще" en="Show more" ru="Показать ещё" de="Mehr anzeigen" es="Mostrar más" fr="Afficher plus" pl="Pokaż więcej" ptBR="Mostrar mais" zh="显示更多" />}
        </button>
      )}
    </>
  );
}
