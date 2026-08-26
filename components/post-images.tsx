// components/post-images.tsx
//
// Shared post photo gallery — was duplicated verbatim in both
// app/jobs/[slug]/page.tsx and app/talents/[slug]/page.tsx as a
// full-width vertical stack (one photo per row). Aleksandr, 2026-08-26,
// pointing at a Figma reference: "Отображения фото в профиле неправильное
// надо их показывать в ряд по горизонтали, квадратами-прямоугольниками с
// круглыми краями. Радиус примерно 15" — photos should sit side by side
// in a row, as squarish rounded rectangles, ~15px corner radius, not
// stacked full-width at their native aspect ratio.
import Image from "next/image";
import type { WebPostImage } from "@/types/web-post";

export function PostImages({ images }: { images: WebPostImage[] }) {
  const valid = images.filter((img) => img.width > 0 && img.height > 0);
  if (valid.length === 0) return null;

  // A single photo keeps its own aspect ratio full-width — the
  // horizontal-row treatment only makes sense once there's more than one
  // photo to line up.
  if (valid.length === 1) {
    const img = valid[0]!;
    return (
      <div className="mt-6 overflow-hidden rounded-[15px]">
        <Image
          src={img.url}
          alt=""
          width={img.width}
          height={img.height}
          sizes="(min-width: 672px) 672px, 100vw"
          priority
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {valid.map((img, i) => (
        <div
          key={img.url}
          className="relative aspect-square overflow-hidden rounded-[15px] bg-neutral-100 dark:bg-neutral-900"
        >
          <Image
            src={img.url}
            alt=""
            fill
            sizes="(min-width: 672px) 220px, 45vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
