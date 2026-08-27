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
"use client";

import { useState } from "react";
import Image from "next/image";
import type { WebPostImage } from "@/types/web-post";

export function PostImages({ images }: { images: WebPostImage[] }) {
  const valid = images.filter((img) => img.width > 0 && img.height > 0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
      <img
        src={valid[openIndex]!.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-[15px] object-contain"
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
      <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
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
              className="object-cover"
            />
          </button>
        ))}
      </div>
      {lightbox}
    </>
  );
}
