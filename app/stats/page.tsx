export const runtime = "nodejs";
export const revalidate = 600;

// app/stats/page.tsx -- «Статистика A1»: живые цифры по всем вакансиям сайта
// (08.10.2026, Александр). Главные числа и таблицы сервер отдаёт прямо в HTML --
// их читает поисковик (страница индексируется, с разметкой Dataset); анимации,
// карта и обновление раз в минуту -- в stats-live.tsx поверх тех же данных.
//
// Не путать со статистикой разработчиков (GitHub/devbase) -- здесь только A1 Jobs.

import type { Metadata } from "next";
import { insights } from "@/lib/a1/insights";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { T, LOCALES, type Locale } from "@/components/t";
import { StatsLive } from "./stats-live";
import { L9, introFor } from "./i18n";

const SITE_URL = "https://jobs.a1appp.com";
const PAGE_URL = `${SITE_URL}/stats`;

function n(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await insights().catch(() => null);
  const title = d
    ? `Статистика IT-вакансій: ${n(d.total)} вакансій, ${n(d.countries)} країн, технології та зарплати | A1 Jobs`
    : "Статистика IT-вакансій A1: країни, технології, зарплати | A1 Jobs";
  const description = d
    ? `Живі цифри ринку IT-вакансій на A1: ${n(d.total)} відкритих вакансій від ${n(d.companies)} компаній у ${n(d.countries)} країнах. Найпопулярніші технології, ролі, рівні, формат роботи, зарплати й карта вакансій.`
    : "Живі цифри ринку IT-вакансій на A1: країни, технології, ролі, зарплати й карта вакансій.";
  return {
    title,
    description,
    alternates: { canonical: PAGE_URL },
    openGraph: { title, description, url: PAGE_URL, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StatsPage() {
  const d = await insights();
  const top = d.byCountry.filter((c) => c.cc !== "WW");
  // Топ-3 страны с числами на каждом языке (названия стран есть для всех 9 языков).
  const topNames: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) topNames[l] = top.slice(0, 3).map((c) => `${d.names[c.cc]?.[l] ?? c.cc} (${n(c.n)})`).join(", ");
  const topTech = d.tech.slice(0, 5).map((t) => t.tech).join(", ");
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Статистика IT-вакансій A1 Jobs",
    description: `Кількість відкритих IT-вакансій на A1 Jobs за країнами, містами, технологіями, ролями, рівнями й форматом роботи. Оновлюється автоматично.`,
    url: PAGE_URL,
    creator: { "@type": "Organization", name: "A1", url: SITE_URL },
    dateModified: d.updatedAt,
    isAccessibleForFree: true,
    keywords: ["IT вакансії", "статистика ринку праці", "технології", "зарплати в IT", "віддалена робота"],
    variableMeasured: ["кількість вакансій", "кількість компаній", "країни", "технології", "зарплати"],
    spatialCoverage: "Worldwide",
  };
  const crumbs = buildLandingBreadcrumbJsonLd("Статистика", PAGE_URL);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:pt-12 pb-fab-safe">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <div className="text-[11px] font-medium uppercase tracking-wide text-accent">
        <T {...L9("A1 Jobs · живі дані", "A1 Jobs · live data", "A1 Jobs · живые данные")} />
      </div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
        <T {...L9("Статистика IT-вакансій", "IT job market statistics", "Статистика IT-вакансий")} />
      </h1>
      {/* Текстом -- для людей и поисковиков: главные числа без JavaScript. */}
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <T {...introFor({ uk: `Зараз на A1 ${n(d.total)} відкритих IT-вакансій від ${n(d.companies)} компаній у ${n(d.countries)} країнах і ${n(d.cities)} містах. За останню добу додано ${n(d.fresh24h)}, за тиждень -- ${n(d.fresh7d)}. Найбільше вакансій у країнах: ${top.slice(0, 3).map((c) => `${d.names[c.cc]?.uk ?? c.cc} (${n(c.n)})`).join(", ")}. Найчастіші технології: ${topTech}.`, en: `A1 currently lists ${n(d.total)} open IT jobs from ${n(d.companies)} companies in ${n(d.countries)} countries and ${n(d.cities)} cities. ${n(d.fresh24h)} were added in the last 24 hours and ${n(d.fresh7d)} in the last week. Top countries: ${top.slice(0, 3).map((c) => `${d.names[c.cc]?.en ?? c.cc} (${n(c.n)})`).join(", ")}. Most mentioned technologies: ${topTech}.`, ru: `Сейчас на A1 ${n(d.total)} открытых IT-вакансий от ${n(d.companies)} компаний в ${n(d.countries)} странах и ${n(d.cities)} городах. За последние сутки добавлено ${n(d.fresh24h)}, за неделю -- ${n(d.fresh7d)}. Больше всего вакансий в странах: ${top.slice(0, 3).map((c) => `${d.names[c.cc]?.ru ?? c.cc} (${n(c.n)})`).join(", ")}. Самые частые технологии: ${topTech}.` }, { total: n(d.total), companies: n(d.companies), countries: n(d.countries), cities: n(d.cities), fresh24h: n(d.fresh24h), fresh7d: n(d.fresh7d), tech: topTech }, topNames)} />
      </p>

      <div className="mt-6">
        <StatsLive initial={d} />
      </div>

      {/* Таблицы -- полный список для тех, кто хочет цифры текстом (и для поисковиков). */}
      <section className="mt-8 grid gap-4 text-[13px] text-neutral-700 md:grid-cols-2 dark:text-neutral-300">
        <details className="rounded-[20px] bg-card p-4 dark:bg-neutral-900">
          <summary className="cursor-pointer font-semibold text-neutral-900 dark:text-neutral-100">
            <T {...L9("Таблиця: усі країни", "Table: all countries", "Таблица: все страны")} />
          </summary>
          <table className="mt-3 w-full">
            <tbody>
              {d.byCountry.map((c) => (
                <tr key={c.cc} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1">
                    {c.cc === "WW" ? (
                      <T {...L9("Віддалено з будь-якої країни", "Remote from anywhere", "Удалённо из любой страны")} />
                    ) : (
                      <a href={`/jobs/country/${c.cc.toLowerCase()}`} className="hover:text-accent">{d.names[c.cc] ? <T {...(d.names[c.cc] as Record<Locale, string>)} /> : c.cc}</a>
                    )}
                  </td>
                  <td className="py-1 text-right tabular-nums">{n(c.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <details className="rounded-[20px] bg-card p-4 dark:bg-neutral-900">
          <summary className="cursor-pointer font-semibold text-neutral-900 dark:text-neutral-100">
            <T {...L9("Таблиця: технології", "Table: technologies", "Таблица: технологии")} />
          </summary>
          <table className="mt-3 w-full">
            <tbody>
              {d.tech.map((t) => (
                <tr key={t.tech} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="py-1">{t.href ? <a href={t.href} className="hover:text-accent">{t.tech}</a> : t.tech}</td>
                  <td className="py-1 text-right tabular-nums">{n(t.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <p className="mt-6 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        <T {...L9("Як рахуємо: беремо всі відкриті вакансії сайту; закриті вакансії щодня знімаються. Технологія, роль і рівень визначаються за назвою й текстом вакансії; зарплати -- лише ті, що вказані у вакансії. Цифри оновлюються автоматично.", "How we count: all open jobs on the site; closed jobs are removed daily. Technology, role and level are read from the job title and text; salaries only where the job states them. Numbers update automatically.", "Как считаем: берём все открытые вакансии сайта; закрытые вакансии снимаются ежедневно. Технология, роль и уровень определяются по названию и тексту вакансии; зарплаты -- только указанные в вакансии. Цифры обновляются автоматически.")} />
      </p>
    </main>
  );
}
