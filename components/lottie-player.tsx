// components/lottie-player.tsx
//
// Generic version of the imperative lottie-web loader that
// components/occupation-icon.tsx pioneered (2026-08-27) for the
// occupation-badge cat icons on /u/[username]. Extracted here so the new
// onboarding animations (briefcase-profile-setup.json, phone-verify-
// code.json — PLAN.md §6.15) can reuse the exact same, already-proven-in-
// production rendering path instead of a second implementation.
//
// Deliberately NOT lottie-react (a JSX wrapper) — see occupation-icon.tsx's
// own history comment: that path shipped once, silently failed to build
// on Vercel (a strict-mode TS mismatch in its prop types), and Vercel kept
// serving the previous deploy with no visible error. `lottie-web`'s
// imperative `loadAnimation()` call has no JSX prop surface to typecheck
// against, which is the safer shape for a browser-only animation library
// sitting inside a server-rendered page.
//
// 2026-08-29 finding (PLAN.md §6.15): investigated a report of icons not
// rendering at all in production. They DO render — the animation JSON
// files themselves are just unusually large for small decorative icons
// (180-350KB each; public/animations, public/occupations), so on a cold
// fetch there's a multi-second gap between mount and paint. Fixed the
// worst part of that (blank box with no feedback) with the opacity
// fade-in below; the file sizes themselves are an asset-export question,
// not a code bug, and are flagged in PLAN.md rather than guessed at here.
"use client";

import { useEffect, useRef, useState } from "react";

export function LottiePlayer({
  src,
  size,
  className,
}: {
  src: string;
  /** Pixel size of the square animation viewport. */
  size: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let anim: { destroy: () => void } | null = null;

    Promise.all([import("lottie-web"), fetch(src).then((res) => res.json())])
      .then(([lottieModule, animationData]) => {
        if (cancelled || !containerRef.current) return;
        const lottie = lottieModule.default;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
        });
        setLoaded(true);
      })
      .catch((err) => {
        // A missing/broken animation file just means no icon shows — same
        // silent-degrade choice occupation-icon.tsx made, for the same
        // reason: this is always decorative, never the only carrier of
        // information on the page. Logged (not swallowed silently) after
        // 2026-08-29's onboarding rollout showed empty icon slots in
        // production with no visible error anywhere — needed a real
        // console message to diagnose instead of guessing.
        console.error("[components/lottie-player] failed to load", src, err);
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [src]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flexShrink: 0,
        opacity: loaded ? 1 : 0,
        transition: "opacity 200ms ease-out",
      }}
      aria-hidden="true"
    />
  );
}
