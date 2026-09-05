"use client";

// components/load-more.tsx
//
// Client component: cursor-driven pagination for a feed page. Fetches
// /api/feed, never lib/a1/ directly — a "use client" file may not import
// from lib/a1/ (PLAN.md §5 rule 4).
//
// 2026-09-05 (Aleksandr: "не загружай всю ленту сразу, а показывай только
// постов 30, но потому когда пользователь будет приближаться к низу ленты
// автоматом запуская подгрузку и пагинацию, чтобы все посты подгружались
// бесшовно и при этом мы каждый раз не запрашивали весь список постов и
// не палили деньги") -- this used to be a manual "Show more" button only.
// The actual page-size-of-30 half of that request is FEED_PAGE_SIZE
// (lib/a1/feed.ts); this file is the "seamless, automatic, only fetch one
// page at a time" half: an IntersectionObserver watches a sentinel div
// placed after the loaded posts, and the moment it scrolls within
// ROOT_MARGIN of the viewport (i.e. the visitor is *approaching* the
// bottom, not already stuck there waiting), it fires the exact same
// cursor-paginated /api/feed request the old button used to -- still ONE
// page per trigger, never the whole remaining feed, so this stays exactly
// as cheap per-page as before, just without the click. The button itself
// is kept, but only as the error-state retry action (a failed page load
// stops the observer from re-triggering itself forever against the same
// broken cursor) -- everything else about the fetch/append logic is
// unchanged from the original click handler.
import { useEffect, useRef, useState } from "react";
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

// How far below the viewport the sentinel can be and still count as
// "approaching" — big enough that the next page is already in place
// before the visitor actually scrolls past the last loaded card (that's
// the "бесшовно"/seamless part), small enough that a fast scroller can't
// trigger more than one or two pages ahead of where they actually are.
const ROOT_MARGIN = "600px 0px";

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Mirrors cursor/hasMore/loading/error into refs the observer callback
  // reads synchronously -- the callback is registered once (empty deps
  // effect below) rather than re-subscribed on every state change, so it
  // needs a way to see current values without becoming a new closure
  // each render (re-creating the IntersectionObserver on every fetch
  // would also briefly stop observing mid-scroll).
  const stateRef = useRef({ cursor, hasMore, loading, error });
  stateRef.current = { cursor, hasMore, loading, error };

  async function loadMore() {
    const { cursor: currentCursor, loading: currentlyLoading } = stateRef.current;
    if (!currentCursor || currentlyLoading) return;
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ kind, cursor: currentCursor });
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

  // Auto-trigger: observes the sentinel below the loaded posts and fires
  // the exact same loadMore() the old button's onClick used to. Skips
  // re-triggering while a page is already loading or after a page failed
  // (error) -- a failed cursor request would otherwise keep re-firing on
  // every intersection/resize forever since the sentinel never leaves the
  // viewport once you're at the bottom of a short feed; the visible retry
  // button (below) is the only way forward again after an error.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore: currentHasMore, loading: currentlyLoading, error: currentError } = stateRef.current;
        if (entries[0]?.isIntersecting && currentHasMore && !currentlyLoading && !currentError) {
          void loadMore();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMore
    // itself is intentionally read off stateRef, not re-subscribed.
  }, []);

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
        <>
          {/* Invisible trigger for the automatic/seamless load -- see
              this file's own header comment. Rendered even while
              `loading`/after an `error` (the observer callback itself
              guards against re-firing then) so it doesn't pop in/out of
              the DOM and re-trigger IntersectionObserver's own initial
              callback on every fetch. */}
          <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
          {(loading || error) && (
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
      )}
    </>
  );
}
