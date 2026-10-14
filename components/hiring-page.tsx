// components/hiring-page.tsx
//
// 14.10.2026: «Хто наймає в IT: <місяць>» -- общая разметка для месяца и для месяца по стеку
// (app/jobs/hiring/[month]/page.tsx и [month]/[stack]/page.tsx). Данные -- lib/seo/hiring-month.ts.

import Link from "next/link";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import type { HiringMonth, HiringSummary } from "@/lib/seo/hiring-month";
import { HIRING_MIN_STACK_POSTS } from "@/lib/seo/hiring-month";
import type { WebPost } from "@/types/web-post";

type L = Record<Locale, string>;

/** Подстановка {month}, {label}, {n}, ... во все девять языков. */
export function fill(template: L, vars: Record<string, string | Record<Locale, string>>): L {
  const out = {} as L;
  for (const loc of LOCALES) {
    let s = template[loc];
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, typeof v === "string" ? v : v[loc]);
    out[loc] = s;
  }
  return out;
}

export function num(n: number): string {
  return n.toLocaleString("uk-UA").replace(/ /g, " ");
}

export const TXT = {
  h1Month: {
    uk: "Хто наймає в IT: {month}",
    en: "Who's hiring in tech: {month}",
    ru: "Кто нанимает в IT: {month}",
    de: "Wer stellt in der IT ein: {month}",
    es: "Quién contrata en IT: {month}",
    fr: "Qui recrute dans la tech : {month}",
    pl: "Kto zatrudnia w IT: {month}",
    ptBR: "Quem está contratando em TI: {month}",
    zh: "谁在招聘 IT 人才：{month}",
  },
  h1Stack: {
    uk: "Хто наймає {label}-фахівців: {month}",
    en: "Who's hiring {label} talent: {month}",
    ru: "Кто нанимает {label}-специалистов: {month}",
    de: "Wer {label}-Fachkräfte einstellt: {month}",
    es: "Quién contrata talento {label}: {month}",
    fr: "Qui recrute des profils {label} : {month}",
    pl: "Kto zatrudnia specjalistów {label}: {month}",
    ptBR: "Quem contrata profissionais {label}: {month}",
    zh: "谁在招聘 {label} 人才：{month}",
  },
  lead: {
    uk: "Нових вакансій на A1 за {month}: {n}. Компаній, які наймають: {c}. Віддалено: {r}%, із зарплатою: {s}%. Нижче — хто наймав найбільше, які технології та країни.",
    en: "In {month}, {n} new jobs from {c} companies appeared on A1. {r}% are remote, {s}% list a salary. Below: who hired the most, which technologies and countries.",
    ru: "Новых вакансий на A1 за {month}: {n}. Компаний, которые нанимают: {c}. Удалённо: {r}%, с зарплатой: {s}%. Ниже — кто нанимал больше всех, какие технологии и страны.",
    de: "Im {month} erschienen auf A1 {n} neue Stellen von {c} Unternehmen. {r}% remote, {s}% mit Gehaltsangabe. Unten: wer am meisten eingestellt hat, welche Technologien und Länder.",
    es: "En {month} aparecieron en A1 {n} vacantes nuevas de {c} empresas. {r}% en remoto, {s}% con salario. Abajo: quién contrató más, qué tecnologías y países.",
    fr: "En {month}, {n} nouvelles offres de {c} entreprises sont parues sur A1. {r}% en télétravail, {s}% avec salaire. Ci-dessous : qui a le plus recruté, quelles technologies et quels pays.",
    pl: "Nowe oferty na A1, {month}: {n}. Firmy, które zatrudniają: {c}. Zdalnie: {r}%, z wynagrodzeniem: {s}%. Poniżej: kto zatrudniał najwięcej, jakie technologie i kraje.",
    ptBR: "Em {month}, {n} novas vagas de {c} empresas apareceram no A1. {r}% remotas, {s}% com salário. Abaixo: quem mais contratou, quais tecnologias e países.",
    zh: "{month}，A1 上新增了来自 {c} 家公司的 {n} 个职位。远程占 {r}%，标明薪资的占 {s}%。下方是招聘最多的公司、技术和国家。",
  },
  live: {
    uk: "Місяць ще триває — цифри оновлюються щогодини.",
    en: "The month is still running — numbers update hourly.",
    ru: "Месяц ещё идёт — цифры обновляются каждый час.",
    de: "Der Monat läuft noch — die Zahlen werden stündlich aktualisiert.",
    es: "El mes sigue en curso: las cifras se actualizan cada hora.",
    fr: "Le mois est en cours — chiffres mis à jour toutes les heures.",
    pl: "Miesiąc jeszcze trwa — liczby aktualizują się co godzinę.",
    ptBR: "O mês ainda está em andamento — números atualizados a cada hora.",
    zh: "本月尚未结束——数据每小时更新。",
  },
  topCompanies: {
    uk: "Хто наймав найбільше", en: "Top hiring companies", ru: "Кто нанимал больше всех", de: "Wer am meisten eingestellt hat",
    es: "Quién contrató más", fr: "Qui a le plus recruté", pl: "Kto zatrudniał najwięcej", ptBR: "Quem mais contratou", zh: "招聘最多的公司",
  },
  jobsN: {
    uk: "{n} вак.", en: "{n} jobs", ru: "{n} вак.", de: "{n} Stellen", es: "{n} vacantes", fr: "{n} offres", pl: "{n} ofert", ptBR: "{n} vagas", zh: "{n} 个职位",
  },
  stacks: {
    uk: "Технології місяця", en: "Technologies of the month", ru: "Технологии месяца", de: "Technologien des Monats",
    es: "Tecnologías del mes", fr: "Technologies du mois", pl: "Technologie miesiąca", ptBR: "Tecnologias do mês", zh: "本月热门技术",
  },
  countries: {
    uk: "Країни", en: "Countries", ru: "Страны", de: "Länder", es: "Países", fr: "Pays", pl: "Kraje", ptBR: "Países", zh: "国家",
  },
  latest: {
    uk: "Свіжі вакансії місяця", en: "Latest jobs of the month", ru: "Свежие вакансии месяца", de: "Neueste Stellen des Monats",
    es: "Últimas vacantes del mes", fr: "Dernières offres du mois", pl: "Najnowsze oferty miesiąca", ptBR: "Vagas mais recentes do mês", zh: "本月最新职位",
  },
  allJobs: {
    uk: "Усі вакансії {label} →", en: "All {label} jobs →", ru: "Все вакансии {label} →", de: "Alle {label}-Stellen →",
    es: "Todas las vacantes {label} →", fr: "Toutes les offres {label} →", pl: "Wszystkie oferty {label} →", ptBR: "Todas as vagas {label} →", zh: "全部 {label} 职位 →",
  },
  months: {
    uk: "Інші місяці", en: "Other months", ru: "Другие месяцы", de: "Andere Monate", es: "Otros meses", fr: "Autres mois", pl: "Inne miesiące", ptBR: "Outros meses", zh: "其他月份",
  },
  how: {
    uk: "Як рахуємо: беремо всі IT-вакансії, опубліковані на A1 за місяць (з сайтів компаній, ATS-стрічок, DOU та інших відкритих джерел). Компанію рахуємо за кількістю нових вакансій, технології — за текстом вакансії. Цитуйте з посиланням на A1 Jobs.",
    en: "How we count: all tech jobs published on A1 during the month (from company career sites, ATS feeds and other open sources). Companies are ranked by new jobs, technologies come from the job text. Feel free to cite with a link to A1 Jobs.",
    ru: "Как считаем: берём все IT-вакансии, опубликованные на A1 за месяц (с сайтов компаний, ATS-лент и других открытых источников). Компании — по числу новых вакансий, технологии — по тексту вакансии. Цитируйте со ссылкой на A1 Jobs.",
    de: "Methodik: alle IT-Stellen, die im Monat auf A1 veröffentlicht wurden (Karriereseiten, ATS-Feeds und andere offene Quellen). Unternehmen nach Anzahl neuer Stellen, Technologien aus dem Stellentext. Zitieren gern mit Link auf A1 Jobs.",
    es: "Cómo contamos: todas las vacantes IT publicadas en A1 durante el mes (webs de empleo de empresas, feeds ATS y otras fuentes abiertas). Empresas por número de vacantes nuevas, tecnologías según el texto. Cita con enlace a A1 Jobs.",
    fr: "Méthode : toutes les offres tech publiées sur A1 pendant le mois (sites carrière, flux ATS et autres sources ouvertes). Entreprises classées par nouvelles offres, technologies tirées du texte. Citez avec un lien vers A1 Jobs.",
    pl: "Jak liczymy: wszystkie oferty IT opublikowane na A1 w danym miesiącu (strony kariery, kanały ATS i inne otwarte źródła). Firmy według liczby nowych ofert, technologie z treści ogłoszenia. Cytuj z linkiem do A1 Jobs.",
    ptBR: "Como contamos: todas as vagas de TI publicadas no A1 no mês (sites de carreira, feeds de ATS e outras fontes abertas). Empresas por número de vagas novas, tecnologias pelo texto da vaga. Cite com link para o A1 Jobs.",
    zh: "统计方法：本月在 A1 发布的全部 IT 职位（公司招聘页、ATS 数据源及其他公开来源）。公司按新增职位数排序，技术取自职位描述。欢迎引用并注明 A1 Jobs。",
  },
} satisfies Record<string, L>;

function pct(part: number, total: number): string {
  return total ? String(Math.round((part / total) * 100)) : "0";
}

export function leadOf(s: HiringSummary, month: L): L {
  return fill(TXT.lead, { month, n: num(s.total), c: num(s.companies), r: pct(s.remote, s.total), s: pct(s.withSalary, s.total) });
}

const chip =
  "inline-block rounded-full bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 no-underline transition hover:bg-accent/10 hover:text-accent dark:bg-neutral-800 dark:text-neutral-300";

export function HiringBody({
  data,
  summary,
  month,
  live,
  stackSlug,
  posts,
  months,
  stackLabel,
}: {
  data: HiringMonth;
  summary: HiringSummary;
  month: L;
  live: boolean;
  stackSlug: string | null;
  posts: WebPost[];
  months: { key: string; label: L }[];
  stackLabel: string | null;
}) {
  const labelOf = new Map(data.stacks.map((s) => [s.slug, s.label] as const));
  return (
    <>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        <T {...leadOf(summary, month)} />
        {live ? (
          <>
            {" "}
            <T {...TXT.live} />
          </>
        ) : null}
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          <T {...TXT.topCompanies} />
        </h2>
        <ol className="mt-3 divide-y divide-neutral-100 rounded-2xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {summary.top.map((c, i) => {
            const name = (
              <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
            );
            return (
              <li key={`${c.username ?? c.name}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-6 shrink-0 text-right text-sm tabular-nums text-neutral-400">{i + 1}</span>
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1">
                  {c.username ? (
                    <Link href={`/u/${c.username}`} className="no-underline hover:text-accent">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                  {!stackSlug && c.stacks.length ? (
                    <span className="block truncate text-xs text-neutral-400">
                      {c.stacks.map((s) => labelOf.get(s) ?? s).join(" · ")}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-neutral-500">
                  <T {...fill(TXT.jobsN, { n: num(c.count) })} />
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {!stackSlug ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            <T {...TXT.stacks} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {summary.stacks.slice(0, 40).map((s) => (
              <li key={s.slug}>
                <Link
                  href={s.count >= HIRING_MIN_STACK_POSTS && data.byStack[s.slug] ? `/jobs/hiring/${data.month}/${s.slug}` : `/jobs/stack/${s.slug}`}
                  className={chip}
                >
                  {s.label} <span className="text-neutral-400">{num(s.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          <T {...TXT.countries} />
        </h2>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {summary.countries.slice(0, 20).map((c) => {
            const country = countryByCode(c.cc);
            if (!country) return null;
            return (
              <li key={c.cc}>
                <Link href={c.cc === "ww" ? "/jobs/remote" : `/jobs/country/${c.cc}`} className={chip}>
                  {flagEmoji(c.cc.toUpperCase())}{" "}
                  {LOCALES.map((loc) => (
                    <span key={loc} className={LOCALE_VISIBILITY_CLASS[loc]}>
                      {countryName(country, loc)}
                    </span>
                  ))}{" "}
                  <span className="text-neutral-400">{num(c.count)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {posts.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            <T {...TXT.latest} />
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
          {stackSlug && stackLabel ? (
            <p className="mt-4">
              <Link href={`/jobs/stack/${stackSlug}`} className="text-accent no-underline hover:underline">
                <T {...fill(TXT.allJobs, { label: stackLabel })} />
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {months.length > 1 ? (
        <section className="mt-10">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            <T {...TXT.months} />
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {months
              .filter((m) => m.key !== data.month)
              .map((m) => (
                <li key={m.key}>
                  <Link href={stackSlug ? `/jobs/hiring/${m.key}/${stackSlug}` : `/jobs/hiring/${m.key}`} className={chip}>
                    <T {...m.label} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-xs leading-relaxed text-neutral-400 dark:text-neutral-500">
        <T {...TXT.how} />
      </p>
    </>
  );
}
