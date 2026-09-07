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

// Fix Tracker (2026-09-07, "Сделай загрузку стикеров хитро... они в
// процессе подгрузки показывают скелетон лоад но как-будто их
// актульную форму, но просто темные стикеры") -- same Telegram-style
// `size-stripped` inline base64 blur-preview convention lib/a1/
// chat-schemas.ts's own mediaDocumentThumbnail() already decodes for
// photo messages (that one is typed for MessageMediaDocument's
// `object: "media-doc"` shape specifically). Stickers render from TWO
// different doc shapes depending on call site -- a sent sticker message
// (MessageMediaDocument, chat-schemas.ts) and a sticker picked from the
// picker panel (MediaDocument, schemas.ts's own `object: "media-
// document"` shape) -- so this is typed loosely against just the one
// field both actually share (`sizes`) instead of either one, and used
// by TgsSticker as the shown-while-loading preview: a real (if tiny and
// dimmed) glimpse of the sticker's own shape/colors, not a generic grey
// box, degrading to that grey box when a given document has no stripped
// entry (unconfirmed either doc shape's sticker rows in this backend
// actually carry one -- falls back harmlessly either way).
export function strippedPreviewDataUrl(doc: { sizes: Array<{ object?: string; bytes?: unknown }> }): string | null {
  const raw = doc.sizes.find((s) => s.object === "size-stripped" && typeof s.bytes === "string")?.bytes as
    | string
    | undefined;
  if (!raw) return null;
  let normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad > 0) normalized += "=".repeat(4 - pad);
  return `data:image/jpeg;base64,${normalized}`;
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
