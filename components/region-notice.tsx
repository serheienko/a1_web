// components/region-notice.tsx -- «в этом регионе пока мало данных».
//
// 25.10.2026 (Александр: «надо, чтобы по всем странам, которые у нас в
// листинге, можно было посмотреть. Если данных недостаточно -- так и писать
// "в этом регионе..." и дальше целевой текст»). Страница профессии или
// зарплат по стране теперь есть для любой страны списка; если вакансий
// меньше порога, вместо 404 -- честная плашка и то, что есть. Такие страницы
// закрыты от индексации (тонкий контент), см. их generateMetadata.

import Link from "next/link";
import { T, type Locale } from "@/components/t";

type L = Record<Locale, string>;

export function RegionNotice({ text, links }: { text: L; links: { href: string; label: L }[] }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[14px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <p>
        <T {...text} />
      </p>
      {links.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-block rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-amber-900 no-underline shadow-sm transition hover:text-accent dark:bg-neutral-900 dark:text-amber-100"
            >
              <T {...l.label} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
