// lib/a1/media-proxy.ts
//
// 2026-09-03: split out of lib/a1/mappers.ts. Root cause of the live
// "чаты легли" crash (Aleksandr, screen recording + "Проблему с чатами
// ты так и не полечил?"): opening any individual chat
// (app/chats/[chatId]/page.tsx, a "use client" page) imported
// buildMediaProxyUrl from lib/a1/mappers.ts — and mappers.ts's very
// first import is `from "./config"`, which throws deliberately
// (`if (typeof window !== "undefined") throw ...`, see lib/a1/config.ts)
// the instant it's evaluated in a browser bundle, since it reads
// server-only secrets (A1_API_KEY etc.) at module load. Every chat page
// nav crashed into the generic error boundary before rendering anything
// (confirmed live via read_console_messages: "[lib/a1/config] imported
// from the browser — this must stay server-only").
//
// buildMediaProxyUrl()/pickDisplaySize() never actually touch config.ts
// or any server secret — they're pure string-building off already-fetched
// MediaDocument data — so the real fix is giving them their own
// server/client-safe home instead of living inside a file whose other
// exports (mapPost, mapOwnPost, ...) legitimately need config.ts's
// NULL_LOCATION_MEANS_REMOTE/PUBLISH_ONLY_NATIVE/isNativePost. mappers.ts
// re-exports both below so every existing server-side caller (API
// routes) keeps working unchanged; app/chats/[chatId]/page.tsx now
// imports straight from here instead.
import type { MediaSize } from "./schemas";

/**
 * media.getUrl needs a `size` string; we always ask for "size-photo" as
 * the display-quality option, falling back to "size-original" then
 * whatever's first if a document is missing it; "size-stripped" (an
 * inline base64 preview blob, not a fetchable size — see schemas.ts) is
 * deliberately never picked. Unconfirmed against docs: media.getUrl's
 * `size` param is assumed to accept these same `object` strings, by
 * naming-convention analogy with the Post union's own `object`
 * discriminator (PLAN.md §0.1's media.getUrl signature doesn't enumerate
 * valid values). Revisit if media.getUrl starts rejecting requests.
 */
export function pickDisplaySize(sizes: MediaSize[]): MediaSize | undefined {
  return sizes.find((s) => s.object === "size-photo") ?? sizes.find((s) => s.object === "size-original") ?? sizes[0];
}

/** Shared by mapImages()/mapAuthor() (lib/a1/mappers.ts) and the chat
 *  window's own message-media rendering: any MediaDocument (a post
 *  photo, an author's avatar doc, or a chat attachment) maps to the same
 *  /api/media proxy URL shape. */
export function buildMediaProxyUrl(doc: { _id: string; fileReference: string; sizes: MediaSize[] }): string {
  const size = pickDisplaySize(doc.sizes);
  const sizeParam = typeof size?.object === "string" ? size.object : "size-photo";
  return `/api/media/${doc._id}?ref=${encodeURIComponent(doc.fileReference)}&size=${encodeURIComponent(sizeParam)}`;
}

/** 2026-09-03 (photo-viewer's "Save" action) -- same doc, same `ref`/
 *  `size` params as buildMediaProxyUrl above, but pointed at the
 *  sibling /download route (app/api/media/[docId]/download/route.ts)
 *  instead, which streams the bytes back with a real
 *  Content-Disposition: attachment header -- see that route's own
 *  comment for why buildMediaProxyUrl's plain redirect URL can't just
 *  grow a `download` attribute instead. `filename`, when given, is
 *  purely a courtesy for the saved file's name; the route itself
 *  sanitizes it before use. */
export function buildMediaDownloadUrl(
  doc: { _id: string; fileReference: string; sizes: MediaSize[] },
  filename?: string,
): string {
  const size = pickDisplaySize(doc.sizes);
  const sizeParam = typeof size?.object === "string" ? size.object : "size-photo";
  const qs = new URLSearchParams({ ref: doc.fileReference, size: sizeParam });
  if (filename) qs.set("filename", filename);
  return `/api/media/${doc._id}/download?${qs.toString()}`;
}
