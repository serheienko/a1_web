// lib/a1/stable-media-url.ts
//
// 2026-09-04 (Aleksandr, screenshots: a just-sent multi-photo message
// stuck showing the shimmer blur placeholder instead of the real
// photos -- "Ты не полечил комбинирование фото и подгрузку через
// блюр") -- same root cause the PdfPageThumbnail fix already
// root-caused for PDF thumbnails (see app/chats/[chatId]/page.tsx's own
// cacheKey={doc._id} comment): buildMediaProxyUrl(doc) embeds
// doc.fileReference, which the backend reissues with a NEW value for
// the same document on every poll -- so a plain
// `<img src={buildMediaProxyUrl(doc)}>` gets handed a brand-new src
// string every ~poll tick even though nothing about the photo actually
// changed. A changed `src` always restarts an <img>'s load from zero,
// no matter how far the previous load had gotten -- so any photo that
// takes longer to decode than one poll interval can never finish
// loading at all, leaving MEDIA_BLUR_STYLE's shimmer background
// showing forever (lib/blur-placeholder.ts's own header explains that
// trick relies on the real image eventually painting fully over it).
// Bigger/slower photos and multi-photo grids (several images competing
// for bandwidth at once, see components/chat/photo-grid.tsx) hit this
// far more visibly than one small solo photo -- matching exactly what
// got reported (the grid's top tile happened to already be
// browser-cached from an earlier identical send, the other two never
// got the chance to finish).
//
// PdfPageThumbnail could fix this with its own cacheKey prop because it
// owns a canvas and a loading effect it controls internally; a plain
// <img> has no such hook -- the browser reloads on ANY src change, full
// stop. So instead the URL itself is memoized here, per doc._id, the
// first time each document is ever seen: every subsequent poll for the
// SAME doc._id reuses the exact same string regardless of its
// fileReference having rotated server-side, so the <img>'s src prop
// never actually changes and the browser never restarts the load. Same
// plain module-level Map pattern lib/voice-local-waveform-cache.ts's
// own header already documents for this codebase.
import { buildMediaProxyUrl } from "./media-proxy";
import type { MediaSize } from "./schemas";

const MAX_ENTRIES = 500; // short URL strings each -- generous cap for a long chat session

const cache = new Map<string, string>();

export function getStableMediaProxyUrl(doc: { _id: string; fileReference: string; sizes: MediaSize[] }): string {
  const cached = cache.get(doc._id);
  if (cached) return cached;

  const url = buildMediaProxyUrl(doc);
  cache.set(doc._id, url);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return url;
}
