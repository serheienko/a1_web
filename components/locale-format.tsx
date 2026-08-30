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
