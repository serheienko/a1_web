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
    <h1 ref={containerRef} className={"relative min-w-0 overflow-hidden " + (className ?? "")}>
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
        <span className={"block truncate " + (className ?? "")}>{text}</span>
      )}
    </h1>
  );
}
