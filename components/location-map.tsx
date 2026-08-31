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
              <iframe
                        title={label}
                        src={embedSrc}
                        loading="lazy"
                        className="h-[220px] w-full border-0 sm:h-[280px]"
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
