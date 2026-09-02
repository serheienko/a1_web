// components/location-map.tsx
//
// Aleksandr, 2026-08-31: "давай сделаем прикольную штуку, чтобы когда
// человек указал просте локацию, внизу отображалась карта. Это просто
// визуально, типа симпатично" — a small embedded map under a job post's
// location, purely decorative (no click-to-explore product requirement
// behind it yet). Renders only when the caller has real coordinates —
// lib/a1/mappers.ts's mapLocation() already resolves the backend's
// "Worldwide" sentinel (_id === 0, no real coordinates) to `null` here,
// so this component doesn't need to know that rule exists.
//
// 2026-08-31 (same day, follow-up): "переключи на гугл мапс, мы юзаем
// его в апке" -- switched from the OpenStreetMap embed to Google Maps'
// own free, keyless "q=...&output=embed" iframe (no API key/billing to
// set up in Vercel, same "decorative snapshot, not an interactive picker"
// intent as before) so the web matches the mobile app's map provider.
//
// 2026-08-31 (same day, second follow-up): "убери карту из профиля
// совсем, должна быть только в постах" -- LocationMap was pulled off
// the profile page (app/u/[username]/page.tsx) entirely; the only
// caller left is the job post detail page (app/jobs/[slug]/page.tsx).
//
// 2026-09-02 (Aleksandr, screenshot of a job page mid-load: "А мы можем
// карты тоже подгружать через blur как аватары?"): the map iframe used
// to just be a blank box (the page's own dark background showing
// through) until Google's embed finished loading -- there was no
// placeholder of any kind, unlike every <Image> in this app (avatars,
// post photos), which all blur-up from lib/blur-placeholder.ts's shared
// BLUR_DATA_URL shimmer while the real image loads. Can't reuse
// next/image's own `placeholder="blur"` prop here -- this isn't an
// <Image>, it's a cross-origin <iframe> -- so this reproduces the same
// look by hand: BLUR_DATA_URL rendered as a scaled-up, CSS-blurred
// background layer stacked ON TOP of the iframe (which still starts
// loading immediately underneath, same as before), faded out via
// `onLoad` once Google's embed actually finishes -- the same "blurred
// placeholder fades to reveal the real thing" beat, just built from a
// background-image instead of next/image's built-in mechanism, since
// an iframe has no such mechanism of its own to hook into.
"use client";

import { useState } from "react";
import { T } from "@/components/t";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export function LocationMap({
  coordinates,
  label,
}: {
  coordinates: [number, number];
  label: string;
}) {
  const [lng, lat] = coordinates;
  const embedSrc = `https://www.google.com/maps?q=${lat},${lng}&z=13&output=embed`;
  const viewHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700">
      {/* 2026-08-31, live-testing feedback ("а карты можно на ночной режим
          тоже переключать в зависимости от темы?"): this is Google's free
          keyless "output=embed" iframe (see the file-level comment above
          for why -- no API key/billing), which has no dark-mode/style
          parameter of its own, unlike the full Maps JS/Static API (which
          DOES support a custom night-mode `style=` array but needs a
          billed API key + a Vercel env var -- a bigger setup change than
          this decorative snapshot map warrants). Standard workaround for
          exactly this situation: CSS-invert the iframe itself in dark
          mode (invert + hue-rotate to put the hue back the right way
          round, plus a touch of brightness/contrast so it doesn't look
          blown out) -- verified live on an actual job page by forcing
          .dark on <html> and eyeballing the result: streets/water/parks
          render as a convincing dark map and labels/pins stay legible;
          the only casualty is the small "Google" wordmark and the
          satellite-preview thumbnail rendering with inverted colors too,
          which reads as a minor, acceptable trade-off for a purely
          decorative element with no interactive requirement. */}
      <div className="relative h-[220px] w-full sm:h-[280px]">
        <iframe
          title={label}
          src={embedSrc}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0 dark:invert dark:hue-rotate-180 dark:brightness-95 dark:contrast-[.9]"
        />
        {/* Blur-up placeholder, same shared shimmer + "blur it with CSS,
            scale up so the blur doesn't show hard edges" trick
            next/image applies automatically for placeholder="blur" --
            see this file's 2026-09-02 header comment above. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 scale-110 bg-cover bg-center blur-xl transition-opacity duration-300 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundImage: `url(${BLUR_DATA_URL})` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2 bg-white px-4 py-2 text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
        <span className="truncate">{label}</span>
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-accent hover:underline"
        >
          <T
            uk="Відкрити карту"
            en="Open map"
            ru="Открыть карту"
            de="Karte öffnen"
            es="Abrir mapa"
            fr="Ouvrir la carte"
            pl="Otwórz mapę"
            ptBR="Abrir mapa"
            zh="打开地图"
          />
        </a>
      </div>
    </div>
  );
}
