// components/favorite-cover.tsx
//
// 2026-08-31, live-testing feedback (screenshot: a book with no cover
// found showing an empty gray square, and a game whose cover URL 404'd
// showing the browser's own broken-image glyph): "Если не находит медиа
// - не показываем серый квадратик, только название."
//
// app/u/[username]/page.tsx's favoriteTile() is server-rendered (the
// whole page is), so it already skips the <Image> tag when
// lib/covers.ts's cover lookup comes back null — but the square
// bg-neutral-100 box around it used to render unconditionally either
// way, which is what produced the empty gray tile (no cover found at
// request time -- this session's own Шантарам example: Open Library had
// no match). That half is a pure server-side fix (see page.tsx's
// favoriteTile, which now only renders this component at all when
// `cover` is non-null).
//
// The OTHER half -- a cover URL that WAS found server-side (so `cover`
// is non-null and this component does render) but fails to actually
// load in the browser afterwards (this session's own Witcher example:
// RAWG returned a background_image URL, next/image's remote host is
// already allow-listed in next.config.ts, but the fetch itself failed at
// request time -- a dead/expired asset URL, not a config problem) -- can
// only be caught client-side, via <Image>'s onError, which is why this
// one piece needs its own "use client" boundary rather than living
// directly in the server-rendered page. Once it fails, this renders
// nothing at all rather than falling back to a broken-image icon or an
// empty box -- title-only, exactly what was asked for.
"use client";

import { useState } from "react";
import Image from "next/image";
import type { CoverImage } from "@/lib/covers";

export function FavoriteCover({ cover }: { cover: CoverImage }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
      <Image
        src={cover.url}
        alt=""
        fill
        quality={60}
        sizes="(min-width: 640px) 200px, 33vw"
        className="object-cover"
        placeholder={cover.blurDataUrl ? "blur" : "empty"}
        blurDataURL={cover.blurDataUrl ?? undefined}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
