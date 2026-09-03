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

  useEffect(() => {
    let cancelled = false;
    setThumbUrl(null);
    renderPdfFirstPageThumbnail(src).then((url) => {
      if (!cancelled) setThumbUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!thumbUrl) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a client-
    // rendered data: URL, not a next/image-eligible remote src.
    <img src={thumbUrl} alt="" className={className} />
  );
}
