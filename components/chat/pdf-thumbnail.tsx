// components/chat/pdf-thumbnail.tsx
//
// 2026-09-03 -- renders lib/pdf-thumbnail.ts's rasterized first page as
// a plain <img>, showing `fallback` (this app's own ChatFileTypeIcon
// badge) until it resolves and permanently instead if it never does
// (see that file's own header for every way this degrades gracefully).
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { renderPdfFirstPageThumbnail, getCachedPdfThumbnail } from "@/lib/pdf-thumbnail";

type Props = {
  src: string;
  // Stable identity for the document (its own `_id`) -- defaults to
  // `src` for a caller that has no better one (a still-compose-time
  // blob: URL, which never rotates anyway). See lib/pdf-thumbnail.ts's
  // own header, round three: pass this whenever `src` is a proxy URL
  // built off a server-issued `ref` that can itself change value
  // between polls even though the document hasn't -- without it, every
  // poll looks like a brand new document to the cache below.
  cacheKey?: string;
  className?: string;
  fallback: ReactNode;
};

export function PdfPageThumbnail({ src, cacheKey, className, fallback }: Props) {
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
  //
  // 2026-09-04 follow-up (Aleksandr, still flickering on a screen
  // recording: "файлы моргают всё равно") -- that first pass only
  // covered the PENDING-vs-FAILED flash; it didn't cover an ALREADY-
  // RESOLVED one. This component doesn't remount on every messages
  // poll, but its effect still re-runs (same `[src]` dependency), and
  // used to unconditionally reset BOTH pieces of state back to the
  // pending placeholder before the (fast, cache-hit) promise's `.then()`
  // could restore them -- a genuine flash every poll on an already-
  // loaded thumbnail. Seeding both bits of state straight from
  // lib/pdf-thumbnail.ts's own synchronous resolvedCache (via a lazy
  // useState initializer, so it's read once per mount, not every
  // render) covers the very first paint; the early-return inside the
  // effect below covers every re-run after that -- neither path resets
  // to "pending" when the real answer is already known.
  //
  // 2026-09-04, round three (Aleksandr, moggering confirmed AGAIN on a
  // fresh recording after round two shipped, this time frame-diffed
  // rather than eyeballed) -- round two's cache still keyed everything
  // by `src` itself. Live-tested against the real API (two fetches,
  // 3.5s apart): the backend hands out a genuinely different
  // `fileReference` for the SAME document on the very next poll, and
  // that value is embedded verbatim in `src` (see lib/a1/media-proxy.ts's
  // buildMediaProxyUrl) -- so `src` was itself rotating every poll,
  // which is a guaranteed cache miss no matter how good the cache is.
  // `key` now defaults to `cacheKey ?? src` throughout, and every call
  // site that has a stable id for the document (see page.tsx's own
  // `doc._id`) passes it -- `src` still carries whatever `ref` is
  // CURRENTLY valid for the actual pdf.js fetch, `key` is what both
  // caches below are actually keyed and looked up by.
  const key = cacheKey ?? src;
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => getCachedPdfThumbnail(key) ?? null);
  const [failed, setFailed] = useState(() => getCachedPdfThumbnail(key) === null);

  useEffect(() => {
    let cancelled = false;
    const already = getCachedPdfThumbnail(key);
    if (already !== undefined) {
      setThumbUrl(already);
      setFailed(already === null);
      return;
    }
    setThumbUrl(null);
    setFailed(false);
    renderPdfFirstPageThumbnail(src, key).then((url) => {
      if (cancelled) return;
      if (url) setThumbUrl(url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately
    // NOT keyed on `src`: a `src` that only changed because `ref` rotated
    // (same document, see this effect's own header above) must NOT
    // re-run this effect -- `key` alone is the real identity here, and
    // `src` is read fresh from the closure the one time this effect
    // actually does run for a given `key`.
  }, [key]);

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
