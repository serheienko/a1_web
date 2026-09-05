// lib/photo-blur-cache.ts
//
// 2026-09-05 (Aleksandr, screenshot of a grouped chat-photo message
// still showing the generic flat-grey shimmer while its photos
// decoded: "Сделай подгрузку фото через блюр, именно этих фоток, чтобы
// были цвета прикольные") -- lib/blur-placeholder.ts's own
// MEDIA_BLUR_STYLE is deliberately a single shared grey/white shimmer
// (its own header already explains why: a true per-photo blur needs
// the real pixels, which this app can't pre-generate server-side) --
// exactly the "не прикольные цвета" being reported. This is that real
// per-photo version for components/chat/photo-grid.tsx specifically:
// once a photo's own <img> finishes loading, its real pixels ARE
// sitting right there in the DOM, so a tiny downscaled snapshot
// (canvas.drawImage into a 16x16 canvas, toDataURL) captures that
// exact photo's own actual colors -- browsers upscale a background-
// image that small back up to fill the tile with the same soft
// bilinear blur BLUR_DATA_URL's own shimmer SVG already relies on, so
// this reads as "blur effect, but with this photo's own colors"
// exactly as asked, no extra blur library or server-side work needed.
//
// Session-only in-memory Map, same simple pattern lib/voice-local-
// waveform-cache.ts already uses for a similarly small, cheap-to-
// regenerate per-doc value (a handful of KB, capped) -- NOT the
// persistent Cache Storage layer lib/avatar-image-cache.ts uses for
// full photo bytes, since this is only ever a stand-in for the instant
// before the real photo (already being fetched in parallel) paints
// over it; losing it on a hard reload just means one more render shows
// the plain shimmer again, same as before this file existed.
//
// Keyed by the doc's own stable `_id` -- NOT fileReference, which
// lib/a1/stable-media-url.ts's own header already proved this backend
// reissues with a new value for the same document on every poll (the
// same rotation bug this app has now independently hit and fixed for
// photo thumbnails, the voice waveform cache, and PdfPageThumbnail).
const MAX_ENTRIES = 200; // small data URLs (a 16x16 JPEG, a few KB) -- generous cap for a long chat session

const cache = new Map<string, string>();

export function rememberPhotoBlur(docId: string, dataUrl: string): void {
  if (!docId || !dataUrl) return;
  cache.delete(docId); // re-insert at the end so eviction below stays LRU-ish
  cache.set(docId, dataUrl);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

export function getPhotoBlur(docId: string): string | null {
  return cache.get(docId) ?? null;
}
