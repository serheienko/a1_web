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

export function ChatPhotoGrid({ docs, onOpen }: { docs: GridDoc[]; onOpen: (docId: string) => void }) {
  const rows = layoutRows(docs.length);

  return (
    <div
      className="grid aspect-square gap-[2px] overflow-hidden rounded-xl"
      style={{ gridTemplateRows: rows.map((r) => `${r.heightFr}fr`).join(" ") }}
    >
      {rows.map((row, i) => (
        <div key={i} className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${row.items.length}, 1fr)` }}>
          {row.items.map((idx) => {
            const doc = docs[idx]!;
            return (
              // eslint-disable-next-line @next/next/no-img-element -- proxied
              // through /api/media, not a next/image-configured remote host.
              <img
                key={doc.id}
                src={doc.src}
                alt=""
                onClick={() => onOpen(doc.id)}
                className="h-full min-h-0 w-full cursor-pointer object-cover transition hover:opacity-90"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
