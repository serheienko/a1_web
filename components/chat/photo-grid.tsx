// components/chat/photo-grid.tsx
//
// 2026-09-04 (Aleksandr, live screenshots comparing this app's multi-
// photo messages against Telegram's own: "Комбинируй более правильно
// фото, вот тебе референс телеграмма на разное кол-во") -- before this,
// N photos sent together just stacked as N full-width rows (see app/
// chats/[chatId]/page.tsx's own docMedia.map, the plain `<img
// className="max-h-64 w-full ...">` branch for a non-solo image), which
// is why it read as a long list instead of a grouped album. This
// renders an adaptive grid shaped after Telegram's own common album
// layouts for the common counts (2 side by side; 3 as one wide tile on
// top + two below; 4 as a 2x2; 5 as a 2-then-3; 6+ chunked into rows of
// up to 3) -- NOT Telegram's own per-photo aspect-ratio bin-packing
// (that algorithm sizes each row off the actual source aspect ratios of
// ITS photos; reproducing it exactly would need each image's real
// dimensions before layout, which this app doesn't fetch ahead of
// render) -- close enough visually for the reference screenshots' own
// mostly-square source photos, and every tile still crops via
// object-cover so a genuinely wide/tall source photo never breaks the
// grid shape. The whole group gets a fixed aspect-square shell (`fr`
// row/col tracks need a real height to distribute into, and a
// consistent overall shape reads more like one grouped attachment than
// N independent photos, matching the reference screenshots).
//
// Only called for a RUN of 2+ consecutive image docs within one
// message (see that map's own grouping pass) -- a solo image keeps its
// existing individual rendering entirely unchanged, flat-flush or not.
"use client";

import type { ReactNode } from "react";
import { MEDIA_BLUR_STYLE } from "@/lib/blur-placeholder";

type GridDoc = {
  id: string;
  src: string;
};

type Row = { items: number[]; heightFr: number };

// Row templates by count. `heightFr` is the row's relative height
// within the whole group (a "tall" row spans more vertical space than
// a "short" one, e.g. the 3-photo top-wide/bottom-two shape below);
// within a row every tile gets equal width.
function layoutRows(n: number): Row[] {
  if (n <= 1) return [{ items: [0], heightFr: 1 }];
  if (n === 2) return [{ items: [0, 1], heightFr: 1 }];
  if (n === 3) {
    return [
      { items: [0], heightFr: 3 },
      { items: [1, 2], heightFr: 2 },
    ];
  }
  if (n === 4) {
    return [
      { items: [0, 1], heightFr: 1 },
      { items: [2, 3], heightFr: 1 },
    ];
  }
  if (n === 5) {
    return [
      { items: [0, 1], heightFr: 1 },
      { items: [2, 3, 4], heightFr: 1 },
    ];
  }
  // 6+: chunk into rows of up to 3, last row gets the remainder (1-3).
  const rows: Row[] = [];
  for (let i = 0; i < n; i += 3) {
    rows.push({ items: Array.from({ length: Math.min(3, n - i) }, (_, k) => i + k), heightFr: 1 });
  }
  return rows;
}

export function ChatPhotoGrid({
  docs,
  onOpen,
  footer,
}: {
  docs: GridDoc[];
  onOpen: (docId: string) => void;
  // 2026-09-05 (cross-message album fallback, see app/chats/[chatId]/
  // page.tsx's crossMessageGroupStart header) -- an absolutely
  // positioned overlay (the caller supplies its own positioning
  // classes, same convention as the existing single-photo time+ticks
  // pill this mirrors) rendered as the grid's last child, inside this
  // component's own `relative` root so `absolute bottom-1.5 right-1.5`
  // anchors to the grid itself, not some ancestor. Undefined for the
  // within-message grouping case (that one keeps its own separate
  // footer row below the grid, unchanged).
  footer?: ReactNode;
}) {
  const rows = layoutRows(docs.length);

  return (
    <div
      // 2026-09-04 (Aleksandr, live screenshot: two grouped photos
      // rendering as a tiny ~90px square instead of a real album --
      // "что за сгруппирование, ты борщанул"): this container had no
      // width of its own, unlike every other media element in this
      // file's message list (single images get `w-full`, file rows get
      // `w-64`). The message bubble itself is a shrink-to-fit flex item
      // (`max-w-[78%]`, no fixed width) -- a lone <img> naturally
      // pushes that bubble wide via its own intrinsic pixel size, but
      // this div has no intrinsic size of its own and its children are
      // sized in percentages (contribute nothing to shrink-to-fit), so
      // the whole grid collapsed to whatever tiny fallback the browser
      // picked. `w-64 max-w-full` gives it the same real footprint the
      // file-attachment row already uses, capped so it never overflows
      // a narrow bubble.
      className="relative grid aspect-square w-64 max-w-full gap-[2px] overflow-hidden rounded-xl"
      style={{ gridTemplateRows: rows.map((r) => `${r.heightFr}fr`).join(" ") }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          className="grid min-h-0 gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${row.items.length}, 1fr)` }}
        >
          {row.items.map((idx) => {
            const doc = docs[idx]!;
            return (
              // 2026-09-05 (Aleksandr, live test: sent 3 real photos as
              // one message -- rendered as ONE solid full-bleed tile,
              // the other two invisible, not the intended wide-top +
              // two-below layout). Root cause, confirmed via
              // getBoundingClientRect() on the live DOM: with a plain
              // `<img className="h-full w-full ...">` as the direct
              // grid item, the browser's grid track-sizing pass can't
              // resolve `height: 100%` against a row whose own height
              // is still being SOLVED FOR (the classic fr-track
              // chicken-and-egg) -- it falls back to the image's own
              // INTRINSIC aspect ratio instead, so a tall source photo
              // (600x800 here) demanded ~384px against this grid's
              // resolved 288px box, and that oversized row simply
              // pushed/overflowed past the container's own
              // `overflow-hidden` clip, burying row two entirely under
              // row one's own single photo. Fix: each tile is now a
              // `relative` grid item (a plain box with NO intrinsic
              // size of its own -- nothing for the track-sizing pass to
              // measure) and the `<img>` inside it is `absolute
              // inset-0`, i.e. taken out of layout/sizing entirely, so
              // every row's fr share is exactly what layoutRows()
              // asked for regardless of any source photo's real
              // dimensions.
              <div key={doc.id} className="relative min-h-0 min-w-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- proxied
                    through /api/media, not a next/image-configured remote host. */}
                <img
                  src={doc.src}
                  alt=""
                  onClick={() => onOpen(doc.id)}
                  className="absolute inset-0 h-full w-full cursor-pointer object-cover transition hover:opacity-90"
                  style={MEDIA_BLUR_STYLE}
                />
              </div>
            );
          })}
        </div>
      ))}
      {footer}
    </div>
  );
}
