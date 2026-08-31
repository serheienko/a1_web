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
import { T } from "@/components/t";

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
      <iframe
        title={label}
        src={embedSrc}
        loading="lazy"
        className="h-[220px] w-full border-0 dark:invert dark:hue-rotate-180 dark:brightness-95 dark:contrast-[.9] sm:h-[280px]"
      />
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
