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

// 2026-09-02: `size` made overridable (was a hardcoded 28) so the same
// three icons can also sit inside components/favorite-cover.tsx's own
// FavoriteFallbackPill below at a smaller, pill-appropriate size instead
// of forking a second copy of each glyph.
function BookIcon({ size = 28 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v18h6.5a1.5 1.5 0 0 0 1.5-1.5v-15Z" />
    </svg>
  );
}

function MovieIcon({ size = 28 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M8 5 6 9M13 5l-2 4M18 5l-2 4" />
    </svg>
  );
}

function GameIcon({ size = 28 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 9v4M5 11h4" />
      <circle cx="16" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M6.5 7h11a4 4 0 0 1 3.98 4.4l-.5 4.6a2.3 2.3 0 0 1-4.14 1.2L15 15H9l-1.84 2.2a2.3 2.3 0 0 1-4.14-1.2l-.5-4.6A4 4 0 0 1 6.5 7Z" />
    </svg>
  );
}

const KIND_ICON: Record<FavoriteKind, (props?: { size?: number }) => ReactElement> = {
  book: BookIcon,
  movie: MovieIcon,
  game: GameIcon,
};

/** The "no artwork" tile -- same square slot, a muted category icon instead of empty.
 *
 * 2026-09-02 (Aleksandr, screenshot of a profile's Улюблене/Favorites
 * grid: "которые не нашлись показывай другим цветом, заливка как на
 * кнопках вакансії/фахівці FFFFFF 100%"): was bg-neutral-100, close
 * enough to the page's own bg-app ground that a "no cover found" tile
 * barely read as its own shape. Solid white now, matching components/
 * site-nav.tsx's Вакансії/Фахівці pill exactly (bg-white / dark:bg-
 * neutral-900) -- the one other "flat white chip on this same gray
 * page" reference already in the app.
 */
export function FavoriteCoverFallback({ kind }: { kind: FavoriteKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex aspect-square items-center justify-center rounded-xl bg-white text-neutral-300 dark:bg-neutral-900 dark:text-neutral-600">
      <Icon />
    </div>
  );
}

// 2026-09-02 (Aleksandr, voice note on this exact square fallback:
// "цей темний квадрат, він якийсь невиликойний... зроби пілюлю, як у
// нас стиль роботи вище, тільки вона буде двохповерхова" -- a two-
// story pill like the Work Style chips (app/u/[username]/page.tsx's
// own WORK_STYLE_PREFERENCE_SECTIONS block) instead of this square icon
// tile): used ONLY for an item lib/covers.ts never found a cover for at
// all (cover === null at render time, decided server-side) -- an item
// whose cover URL was found but fails to actually load in the browser
// still falls back to the square FavoriteCoverFallback above via
// FavoriteCover's own onError, preserving the exact grid-alignment fix
// that tile's own header comment describes (mixing a wide pill into a
// grid row that still has real square covers next to it would
// reintroduce that same "breaks the grid" bug). app/u/[username]/
// page.tsx's render splits each category's items on `cover !== null`
// for exactly this reason -- see that file's own comment where it does.
// "Two-story": icon on the left, title on top, the (optional) subtitle
// -- an author, for books -- as its own smaller line underneath, no
// truncation the way the grid tile's line-clamp needs (a pill can just
// wrap or grow, it isn't sharing a fixed-width grid cell with anything).
export function FavoriteFallbackPill({
  kind,
  title,
  subtitle,
}: {
  kind: FavoriteKind;
  title: string;
  subtitle?: string | null;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 dark:border-neutral-800 dark:bg-neutral-900/60">
      <span className="shrink-0 text-neutral-400 dark:text-neutral-500">
        <Icon size={18} />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-200">{title}</span>
        {subtitle && (
          <span className="text-xs leading-snug text-neutral-400 dark:text-neutral-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

// 2026-09-03 (Aleksandr, live screenshot of a Games row: "Ігри" showing
// the big square gamepad-icon block for "The Witcher" -- a cover URL
// lib/covers.ts DID find, that just 404'd/failed to load client-side --
// "тоже точно так же сделай, пожалуйста... маленькая иконка... такая
// мелкая пилюля... будет лучше чем большой этот блок") -- this
// reverses the earlier "keep the square slot on a runtime load failure,
// for grid alignment" decision (see favoriteCategory's own comment in
// app/u/[username]/page.tsx) at his explicit request: he would rather
// have the compact FavoriteFallbackPill here too, even at the cost of
// an occasional short-pill-next-to-square-tiles row, than the "невиликойний"
// big empty block. title/subtitle are the same two fields favoriteTile()
// already has on hand for its OWN pill branch (withoutCover) -- now
// threaded through here as well so this runtime-failure branch can
// render the identical pill instead of the plain icon tile.
export function FavoriteCover({
  cover,
  kind,
  title,
  subtitle,
}: {
  cover: CoverImage;
  kind: FavoriteKind;
  title: string;
  subtitle?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FavoriteFallbackPill kind={kind} title={title} subtitle={subtitle} />;
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
