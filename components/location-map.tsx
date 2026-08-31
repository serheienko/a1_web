// components/location-map.tsx
//
// Aleksandr, 2026-08-31: "давай сделаем прикольную штуку, чтобы когда
// человек указал просте локацию, внизу отображалась карта. Это просто
// визуально, типа симпатично" — a small embedded map under a profile's
// location, purely decorative (no click-to-explore product requirement
// behind it yet). Renders only when the caller has real coordinates —
// lib/a1/user-mappers.ts's mapLocation() already resolves the backend's
// "Worldwide" sentinel (_id === 0, no real coordinates) to `null` here,
// so this component doesn't need to know that rule exists.
//
// Uses OpenStreetMap's own free, keyless embed (openstreetmap.org/export
// /embed.html) rather than a static-tile image service or the Google
// Maps JS SDK: no API key to provision, no billing to set up in Vercel
// for what both look and product intent are "a decorative snapshot, not
// an interactive map picker" — the profile-editor's actual location
// *picker* (a different, pre-existing feature) is untouched by this.
// bbox is a fixed +-0.05 degree box around the point (~5-10km depending
// on latitude) — enough to read the city/neighborhood-scale
// surroundings without the marker sitting alone on an empty tile.
import { T } from "@/components/t";

const BBOX_DELTA = 0.05;

export function LocationMap({
    coordinates,
    label,
}: {
    coordinates: [number, number];
    label: string;
}) {
    const [lng, lat] = coordinates;
    const bbox = [lng - BBOX_DELTA, lat - BBOX_DELTA, lng + BBOX_DELTA, lat + BBOX_DELTA].join(",");
    const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${lat},${lng}&layer=mapnik`;
    const viewHref = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`;

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
</div>
