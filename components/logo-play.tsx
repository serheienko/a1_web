// components/logo-play.tsx
//
// Aleksandr, 2026-08-28: sent the brand's .tgs (Telegram-sticker-format,
// gzip'd Lottie) logo animation — "у нас логотип статический на сайте,
// но при нажатии срабатывает... эффект play... один раз". Static by
// default (unchanged — still the same two SVGs site-nav.tsx always
// rendered), and on click/tap this plays that animation once on top of
// it, then reverts back to the static image — the animation is a
// one-shot flourish, not a replacement for the resting logo.
//
// Recolored server-side into the site's two theme colors (this file's
// own JSON, not a runtime CSS override), replacing the source file's
// own placeholder blue: light = #335EF7 (the site's actual brand blue),
// dark = #FFFFFF. Two separate files (public/brand/a1-logo-play-blue.json
// / -white.json) rather than one file recolored by CSS, because a
// Lottie fill's color is baked into its shape data as a literal RGBA
// array, not an SVG `currentColor` a stylesheet can override.
//
// Sizing: the source composition is a 512x512 square canvas, but the
// "A1" mark it actually draws only occupies roughly the middle 57%x43%
// of that square (real padding baked into how it was exported, not
// something this file controls) — naively fit-scaling the WHOLE canvas
// into a box sized off the current static logo would have rendered the
// mark visibly smaller than the static logo it's replacing for that
// one second. Instead LOGO_CROP_VIEWBOX below crops the rendered SVG's
// own viewBox down to a tight rect around the mark's RESTING-frame
// bounding box (computed once by hand from the source JSON's own
// path/transform data, plus ~8% margin) and LOGO_CROP_ASPECT sizes the
// container off that rect's aspect ratio instead of the canvas's own
// 1:1 — so the "A1" glyphs land at the same on-screen size as the
// static logo, not the padded square. `svgEl.style.overflow =
// "visible"` keeps this crop from clipping the animation's actual
// MOTION (the "1" swings further left mid-bounce than its resting
// position) — only the still/rest framing is tight, not a hard mask.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const LOGO_ANIMATION_URLS = {
  light: "/brand/a1-logo-play-blue.json",
  dark: "/brand/a1-logo-play-white.json",
};

// "x y width height", in the source animation's own 0-512 coordinate
// space — see this file's top comment for how this rect was derived.
const LOGO_CROP_VIEWBOX = "44.3 131.5 340.7 253.6";
const LOGO_CROP_ASPECT = "340.7 / 253.6";

// Minimal manual type, same defensive reasoning as components/occupation
// -icon.tsx's own `{ destroy: () => void }`: lottie-web's own bundled
// types have bitten this app before (see that file's history) — this
// only claims the handful of members actually used below.
type LottieAnimation = {
  destroy: () => void;
  addEventListener: (event: string, cb: () => void) => void;
  renderer?: { svgElement?: SVGSVGElement };
};

export function LogoPlay() {
  const [playing, setPlaying] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!playing || !containerRef.current) return;

    let cancelled = false;
    let anim: LottieAnimation | null = null;
    const isDark = document.documentElement.classList.contains("dark");
    const url = isDark ? LOGO_ANIMATION_URLS.dark : LOGO_ANIMATION_URLS.light;

    Promise.all([import("lottie-web"), fetch(url).then((res) => res.json())])
      .then(([lottieModule, animationData]) => {
        if (cancelled || !containerRef.current) return;
        const lottie = lottieModule.default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData,
        }) as LottieAnimation;

        const svgEl = anim.renderer?.svgElement;
        if (svgEl) {
          svgEl.setAttribute("viewBox", LOGO_CROP_VIEWBOX);
          svgEl.style.overflow = "visible";
        }

        anim.addEventListener("complete", () => {
          setPlaying(false);
        });
      })
      .catch(() => {
        // A missing/broken animation file just means no fun effect — the
        // static logo underneath is only hidden once this actually
        // succeeds (see the JSX below), so there's nothing to recover.
        setPlaying(false);
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [playing]);

  return (
    <Link
      href="/"
      className="relative shrink-0 transition-opacity hover:opacity-80"
      onClick={() => {
        // Ignore re-clicks mid-playthrough rather than restarting —
        // "проигрывалась один раз" (play through once), not retriggered
        // on top of itself. Navigation still happens normally either way.
        if (!playing) setPlaying(true);
      }}
    >
      {/* Two exact logo marks exported from Figma (light = brand blue #335EF7,
          dark = white) rather than recoloring one asset with CSS filters. */}
      <img
        src="/brand/a1-logo-blue.svg"
        alt="A1"
        className={"h-7 w-auto dark:hidden" + (playing ? " invisible" : "")}
      />
      <img
        src="/brand/a1-logo-white.svg"
        alt="A1"
        className={"hidden h-7 w-auto dark:block" + (playing ? " invisible" : "")}
      />
      {playing && (
        <span
          ref={containerRef}
          className="pointer-events-none absolute left-0 top-0 h-7"
          style={{ aspectRatio: LOGO_CROP_ASPECT }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
