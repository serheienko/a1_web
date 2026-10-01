// components/landing-bar.tsx
//
// 01.10.2026 (Александр: «на все теги, кроме бронювання и топ-100, должно быть
// разделение по странам... первый выбор страна, потом тег»). Полоса над
// посадочной: на телефоне селектор страны (в шапке его там нет) и ряд чипов
// тегов, которые несут выбранную страну дальше. На компьютере селектор живёт
// в шапке (components/nav-country.tsx) и тоже оставляет тег на месте.

import Link from "next/link";
import { T } from "@/components/t";
import { LandingCountryPicker } from "@/components/nav-country";
import { JOB_LANDINGS } from "@/lib/seo/job-landings";
import { FACT_LANDINGS } from "@/lib/seo/fact-landings";
import { TOP100_LANDING } from "@/lib/seo/top100-landing";
import { withCountry } from "@/lib/seo/landing-country";

export function LandingBar({
  country,
  basePath,
  currentKey,
  withPicker = true,
}: {
  country?: string;
  /** Адрес текущей посадочной: страна меняется, тег остаётся. */
  basePath: string;
  /** slug текущей посадочной -- подсвечивается в ряду. */
  currentKey: string;
  withPicker?: boolean;
}) {
  const ua = !country || country.toUpperCase() === "UA";
  const chips = [
    { key: TOP100_LANDING.slug, href: withCountry(`/jobs/${TOP100_LANDING.slug}`, country), label: TOP100_LANDING.h1 },
    ...JOB_LANDINGS.map((l) => ({ key: l.slug, href: withCountry(`/jobs/${l.slug}`, country), label: l.h1 })),
    ...FACT_LANDINGS.filter((l) => ua || l.slug !== "reservation").map((l) => ({ key: l.slug, href: withCountry(`/jobs/tag/${l.slug}`, country), label: l.chip })),
  ];
  return (
    <div className="mb-6">
      {withPicker ? (
        <div className="mb-3 flex justify-end sm:hidden">
          <LandingCountryPicker basePath={basePath} current={country} />
        </div>
      ) : null}
      <nav aria-label="job formats" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                href={chip.href}
                aria-current={chip.key === currentKey ? "page" : undefined}
                className={
                  "block whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium transition " +
                  (chip.key === currentKey
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-neutral-200 text-neutral-600 hover:border-accent/40 hover:bg-accent/5 hover:text-accent dark:border-neutral-800 dark:text-neutral-400")
                }
              >
                <T {...chip.label} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
