// components/marquee-name.tsx
//
// Aleksandr, 2026-08-30 (from the mobile app's gradient-name screen
// recording): "текст бежал слева направо, потому что слишком длинное
// было имя, и там применился маркиз, просто не поместилось. Мы можем
// такое на мобильной версии тоже сделать, но только для имен в
// профилях, если оно реально длинное" — ports that same auto-scroll to
// the one place asked for, app/u/[username]/page.tsx's own name
// heading, and ONLY once the name actually overflows its available
// width. A short name renders exactly as the plain truncated <h1> did
// before this component existed — no duplicated text in the DOM, no
// animation, nothing measurably different.
//
// Aleksandr, 2026-08-30 follow-up: "марки на десктопе не нужен, только
// на моб, если имя не помещается на экран... там имя всегда поместится,
// экран же очень широкий" — desktop is deliberately never considered for
// marquee, even if some pathological name+layout combination could make
// it overflow there. Below MOBILE_BREAKPOINT_PX it behaves exactly as
// before (measure + marquee when overflowing); at or above it, it never
// measures into marquee mode.
//
// Aleksandr, 2026-08-31, live-testing feedback (2 desktop screenshots,
// "Aleksandr…", "Alexay Fa…" both cut off with an ellipsis): "имена все
// равно подрезаны, показывай полное нормальное имя, особенно на
// десктопе... а иконку редактировать двигай куда угодно, но не обрезай
// так имя". The "экран же очень широкий" assumption above turned out
// false in practice — app/u/[username]/page.tsx's own <main> is a fixed
// `sm:w-[420px]` column (deliberately, to stop the Favorites tile grid
// from hijacking the page's width — see that file's own comment), so the
// name's actual available width on desktop is nowhere near the full
// screen. Moving EditProfileButton/AddContactButton onto the avatar's own
// corner (this same commit's page.tsx change) freed up some of that
// column, but a genuinely long name still doesn't fit on one line at
// 420px. Since marquee is still off-limits on desktop per the above, the
// only way left to show the FULL name there is to let it wrap onto a
// second line instead of ellipsis-truncating — see the plain-heading
// branch below, which now truncates (single line, ellipsis) only below
// MOBILE_BREAKPOINT_PX and wraps (no truncation at all) at/above it.
//
// Deliberately independent of the gradient-fill feature itself (still
// waiting on the backend field to persist it in, plus Figma's exact
// color codes) so this can ship on its own; the two will likely end up
// sharing the same <h1> once the gradient lands, but neither depends on
// the other today.
//
// Renders the semantic <h1> itself rather than taking an `as` prop —
// this component has exactly one call site.
"use client";

import { useEffect, useRef, useState } from "react";

// Matches the codebase's Tailwind "sm:" breakpoint (640px) used right at
// this component's own call site (text-xl sm:text-2xl) — below this is
// "mobile" for marquee purposes, at/above it marquee is disabled outright.
const MOBILE_BREAKPOINT_PX = 640;

export function MarqueeName({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLHeadingElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [durationSec, setDurationSec] = useState(10);

  useEffect(() => {
    function measure() {
      const container = containerRef.current;
      const span = measureRef.current;
      if (!container || !span) return;
      // Desktop is always wide enough for a name to fit — never even
      // consider marquee mode there, regardless of measured overflow.
      if (window.innerWidth >= MOBILE_BREAKPOINT_PX) {
        setOverflowing(false);
        return;
      }
      // +1px tolerance for sub-pixel rounding so a name that JUST fits
      // doesn't flicker into marquee mode.
      const over = span.scrollWidth > container.clientWidth + 1;
      setOverflowing(over);
      if (over) {
        // ~55px/s reads as a calm, easy-to-read pace regardless of name
        // length — a fixed duration would make a long name feel rushed
        // and a barely-overflowing one feel sluggish.
        setDurationSec(Math.max(4, span.scrollWidth / 55));
      }
    }
    measure();
    window.addEventListener("resize", measure);
    // Re-measure if the heading itself resizes (e.g. a breakpoint change
    // swaps text-xl for text-2xl) without a window resize event.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [text]);

  return (
    <h1 ref={containerRef} className={"relative min-w-0 overflow-hidden sm:overflow-visible " + (className ?? "")}>
      {/* Always-mounted, invisible measuring copy — absolutely positioned
          out of flow so it never affects layout, but its natural
          (unwrapped) width is what decides whether the visible content
          below needs to marquee. Kept mounted even while NOT overflowing
          so a later resize (rotating the phone, a desktop window resize)
          can still detect the name no longer fits and drop back out of
          marquee mode. */}
      <span ref={measureRef} aria-hidden="true" className={"invisible absolute left-0 top-0 whitespace-nowrap " + (className ?? "")}>
        {text}
      </span>
      {overflowing ? (
        <div className="flex w-max animate-marquee-name" style={{ animationDuration: `${durationSec}s` }}>
          <span className={"shrink-0 whitespace-nowrap pr-10 " + (className ?? "")}>{text}</span>
          {/* Second copy for the seamless loop — see app/globals.css's
              own comment on the -50% translateX trick. Hidden from
              assistive tech so the name isn't announced twice. */}
          <span aria-hidden="true" className={"shrink-0 whitespace-nowrap pr-10 " + (className ?? "")}>{text}</span>
        </div>
      ) : (
        <span className={"block truncate sm:overflow-visible sm:text-clip sm:whitespace-normal sm:break-words " + (className ?? "")}>{text}</span>
      )}
    </h1>
  );
}
