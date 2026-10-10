// components/events/event-cover.tsx -- обложка события.
// Если у события есть картинка (og:image с сайта организатора) -- показываем её; нет или не
// загрузилась -- рисуем свою: тёмный градиент, сетка из точек и крупные буквы названия.
// Цвет выбирается по хэшу названия, поэтому в ленте соседние события не одинаковые.
"use client";

import { useState } from "react";
import { COVER_HUES, hashOf } from "@/lib/events/util";

function initials(name: string): string {
  const words = name.replace(/\b20\d\d\b/g, "").split(/[\s\-–—:|/]+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const caps = words.filter((w) => /^[\p{Lu}\p{N}]/u.test(w));
  const pick = (caps.length ? caps : words).slice(0, 3);
  return pick.map((w) => Array.from(w)[0]).join("").toUpperCase();
}

export function EventCover({
  src,
  name,
  seed,
  label,
  className = "",
  big = false,
}: {
  src?: string;
  name: string;
  seed: string;
  label?: string;
  className?: string;
  big?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [from, to, hi] = COVER_HUES[hashOf(seed) % COVER_HUES.length] ?? COVER_HUES[0];
  const showImg = !!src && !failed;
  return (
    <span aria-hidden="true" className={"relative block overflow-hidden " + className} style={{ background: `radial-gradient(120% 100% at 15% 0%,${from} 0%,${to} 85%)` }}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <span
            className="absolute inset-0 opacity-40"
            style={{ backgroundImage: `radial-gradient(${hi} 1px, transparent 1.6px)`, backgroundSize: "14px 14px", maskImage: "linear-gradient(180deg,#000 0%,transparent 85%)", WebkitMaskImage: "linear-gradient(180deg,#000 0%,transparent 85%)" }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-bold tracking-tight text-white" style={{ fontSize: big ? "clamp(36px,9vw,72px)" : "clamp(15px,3.4vw,24px)", textShadow: `0 0 24px ${hi}88` }}>
            {initials(name)}
          </span>
          {big && label ? <span className="absolute bottom-3 left-4 text-[12px] font-medium uppercase tracking-wide" style={{ color: hi }}>{label}</span> : null}
        </>
      )}
    </span>
  );
}
