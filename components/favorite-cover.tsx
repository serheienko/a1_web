// components/favorite-cover.tsx
//
// 2026-08-31, live-testing feedback (screenshot: a book with no cover
// found showing an empty gray square, and a game whose cover URL 404'd
// showing the browser's own broken-image glyph): "Если не находит медиа
// - не показываем серый квадратик, только название." That round's fix
// dropped the tile entirely (both the server "no cover found" case and
// this file's own client-side "cover URL failed to load" case rendered
// nothing but the title) -- correct call at the time, but it left a
// title-only row sitting in the same grid as square cover tiles right
// next to it, visually breaking the grid (this session's own screenshot
// of "The Witcher" next to "Mafia" in the Games row).
//
// 2026-09-01 fix ("А как бы ты элегантно полечил этот момент?"): keep
// the "never show a literally-empty gray box" rule, but fill the same
// square slot with a muted, category-appropriate icon instead of
// skipping the tile altogether -- reads as "no artwork for this one",
// not as a layout bug. Same trick lib/avatars.ts's cat-avatar fallback
// already uses for missing user photos, just icon-based here since
// there's no natural "seeded random cover" equivalent for books/movies/
// games the way there is for people.
"use client";

import { useState, type ReactElement } from "react";
import Image from "next/image";
import type { CoverImage } from "@/lib/covers";

export type FavoriteKind = "book" | "movie" | "game";

function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
    </svg>
  );
}

function MovieIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 5 6 9M13 5l-2 4M18 5l-2 4" />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 9v4M5 11h4" />
      <circle cx="16" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M6.5 7h11a4 4 0 0 1 3.98 4.4l-.5 4.6a2.3 2.3 0 0 1-4.14 1.2L15 15H9l-1.84 2.2a2.3 2.3 0 0 1-4.14-1.2l-.5-4.6A4 4 0 0 1 6.5 7Z" />
    </svg>
  );
}

const KIND_ICON: Record<FavoriteKind, () => ReactElement> = {
  book: BookIcon,
  movie: MovieIcon,
  game: GameIcon,
};

/** The "no artwork" tile -- same square slot, a muted category icon instead of empty. */
export function FavoriteCoverFallback({ kind }: { kind: FavoriteKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600">
      <Icon />
    </div>
  );
}

export function FavoriteCover({ cover, kind }: { cover: CoverImage; kind: FavoriteKind }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FavoriteCoverFallback kind={kind} />;
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
