// components/post-images.tsx
//
// Shared post photo gallery — was duplicated verbatim in both
// app/jobs/[slug]/page.tsx and app/talents/[slug]/page.tsx as a
// full-width vertical stack (one photo per row). Aleksandr, 2026-08-26,
// pointing at a Figma reference: "Отображения фото в профиле неправильное
// надо их показывать в ряд по горизонтали, квадратами-прямоугольниками с
// круглыми краями. Радиус примерно 15" — photos sit side by side in a
// row, as squarish rounded rectangles, ~15px corner radius, instead of
// stacked full-width at their native aspect ratio.
//
// Client component (not the original server component) because tapping
// a photo now opens it full-size in an overlay with a close button —
// "успеем сделать открытие фото в большой вид при клике? + кнопку
// закрытия" (same day, follow-up ask).
//
// 2026-08-28: two follow-ups landed together.
//
// 1) "Сделай подгрузку фото... через тот же blur effect как и фид" —
//    the feed (components/post-card.tsx) shows a real per-photo blurred
//    placeholder while an image loads (lib/avatar-blur.ts: fetch the
//    real bytes, shrink to a tiny blurred JPEG server-side via sharp),
//    not the generic grey shimmer every image on this page fell back to
//    before. `images` now optionally carries a precomputed `blurDataUrl`
//    per photo — the caller (a server component, app/jobs/[slug]/page.tsx
//    and app/talents/[slug]/page.tsx) awaits generateImageBlurDataUrl for
//    each photo the same way the feed already does for avatars, since
//    this client component can't itself run the server-only sharp() call.
//    Still falls back to the shared shimmer (BLUR_DATA_URL) whenever a
//    real blur wasn't available — a slow/broken blur must never block a
//    photo from showing.
//
// 2) "Сделай свайп открытых фото и counter. В десктоп версии по бокам
//    добавь стрелочки" — the single-photo overlay is now a real gallery
//    viewer: swipe left/right on mobile (touch), arrow-key and on-screen
//    arrow buttons on desktop (hidden on mobile — swipe replaces them),
//    and an "i / N" counter. Clamped at both ends rather than wrapping
//    around — with usually 2-3 photos, a dead stop reads clearer than
//    looping back to the first photo.
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import type { WebPostImage } from "@/types/web-post";

type GalleryImage = WebPostImage & { blurDataUrl?: string | null };

const SWIPE_THRESHOLD_PX = 50;

export function PostImages({ images }: { images: GalleryImage[] }) {
  const valid = images.filter((img) => img.width > 0 && img.height > 0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const canGoPrev = openIndex !== null && openIndex > 0;
  const canGoNext = openIndex !== null && openIndex < valid.length - 1;

  function goPrev() {
    setOpenIndex((i) => (i === null ? null : Math.max(0, i - 1)));
  }
  function goNext() {
    setOpenIndex((i) => (i === null ? null : Math.min(valid.length - 1, i + 1)));
  }

  // Arrow keys + Escape while the viewer is open — standard lightbox
  // behaviour, and the only way to navigate at all on a desktop that
  // isn't using the on-screen arrow buttons or a trackpad swipe.
  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? null : Math.max(0, i - 1)));
      else if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? null : Math.min(valid.length - 1, i + 1)));
      else if (e.key === "Escape") setOpenIndex(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex, valid.length]);

  if (valid.length === 0) return null;

  const lightbox = openIndex !== null && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={() => setOpenIndex(null)}
    >
      <button
        type="button"
        onClick={() => setOpenIndex(null)}
        aria-label="Закрыть"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>

      {valid.length > 1 && (
        <div
          className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white"
          aria-hidden="true"
        >
          {openIndex + 1} / {valid.length}
        </div>
      )}

      {canGoPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Предыдущее фото"
          className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {canGoNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Следующее фото"
          className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element -- full-res
          remote photo shown as-is, not worth routing through next/image's
          optimizer for a viewer that's already showing the original. */}
      <img
        src={valid[openIndex]!.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]!.clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartXRef.current === null) return;
          const dx = e.changedTouches[0]!.clientX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (dx > SWIPE_THRESHOLD_PX) goPrev();
          else if (dx < -SWIPE_THRESHOLD_PX) goNext();
        }}
        className="max-h-full max-w-full touch-pan-y rounded-[15px] object-contain"
      />
    </div>
  );

  if (valid.length === 1) {
    const img = valid[0]!;
    return (
      <>
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="mt-6 block w-full overflow-hidden rounded-[15px]"
        >
          <Image
            src={img.url}
            alt=""
            width={img.width}
            height={img.height}
            sizes="(min-width: 672px) 672px, 100vw"
            priority
            placeholder="blur"
            blurDataURL={img.blurDataUrl ?? BLUR_DATA_URL}
            className="w-full"
          />
        </button>
        {lightbox}
      </>
    );
  }

  return (
    <>
      {/* Aleksandr, 2026-08-27: "сделать 3-е фото в один ряд и скролабл,
          с прокруткой на моб версии" — the 2-col grid used to wrap a 3rd+
          photo onto a second row on mobile; now mobile is a single
          horizontally-scrollable row (snap-to-photo, like a story tray),
          and sm:+ keeps the existing 3-col grid. */}
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {valid.map((img, i) => (
          <button
            type="button"
            key={img.url}
            onClick={() => setOpenIndex(i)}
            className="relative aspect-square w-[42vw] shrink-0 snap-start overflow-hidden rounded-[15px] bg-neutral-100 dark:bg-neutral-900 sm:w-auto sm:shrink sm:snap-none"
          >
            <Image
              src={img.url}
              alt=""
              fill
              sizes="(min-width: 672px) 220px, 42vw"
              priority={i === 0}
              placeholder="blur"
              blurDataURL={img.blurDataUrl ?? BLUR_DATA_URL}
              className="object-cover"
            />
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
