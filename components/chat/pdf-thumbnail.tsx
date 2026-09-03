// components/chat/pdf-thumbnail.tsx
//
// 2026-09-03 -- renders lib/pdf-thumbnail.ts's rasterized first page as
// a plain <img>, showing `fallback` (this app's own ChatFileTypeIcon
// badge) until it resolves and permanently instead if it never does
// (see that file's own header for every way this degrades gracefully).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { renderPdfFirstPageThumbnail } from "@/lib/pdf-thumbnail";

type Props = {
  src: string;
  className?: string;
  fallback: ReactNode;
};

export function PdfPageThumbnail({ src, className, fallback }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  // 2026-09-03 (Aleksandr, live screen recording: "файл почему-то
  // колбасит между превью и расширением PDF") -- renderPdfFirstPageThumbnail
  // lazy-loads pdf.js from cdnjs on first use and then decodes/rasterizes
  // the page, both genuinely async (see that file's own header) -- this
  // used to show `fallback` (the colored ChatFileTypeIcon PDF badge)
  // for that whole window, so the eventual real thumbnail popping in
  // read as the icon "changing its mind" rather than a load finishing.
  // `failed` now only turns true once the promise actually RESOLVES to
  // null (a genuine, permanent failure) -- while it's merely still
  // pending, a neutral pulse placeholder shows in the same slot instead,
  // so `fallback`'s own colored badge only ever appears as a true dead
  // end, never as a mid-load flash.
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setThumbUrl(null);
    setFailed(false);
    renderPdfFirstPageThumbnail(src).then((url) => {
      if (cancelled) return;
      if (url) setThumbUrl(url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (thumbUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a client-
      // rendered data: URL, not a next/image-eligible remote src.
      <img src={thumbUrl} alt="" className={className} />
    );
  }
  if (failed) return <>{fallback}</>;
  return <div className={`${className} animate-pulse bg-black/10 dark:bg-white/10`} aria-hidden="true" />;
}
