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
// Each fetch is wrapped in React's cache() for per-request dedup, same
// pattern as lib/a1/datasets.ts.

import { cache } from "react";

const FETCH_TIMEOUT_MS = 4000;

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
 * Open Library's search API is free and keyless — no env var required,
 * so book covers work out of the box with no setup.
 */
export const fetchBookCoverUrl = cache(async function fetchBookCoverUrl(
  title: string,
  author: string,
): Promise<string | null> {
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
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
});

/**
 * Requires TMDB_API_KEY (free — themoviedb.org account → Settings → API).
 * Returns null (falls back to the plain tile) when the key isn't set, so
 * this is safe to ship before the key exists.
 */
export const fetchMovieCoverUrl = cache(async function fetchMovieCoverUrl(
  title: string,
): Promise<string | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !title.trim()) return null;
  const q = new URLSearchParams({ api_key: apiKey, query: title });
  const data = (await safeFetchJson(`https://api.themoviedb.org/3/search/movie?${q}`)) as
    | { results?: Array<{ poster_path?: string | null }> }
    | null;
  const posterPath = data?.results?.[0]?.poster_path;
  return posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null;
});

/**
 * Requires RAWG_API_KEY (free — rawg.io/apidocs → sign up). Returns null
 * (falls back to the plain tile) when the key isn't set.
 */
export const fetchGameCoverUrl = cache(async function fetchGameCoverUrl(
  title: string,
): Promise<string | null> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey || !title.trim()) return null;
  const q = new URLSearchParams({ key: apiKey, search: title, page_size: "1" });
  const data = (await safeFetchJson(`https://api.rawg.io/api/games?${q}`)) as
    | { results?: Array<{ background_image?: string | null }> }
    | null;
  return data?.results?.[0]?.background_image ?? null;
});
