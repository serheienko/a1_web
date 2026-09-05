// components/chat/blurred-photo.tsx
//
// 2026-09-05 follow-up (Aleksandr, new bug-list entry: "Сделай
// подгрузку всех фото через их блюр, то есть самая легкая размытая
// версия картинки, но цветная, прикольная") -- the colorful per-photo
// blur placeholder built for grouped photos (photo-grid.tsx's own
// GridPhoto, commit 1693e92: a 16x16 canvas snapshot of the real photo,
// cached by doc._id in lib/photo-blur-cache.ts, shown blurred until the
// full image decodes) generalized into a standalone `<img>` so every
// OTHER photo surface in the chat UI (solo image bubbles -- there was
// never a reason to limit this to just the grouped-album case) gets the
// same real-colors-not-grey-shimmer treatment instead of duplicating
// this same state/effect at each call site.
//
// 2026-09-05 second follow-up (Aleksandr, live screenshot: a freshly
// loaded chat's grouped photos still showing plain white tiles -- "я
// хочу, чтобы сначала показывался блюр самой картинки с минимальным
// весом") -- the canvas-snapshot cache above only ever has data on a
// REPEAT view; a genuinely first load has nothing to snapshot from
// yet. `serverThumb` is the real fix for that first paint: chat-server
// already sends a tiny inline blurred preview on the message itself
// (lib/a1/chat-schemas.ts's mediaDocumentThumbnail(), Telegram's own
// `size-stripped` convention) -- shown immediately, no loading involved
// at all, with the client-snapshotted `blurUrl` still taking over once
// a real view has captured this exact photo's own colors (marginally
// sharper since it is a real crop of the full image rather than a
// generic stripped preview, and doesn't depend on the caller having
// this field at all for older call sites that don't pass it yet).
"use client";

import { useState, type MouseEventHandler, type SyntheticEvent } from "react";
import { MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";
import { getPhotoBlur, rememberPhotoBlur } from "@/lib/photo-blur-cache";

export function BlurredChatPhoto({
  docId,
  src,
  serverThumb,
  alt = "",
  className,
  onClick,
  draggable,
}: {
  // Cache key -- see lib/photo-blur-cache.ts's own header on why this
  // must be the document's stable `_id`, never its rotating
  // `fileReference`.
  docId: string;
  src: string;
  // The message's own `size-stripped` preview (mediaDocumentThumbnail())
  // -- a real blurred placeholder available from the very first render,
  // no earlier view needed. Optional: older/other call sites (a local
  // blob preview before upload, say) simply have none to give.
  serverThumb?: string | null;
  alt?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLImageElement>;
  draggable?: boolean;
}) {
  const [blurUrl, setBlurUrl] = useState<string | null>(() => getPhotoBlur(docId) ?? serverThumb ?? null);
  // See GridPhoto's own header comment (photo-grid.tsx) for why this
  // flag exists -- CSS `filter` composites over an element's WHOLE
  // rendered output, not just a background layer, so the placeholder
  // style must be dropped entirely once the real image has painted,
  // not just left to be "covered up".
  const [loaded, setLoaded] = useState(false);

  function handleLoad(e: SyntheticEvent<HTMLImageElement>) {
    setLoaded(true);
    if (getPhotoBlur(docId)) return; // already warmed by an earlier view of this same doc
    const img = e.currentTarget;
    try {
      const size = 16;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
      rememberPhotoBlur(docId, dataUrl);
      setBlurUrl(dataUrl);
    } catch {
      // Best-effort only -- MEDIA_BLUR_STYLE stays the fallback forever
      // for this doc, same as before this cache existed.
    }
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- proxied
    // through /api/media, not a next/image-configured remote host.
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      onLoad={handleLoad}
      className={className}
      draggable={draggable}
      style={
        loaded
          ? undefined
          : blurUrl
            ? { backgroundImage: `url(${blurUrl})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(14px)" }
            : MEDIA_BLUR_STYLE
      }
    />
  );
}
