// components/cached-avatar.tsx
//
// 2026-09-05 (Aleksandr: "Сделай кеширование аватаров в чат-листе, а то
// они кажд раз подгружаются через блюр, а надо один раз загрузить и
// чтобы были загруженные уже") -- thin wrapper around next/image that
// checks lib/avatar-image-cache.ts's persistent (Cache Storage-backed)
// blob cache first. First time this avatar doc is ever seen (anywhere
// on the site, any tab), it renders exactly as before -- next/image's
// own blur-up placeholder while the real src loads -- and kicks off a
// background fetch that persists the decoded bytes to disk. Every time
// after that, on this device, it renders straight from the cached
// Blob via a plain <img>: no network round-trip, no placeholder, no
// flash, regardless of how long it's been or whether the underlying
// signed S3 URL's own 45s/120s cache window has long since expired
// (see app/api/media/[docId]/route.ts's own header for that window).
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getCachedAvatarObjectUrl, warmAvatarCache } from "@/lib/avatar-image-cache";

export function CachedAvatar({
  src,
  blurDataURL,
  size,
  className,
  alt = "",
}: {
  src: string;
  blurDataURL: string;
  size: number;
  className?: string;
  alt?: string;
}) {
  const [cachedSrc, setCachedSrc] = useState<string | null>(() => getCachedAvatarObjectUrl(src));
  // Fix Tracker (2026-09-07, Aleksandr: "Мб эту иконку тоже будем
  // подгружать через блюр? А то её иногда выбивает и она выглядит
  // знаком вопроса") -- the default cat-mascot avatars (lib/avatars.ts)
  // link straight to a public S3 bucket, not this app's own /api/media
  // proxy the way a real uploaded photo does, so they're the ones most
  // exposed to a plain network hiccup -- and next/image's <Image>
  // below had no onError handling at all, so a failed fetch just fell
  // through to the browser's own broken-image glyph (which is exactly
  // what a "question mark icon" is). `loadFailed` catches that and
  // re-renders the already-decoded blurDataURL itself as a plain
  // <img> -- it's inline base64, so it can't fail to load -- instead
  // of leaving the broken icon on screen. Resets whenever `src`
  // changes so a genuinely different avatar gets its own fresh try.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  useEffect(() => {
    if (cachedSrc) return;
    let cancelled = false;
    warmAvatarCache(src).then((url) => {
      if (!cancelled && url) setCachedSrc(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (cachedSrc) {
    // eslint-disable-next-line @next/next/no-img-element -- an
    // in-memory blob: URL, not a next/image-configured remote host.
    return <img src={cachedSrc} alt={alt} width={size} height={size} className={className} />;
  }

  if (loadFailed) {
    // eslint-disable-next-line @next/next/no-img-element -- inline
    // base64 data: URL, nothing for next/image to optimize or proxy.
    return <img src={blurDataURL} alt={alt} width={size} height={size} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      placeholder="blur"
      blurDataURL={blurDataURL}
      unoptimized
      onError={() => setLoadFailed(true)}
    />
  );
}
