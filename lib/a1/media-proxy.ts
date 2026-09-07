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
// Fix Tracker (2026-09-07, order 68 follow-up): strippedPreviewDataUrl()
// above degrades to the plain grey box for EVERY sticker on this
// backend -- confirmed live (2026-09-07, /api/chats/stickers/recent
// and /api/chats/stickers/sets responses) that sticker MediaDocuments
// here only ever carry `size-original` and `size-path` entries, never
// `size-stripped`. `size-path` turns out to be exactly the right tool
// for this job instead: Telegram's `photoPathSize` vector-thumbnail
// format (TL: photoPathSize#d8214d41, type "j" -- see
// https://core.telegram.org/constructor/photoPathSize and the "Vector
// thumbnails" section of https://core.telegram.org/api/files),
// designed specifically to show an outline of a sticker before its
// real (Lottie/.tgs) animation has loaded. Confirmed correct by
// decoding this app's own live sticker data and rendering the result
// as an actual <path> -- it reproduces a recognizable cat-silhouette
// outline for the MR.KIT pack's stickers, not garbage.
//
// Decode algorithm ported from gotd/td's DecodePathTo (MIT licensed,
// github.com/gotd/td/blob/v0.161.0/telegram/thumbnail/svg.go), which
// itself implements the format documented at the URL above: `bytes` is
// base64 (this backend's usual URL-safe variant, same normalization as
// strippedPreviewDataUrl) of a raw byte string; each byte maps either
// to a literal path-command/punctuation character (bytes >= 192, via
// the 64-entry `lookup` table) or to a signed small integer emitted as
// a decimal digit sequence (bytes < 192, sign from the 64/128 range,
// value from the low 6 bits) forming the coordinate list between
// commands. The whole thing is wrapped M...z and is meant for a
// `viewBox="0 0 512 512"` per Telegram's own doc comment.
const VECTOR_PATH_LOOKUP = "AACAAAAHAAALMAAAQASTAVAAAZaacaaaahaaalmaaaqastava.az0123456789-,";

export function decodeStickerPathPreview(doc: { sizes: Array<{ object?: string; bytes?: unknown }> }): string | null {
  const raw = doc.sizes.find((s) => s.object === "size-path" && typeof s.bytes === "string")?.bytes as
    | string
    | undefined;
  if (!raw) return null;
  let normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad > 0) normalized += "=".repeat(4 - pad);
  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    return null;
  }
  let d = "M";
  for (let i = 0; i < binary.length; i++) {
    const num = binary.charCodeAt(i);
    if (num >= 128 + 64) {
      d += VECTOR_PATH_LOOKUP[num - 128 - 64];
    } else {
      if (num >= 128) d += ",";
      else if (num >= 64) d += "-";
      d += String(num & 63);
    }
  }
  return d + "z";
}

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
