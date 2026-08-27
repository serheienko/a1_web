// components/occupation-icon.tsx
//
// Aleksandr, 2026-08-27, on the occupation row ("Entrepreneur" etc.):
// "Тут я бы еще вытянул иконки нашего кота с анимации, они 3 разные, а
// кот офигенный" — the app's animated cat mascot, one per occupation
// (public/occupations/{entrepreneur,professional,freelancer}.json, his
// own Lottie exports; "professional" maps to his "Employee.json" file —
// that's the 3rd role's animation, just a different in-app label for it).
//
// 2026-08-27 follow-up: shipped this first against `lottie-react` (a JSX
// wrapper around lottie-web) and the icon never showed up live — no
// fetch to /occupations/*.json even reached the network tab, which
// points at the Vercel build itself failing on that commit (most likely
// a strict-mode TS mismatch between lottie-react's own prop types and
// what we were passing) and Vercel quietly continuing to serve the
// previous successful deploy. Rebuilt against `lottie-web` directly —
// its imperative `loadAnimation()` call has no JSX prop surface to
// typecheck against, which is the safer shape for a browser-only
// animation library sitting inside a server-rendered page.
"use client";

import { useEffect, useRef } from "react";

const OCCUPATION_ANIMATION_URLS: Record<string, string> = {
  entrepreneur: "/occupations/entrepreneur.json",
  professional: "/occupations/professional.json",
  freelancer: "/occupations/freelancer.json",
};

export function OccupationIcon({ occupation }: { occupation: string }) {
  const url = OCCUPATION_ANIMATION_URLS[occupation];
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    let cancelled = false;
    let anim: { destroy: () => void } | null = null;

    Promise.all([import("lottie-web"), fetch(url).then((res) => res.json())])
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
      })
      .catch(() => {
        // A missing/broken animation file just means no icon — the text
        // label next to it (rendered by the caller) still carries the
        // information, so this fails silently rather than showing a
        // broken-image placeholder.
      });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [url]);

  if (!url) return null;

  return (
    <span
      ref={containerRef}
      className="inline-block h-6 w-6 shrink-0"
      aria-hidden="true"
    />
  );
}
