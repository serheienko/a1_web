// components/locale-format.tsx
//
// 2026-08-30, live-testing feedback: "Время в посте почему то сделано без
// локализации" and "Зп тоже должна локализироваться под выбор языка (yr /
// mo)" — lib/format.ts's formatRelativeTime/formatSalary used to hard-code
// Russian (a bare `new Intl.RelativeTimeFormat("ru", ...)` plus a Russian
// "/год"/"/мес" period suffix) no matter which language the visitor had
// picked. All of this component's call sites (components/post-card.tsx,
// app/jobs/[slug]/page.tsx, app/talents/[slug]/page.tsx) are server
// components that deliberately avoid cookies()/headers() so the ISR'd
// feed pages keep revalidating on schedule instead of going fully dynamic
// per visitor — so there's no server-side "current locale" available to
// format with even after the functions themselves became locale-aware.
//
// Same fix as components/t.tsx already applies to static chrome strings:
// render every locale's formatted text server-side as a hidden span, and
// let the `lang-XX:inline` CSS variant (toggled client-side on <html>)
// decide which one is visible. Zero client JS needed per post.
import { LOCALES, LOCALE_VISIBILITY_CLASS } from "@/components/t";
import { formatRelativeTime, formatSalary } from "@/lib/format";
import { localizeLocationDisplay } from "@/lib/pill-translations";
import type { WebPostSalary } from "@/types/web-post";

export function RelativeTime({ date }: { date: Date }) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {formatRelativeTime(date, locale)}
        </span>
      ))}
    </>
  );
}

export function SalaryLabel({ salary }: { salary: WebPostSalary }) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {formatSalary(salary, locale)}
        </span>
      ))}
    </>
  );
}

// 2026-08-30, live-testing feedback: "Berlin, Germany - нужна
// локализация" -- same server-side-hidden-spans trick as RelativeTime/
// SalaryLabel above, since app/u/[username]/page.tsx and
// components/post-card.tsx are both server components with no
// server-side "current locale" (see this file's own header comment for
// why). `display` is the backend's pre-formatted "city, country"
// string; only the country portion gets swapped per-locale, via
// lib/pill-translations.ts's localizeLocationDisplay -- see that
// function's own comment for why city names stay untranslated.
export function LocationLabel({ display, country }: { display: string; country?: string | null }) {
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {localizeLocationDisplay(display, country, locale)}
        </span>
      ))}
    </>
  );
}
