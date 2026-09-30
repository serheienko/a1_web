// components/landing-country-badge.tsx
//
// Плашка «🇺🇸 США ×» под заголовком посадочной: показывает, что выдача
// сужена до выбранной страны, и даёт вернуться ко всем странам.
// Подписи на трёх языках (uk/ru/en) -- как у селектора страны.

import Link from "next/link";
import { LOCALES, LOCALE_VISIBILITY_CLASS } from "@/components/t";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";

export function LandingCountryBadge({ country, resetHref }: { country: string; resetHref: string }) {
  const c = countryByCode(country);
  if (!c) return null;
  return (
    <p className="mt-3">
      <Link
        href={resetHref}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-[13px] font-medium text-neutral-700 no-underline transition hover:border-accent/40 hover:text-accent dark:border-neutral-800 dark:text-neutral-300"
      >
        <span aria-hidden="true">{flagEmoji(c.code)}</span>
        {LOCALES.map((locale) => (
          <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
            {countryName(c, locale)}
          </span>
        ))}
        <span aria-hidden="true" className="text-neutral-400">×</span>
      </Link>
    </p>
  );
}
