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
//
// 2026-08-28: extracted the actual rendering into components/
// lottie-player.tsx (generic src/size) once the onboarding flow
// (PLAN.md §6.15) needed the same rendering path for two more
// animations that aren't occupation icons. This file is now just the
// occupation -> URL lookup table on top of it — its own public API
// (<OccupationIcon occupation="entrepreneur" />) is unchanged.
"use client";

import { LottiePlayer } from "./lottie-player";

const OCCUPATION_ANIMATION_URLS: Record<string, string> = {
  entrepreneur: "/occupations/entrepreneur.json",
  professional: "/occupations/professional.json",
  freelancer: "/occupations/freelancer.json",
};

export function OccupationIcon({
  occupation,
  size = 31,
}: {
  occupation: string;
  /** 2026-08-28: "Увеличь на 30% кота который подсвечивает роль
   *  пользователя" — 24px -> ~31px, kept as the default so every
   *  existing call site is unaffected; the onboarding "Я..." dropdown
   *  passes its own size for the bigger trigger-button icon. */
  size?: number;
}) {
  const url = OCCUPATION_ANIMATION_URLS[occupation];
  if (!url) return null;
  return <LottiePlayer src={url} size={size} />;
}
