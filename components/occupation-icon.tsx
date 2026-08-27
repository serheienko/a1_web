// components/occupation-icon.tsx
//
// Aleksandr, 2026-08-27, on the occupation row ("Entrepreneur" etc.):
// "Тут я бы еще вытянул иконки нашего кота с анимации, они 3 разные, а
// кот офигенный" — the app's animated cat mascot, one per occupation
// (public/occupations/{entrepreneur,professional,freelancer}.json, his
// own Lottie exports; "professional" maps to his "Employee.json" file —
// that's the 3rd role's animation, just a different in-app label for it).
//
// "use client" + dynamic(..., {ssr:false}): lottie-web (which
// lottie-react wraps) touches `document`/canvas APIs at import time and
// can't run during SSR, same reason as VoiceIntroPlayer/VoiceIntroRing
// elsewhere on this page. Animation JSON is fetched at runtime from
// /public rather than imported as a JS module, so profiles with a
// different (or no) occupation never pay for the other two files' bytes.
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const OCCUPATION_ANIMATION_URLS: Record<string, string> = {
  entrepreneur: "/occupations/entrepreneur.json",
  professional: "/occupations/professional.json",
  freelancer: "/occupations/freelancer.json",
};

export function OccupationIcon({ occupation }: { occupation: string }) {
  const url = OCCUPATION_ANIMATION_URLS[occupation];
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        // A missing/broken animation file just means no icon — the text
        // label next to it (rendered by the caller) still carries the
        // information, so this fails silently rather than showing a
        // broken-image placeholder.
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || !animationData) return null;

  return (
    <span className="inline-block h-6 w-6 shrink-0" aria-hidden="true">
      <Lottie animationData={animationData} loop autoplay />
    </span>
  );
}
