// lib/covers.ts
//
// Aleksandr, 2026-08-28: "УЛЮБЛЕНЕ давай отобразим таким UI как вприложении?
// Типа такие квадратные картинки... чтобы чуть разбавить скучный профиль" —
// square cover art for the profile's favorite books/movies/games. The A1
// API only ever returns free-text title (+ author for books) for these —
// no image at all (see FavoriteBookSchema/FavoriteTitleSchema in
// lib/a1/schemas.ts) — so covers come from public third-party catalogs,
// looked up by title at render time. Best-effort: any failure (network,
// no match, missing API key) resolves to null and the profile page falls
// back to a plain colored tile — a missing cover must never break the
// page or bubble up as a thrown error.
//
// 2026-08-28 update: "обложки должны сжиматься и быть макс 100-150 кб
// каждая" + true per-image blur (not the generic shared shimmer used
// elsewhere — see lib/blur-placeholder.ts). Compression is handled by
// next/image's built-in optimizer at render time (see favoriteTile() in
// app/u/[username]/page.tsx) — this file's job is just to also hand back
// a tiny real blurred thumbnail of each cover, generated once here with
// sharp from the actual image bytes so the placeholder's colors match
// the real cover instead of a generic gray shimmer.
//
// Each fetch is wrapped in React's cache() for per-request dedup, same
// pattern as lib/a1/datasets.ts.

import { cache } from "react";
import sharp from "sharp";

const FETCH_TIMEOUT_MS = 4000;

export type CoverImage = {
  url: string;
  /** data: URI of a tiny blurred JPEG, or null if generation failed. */
  blurDataUrl: string | null;
};

async function safeFetchJson(url: string): Promise<unknown | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      // Covers don't change once matched; a day's staleness is fine and
      // saves hammering these third-party APIs on every profile view.
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches the actual cover image bytes and boils them down to a tiny
 * (16x16) blurred JPEG, base64-encoded as a data: URI — cheap enough to
 * inline directly in the page, but colored like the real cover so the
 * loading state feels alive instead of a generic gray box. Any failure
 * (network, decode, unsupported format) just yields no blur — the real
 * cover still loads fine without one.
 */
async function generateBlurDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const tiny = await sharp(buffer)
      .resize(16, 16, { fit: "cover" })
      .jpeg({ quality: 40 })
      .toBuffer();
    return `data:image/jpeg;base64,${tiny.toString("base64")}`;
  } catch {
    return null;
  }
}

async function withBlur(url: string | null): Promise<CoverImage | null> {
  if (!url) return null;
  return { url, blurDataUrl: await generateBlurDataUrl(url) };
}

/**
 * Open Library's search API is free and keyless — no env var required,
 * so book covers work out of the box with no setup.
 */
export const fetchBookCoverUrl = cache(async function fetchBookCoverUrl(
  title: string,
  author: string,
): Promise<CoverImage | null> {
  if (!title.trim()) return null;
  const q = new URLSearchParams({
    title,
    ...(author.trim() ? { author } : {}),
    limit: "1",
    fields: "cover_i",
  });
  const data = (await safeFetchJson(`https://openlibrary.org/search.json?${q}`)) as
    | { docs?: Array<{ cover_i?: number }> }
    | null;
  const coverId = data?.docs?.[0]?.cover_i;
  const url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
  return withBlur(url);
});

/**
 * Requires TMDB_API_KEY (free — themoviedb.org account → Settings → API).
 * Returns null (falls back to the plain tile) when the key isn't set, so
 * this is safe to ship before the key exists.
 */
export const fetchMovieCoverUrl = cache(async function fetchMovieCoverUrl(
  title: string,
): Promise<CoverImage | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !title.trim()) return null;
  const q = new URLSearchParams({ api_key: apiKey, query: title });
  const data = (await safeFetchJson(`https://api.themoviedb.org/3/search/movie?${q}`)) as
    | { results?: Array<{ poster_path?: string | null }> }
    | null;
  const posterPath = data?.results?.[0]?.poster_path;
  const url = posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null;
  return withBlur(url);
});

/**
 * Requires RAWG_API_KEY (free — rawg.io/apidocs → sign up). Returns null
 * (falls back to the plain tile) when the key isn't set.
 */
export const fetchGameCoverUrl = cache(async function fetchGameCoverUrl(
  title: string,
): Promise<CoverImage | null> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey || !title.trim()) return null;
  const q = new URLSearchParams({ key: apiKey, search: title, page_size: "1" });
  const data = (await safeFetchJson(`https://api.rawg.io/api/games?${q}`)) as
    | { results?: Array<{ background_image?: string | null }> }
    | null;
  const url = data?.results?.[0]?.background_image ?? null;
  return withBlur(url);
});
