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
    />
  );
}
