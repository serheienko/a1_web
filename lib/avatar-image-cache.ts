// lib/avatar-image-cache.ts
//
// 2026-09-05 (Aleksandr: "Сделай кеширование аватаров в чат-листе, а то
// они кажд раз подгружаются через блюр, а надо один раз загрузить и
// чтобы были загруженные уже") -- chat.avatarUrl is already PINNED to
// the first value seen within one page session (see app/chats/page.tsx
// and components/chats-flyout.tsx's own pinnedAvatarUrls comment, fixed
// 2026-09-04 for the mid-session poll-rotation case), so within one tab
// the <img> src genuinely never changes. What that pin does NOT survive
// is a fresh page load: a new tab, a reload, or coming back later --
// the browser's own HTTP cache for /api/media/<id> is deliberately
// short-lived (see that route's own header: the S3 redirect target
// itself expires in 120s, so the route caps Cache-Control at 45s), so
// any revisit past that window re-triggers the full network round-trip
// and next/image's blur placeholder shows again, however briefly --
// exactly the "каждый раз подгружаются через блюр" he's reporting.
//
// Fix: an application-level, persistent-on-disk cache of the actual
// decoded image BYTES, keyed by the doc's stable _id (never the
// volatile fileReference/signed-url) via the browser's Cache Storage
// API (window.caches -- durable across reloads/tabs on this origin,
// unlike an in-memory Map). Fetched once via the sibling /download
// route (same-origin streamed bytes, not the redirect-to-S3 proxy --
// see that route's own header for why a cross-origin redirect can't be
// fetch()'d directly, same CORS issue 6.176 root-caused for the voice
// waveform decode) and kept as a real Blob, so a later visit renders
// straight from disk with zero network involved and no blur at all.
"use client";

const CACHE_NAME = "a1-avatar-cache-v1";

// This tab's own hot path -- avoids even the async Cache Storage read
// for an avatar already resolved once during this page's lifetime.
const memoryCache = new Map<string, string>();

// buildMediaProxyUrl() (lib/a1/media-proxy.ts) always shapes this as
// `/api/media/<docId>?ref=...&size=...`; docId is the one stable part.
function extractDocId(proxyUrl: string): string | null {
  const m = /^\/api\/media\/([^/?]+)/.exec(proxyUrl);
  return m ? m[1]! : null;
}

// buildMediaDownloadUrl()'s sibling shape is identical except for the
// inserted `/download` segment and both routes accept the exact same
// `ref`/`size` query params -- cheaper than threading a whole
// MediaDocument through every avatar call site just to rebuild it.
function toDownloadUrl(proxyUrl: string): string {
  return proxyUrl.replace(/^(\/api\/media\/[^/?]+)(\?|$)/, "$1/download$2");
}

/** Synchronous, memory-only lookup -- safe to call during render for
 *  the `useState(() => ...)` initializer so an avatar already warmed
 *  this tab never even flashes a placeholder on a re-render. */
export function getCachedAvatarObjectUrl(proxyUrl: string): string | null {
  const docId = extractDocId(proxyUrl);
  if (!docId) return null;
  return memoryCache.get(docId) ?? null;
}

/** Resolves once the avatar's bytes are available locally -- from this
 *  tab's memory, from disk (Cache Storage), or freshly fetched (and
 *  then persisted to both for next time). `null` on any failure
 *  (offline, unsupported browser, a 404) -- callers fall back to the
 *  existing next/image `src` in that case, same as before this cache
 *  existed. Never throws. */
export async function warmAvatarCache(proxyUrl: string): Promise<string | null> {
  const docId = extractDocId(proxyUrl);
  if (!docId) return null;

  const hot = memoryCache.get(docId);
  if (hot) return hot;

  if (typeof window === "undefined" || !("caches" in window)) return null;

  const cacheKey = `https://a1-avatar-cache.local/${docId}`;
  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const blob = await hit.blob();
      const url = URL.createObjectURL(blob);
      memoryCache.set(docId, url);
      return url;
    }

    const res = await fetch(toDownloadUrl(proxyUrl));
    if (!res.ok) return null;
    const blob = await res.blob();
    // Best-effort persist -- a write failure (private browsing, quota)
    // still lets this visit render from the freshly-fetched blob.
    cache.put(cacheKey, new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } })).catch(() => {});
    const url = URL.createObjectURL(blob);
    memoryCache.set(docId, url);
    return url;
  } catch {
    return null;
  }
}
