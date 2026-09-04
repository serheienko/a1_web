// lib/blur-placeholder.ts
//
// Aleksandr, 2026-08-27: "Сделай подгрузку аватаров и всех фото через
// light версию blur эффекта этой картинки. У нас есть такое в
// приложении, не знаю как правильно называется, + добавь lazy load
// effect" — a blur-up placeholder while avatars/photos load, plus lazy
// loading.
//
// next/image's `loading="lazy"` is already the DEFAULT for every <Image>
// that isn't marked `priority` (the gallery's first/only photo and the
// above-the-fold cases correctly opt out of it already) — the piece
// actually missing was the blur placeholder itself.
//
// A true per-photo blurred thumbnail ("BlurHash"-style, generated from
// the real pixels) needs the original image decoded server-side at
// upload/build time, which isn't available here — avatars and post
// photos are opaque remote URLs served by the app's own media CDN, not
// local files this project controls or can pre-process. So this is
// deliberately the "light version" Aleksandr called it: one small
// shimmering placeholder shared by every avatar/photo, in the app's own
// neutral tone, that fades out the instant the real image paints in —
// the same shimmer-placeholder trick from Next.js's own blur-up example.
import type { CSSProperties } from "react";

function shimmer(w: number, h: number) {
  return `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop stop-color="#e5e5e5" offset="20%" />
      <stop stop-color="#f2f2f2" offset="50%" />
      <stop stop-color="#e5e5e5" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#e5e5e5" />
  <rect width="${w}" height="${h}" fill="url(#g)" />
</svg>`;
}

function toBase64(str: string) {
  return typeof window === "undefined" ? Buffer.from(str).toString("base64") : window.btoa(str);
}

// Blurred by next/image's own CSS (a heavy blur filter over this,
// scaled to cover) regardless of the real photo's aspect ratio, so one
// fixed small square works for avatars, square gallery tiles, and wide
// single-photo posts alike.
export const BLUR_DATA_URL = `data:image/svg+xml;base64,${toBase64(shimmer(64, 64))}`;

// 2026-09-04 (Aleksandr: "Подгрузку медиа в чатах делай так же через
// блюр эффект, как у нас подгружаются аватарки") -- chat photo bubbles
// (app/chats/[chatId]/page.tsx, components/chat/photo-grid.tsx,
// components/mini-chat-window.tsx) render real, proxied /api/media
// photos through a plain <img> rather than next/image (they're a
// same-origin API route, not a next/image-configured remote host, per
// each of those call sites' own eslint-disable comment) -- so they
// can't take next/image's `placeholder="blur"` prop the way avatars do.
// Same shimmer square as BLUR_DATA_URL above, applied instead as a CSS
// background on the <img> itself: a loading/broken <img> paints no
// pixels of its own, so the background shows through underneath until
// the real photo decodes and fully covers it (object-cover on both
// keeps the crop identical) -- no separate loaded-state or onLoad
// handler needed, same "light version, not a true per-photo blurhash"
// tradeoff BLUR_DATA_URL's own header already explains.
export const MEDIA_BLUR_STYLE: CSSProperties = {
  backgroundImage: `url(${BLUR_DATA_URL})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
};
