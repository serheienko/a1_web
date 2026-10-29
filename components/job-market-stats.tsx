// components/job-market-stats.tsx
//
// 11.10.2026. Блок «ринок» под вакансией: цифры по нашей базе, которых нет
// у источника (см. шапку lib/a1/job-stats.ts -- там про то, зачем это
// вообще и почему не статьи).
//
// Серверный компонент: всё, что он показывает, должно быть в HTML, иначе
// для поиска блока как бы нет. Многоязычие -- тем же приёмом, что и вся
// страница (components/t.tsx): все девять вариантов в разметке, видимый
// выбирает CSS; числа стоят снаружи <T>, чтобы не повторять их девять раз.
//
// Ссылки здесь не украшение: каждая вакансия начинает ссылаться на
// посадочные по профессии, стране и стеку. Это та внутренняя
// перелинковка, которой у 25 тысяч «обнаружених, не проіндексованих»
// страниц сейчас нет.

import Link from "next/link";
import type { JobStats } from "@/lib/a1/job-stats";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";

const CURRENCY_SIGN: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", UAH: "₴", PLN: "zł ", JPY: "¥", INR: "₹", ILS: "₪" };

/** Сумма в валюте страны: «$3 500», «€62k», «zł 18 000». */
function money(value: number, currency = "USD"): string {
  const sign = CURRENCY_SIGN[currency] ?? `${currency} `;
  const n =
    value >= 100_000
      ? `${Math.round(value / 1000)}k`
      : value >= 10_000
        ? `${(Math.round(value / 500) * 500).toLocaleString("en-US").replace(/,/g, " ")}`
        : `${(Math.round(value / 100) * 100).toLocaleString("en-US").replace(/,/g, " ")}`;
  return sign + n;
}

/**
 * Название профессии на всех языках сразу. Короткий `label` («Data») в
 * предложение не ставится: 11.10.2026 на проде вышло «Data на A1 зараз»,
 * будто фразу оборвали. У профессии есть полные названия для uk/ru/en
 * (lib/seo/job-role.ts), остальные языки берут английское.
 */
function RoleName({ role, locale: only }: { role: NonNullable<JobStats["role"]>; locale?: Locale }) {
  if (only) return <>{only === "uk" ? role.uk : only === "ru" ? role.ru : role.en}</>;
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {locale === "uk" ? role.uk : locale === "ru" ? role.ru : role.en}
        </span>
      ))}
    </>
  );
}

/** Название страны на всех языках сразу -- как в components/locale-format.tsx. */
function CountryName({ cc, locale: only }: { cc: string; locale?: Locale }) {
  const country = countryByCode(cc);
  if (!country) return null;
  if (only) return <>{countryName(country, only)}</>;
  return (
    <>
      {LOCALES.map((locale) => (
        <span key={locale} className={LOCALE_VISIBILITY_CLASS[locale]}>
          {countryName(country, locale)}
        </span>
      ))}
    </>
  );
}

export function JobMarketStats({ stats, locale }: { stats: JobStats | null; locale?: Locale }) {
  if (!stats) return null;

  const { role, cc, roleHere, roleWorld, fresh7d, countryTotal, salary, tech, company } = stats;
  const hasRole = !!role && roleWorld >= 8;
  const rows: React.ReactNode[] = [];

  if (hasRole) {
    rows.push(
      <li key="role">
        <Link href={`/jobs/role/${role!.slug}`} className="font-medium text-accent hover:underline">
          <RoleName role={role!} locale={locale} />
        </Link>{" "}
        <T only={locale} uk="на A1 зараз" en="on A1 right now" ru="на A1 сейчас" de="auf A1 gerade" es="en A1 ahora" fr="sur A1 en ce moment" pl="na A1 teraz" ptBR="no A1 agora" zh="目前在 A1" />:{" "}
        <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">{roleWorld}</span>{" "}
        <T only={locale} uk="вакансій" en="jobs" ru="вакансий" de="Stellen" es="vacantes" fr="offres" pl="ofert" ptBR="vagas" zh="个职位" />
        {cc && roleHere > 0 ? (
          <>
            {", "}
            <T only={locale} uk="з них у" en="of them in" ru="из них в" de="davon in" es="de ellas en" fr="dont en" pl="z nich w" ptBR="delas em" zh="其中在" />{" "}
            <Link href={`/jobs/country/${cc.toLowerCase()}`} className="text-accent hover:underline">
              {flagEmoji(cc)} <CountryName cc={cc} locale={locale} />
            </Link>{" "}
            — <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">{roleHere}</span>
          </>
        ) : null}
      </li>,
    );
  }

  if (fresh7d > 0) {
    rows.push(
      <li key="fresh">
        <T only={locale} uk="Зʼявилося за тиждень" en="Posted in the last week" ru="Появилось за неделю" de="Letzte Woche neu" es="Publicadas esta semana" fr="Publiées cette semaine" pl="Dodane w tym tygodniu" ptBR="Publicadas nesta semana" zh="最近一周新增" />:{" "}
        <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">{fresh7d}</span>
      </li>,
    );
  }

  if (salary) {
    rows.push(
      <li key="salary">
        <T only={locale} uk="Зарплата в оголошеннях" en="Pay stated in ads" ru="Зарплата в объявлениях" de="Gehalt in den Anzeigen" es="Salario indicado en las ofertas" fr="Salaire indiqué dans les offres" pl="Wynagrodzenie w ogłoszeniach" ptBR="Salário informado nas vagas" zh="职位中标明的薪酬" />:{" "}
        <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">{money(salary.median, salary.currency)}</span>{" "}
        <T only={locale} uk="медіана, половина пропозицій" en="median, half of them" ru="медиана, половина предложений" de="Median, die Hälfte davon" es="mediana, la mitad entre" fr="médiane, la moitié entre" pl="mediana, połowa ofert" ptBR="mediana, metade delas" zh="中位数，半数在" />{" "}
        <span className="tabular-nums">
          {money(salary.p25, salary.currency)}–{money(salary.p75, salary.currency)}
        </span>{" "}
        {salary.period === "MONTH" ? (
          <T only={locale} uk="на місяць" en="a month" ru="в месяц" de="pro Monat" es="al mes" fr="par mois" pl="miesięcznie" ptBR="por mês" zh="每月" />
        ) : (
          <T only={locale} uk="на рік" en="a year" ru="в год" de="pro Jahr" es="al año" fr="par an" pl="rocznie" ptBR="por ano" zh="每年" />
        )}{" "}
        <span className="text-neutral-400">
          (<span className="tabular-nums">{salary.n}</span>{" "}
          <T only={locale} uk="вакансій з вилкою" en="ads with a range" ru="вакансий с вилкой" de="Anzeigen mit Spanne" es="ofertas con rango" fr="offres avec fourchette" pl="ofert z widełkami" ptBR="vagas com faixa" zh="个标明区间的职位" />)
        </span>
      </li>,
    );
  }

  if (tech.length > 0) {
    rows.push(
      <li key="tech">
        <T only={locale} uk="Поруч найчастіше просять" en="Most often asked alongside" ru="Рядом чаще всего просят" de="Am häufigsten zusätzlich verlangt" es="Lo que más piden junto a esto" fr="Le plus souvent demandé à côté" pl="Najczęściej wymagane obok" ptBR="O que mais pedem junto" zh="最常一并要求" />:{" "}
        {tech.map((t, i) => (
          <span key={t.tech}>
            {i > 0 ? ", " : ""}
            {t.href ? (
              <Link href={t.href} className="text-accent hover:underline">
                {t.tech}
              </Link>
            ) : (
              t.tech
            )}
          </span>
        ))}
      </li>,
    );
  }

  if (company) {
    rows.push(
      <li key="company">
        <T only={locale} uk="У цієї компанії на A1" en="This company on A1" ru="У этой компании на A1" de="Dieses Unternehmen auf A1" es="Esta empresa en A1" fr="Cette entreprise sur A1" pl="Ta firma na A1" ptBR="Esta empresa no A1" zh="这家公司在 A1" />:{" "}
        {company.href ? (
          <Link href={company.href} className="font-semibold text-accent hover:underline tabular-nums">
            {company.count}
          </Link>
        ) : (
          <span className="font-semibold tabular-nums">{company.count}</span>
        )}{" "}
        <T only={locale} uk="вакансій" en="jobs" ru="вакансий" de="Stellen" es="vacantes" fr="offres" pl="ofert" ptBR="vagas" zh="个职位" />
        {company.countries > 1 ? (
          <>
            {" "}
            <T only={locale} uk="у" en="across" ru="в" de="in" es="en" fr="dans" pl="w" ptBR="em" zh="分布在" />{" "}
            <span className="tabular-nums">{company.countries}</span>{" "}
            <T only={locale} uk="країнах" en="countries" ru="странах" de="Ländern" es="países" fr="pays" pl="krajach" ptBR="países" zh="个国家" />
          </>
        ) : null}
      </li>,
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-neutral-400">
        <T only={locale} uk="Ринок на A1" en="The market on A1" ru="Рынок на A1" de="Der Markt auf A1" es="El mercado en A1" fr="Le marché sur A1" pl="Rynek na A1" ptBR="O mercado no A1" zh="A1 上的市场" />
      </h2>
      <ul className="mt-2.5 flex flex-col gap-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        {rows}
      </ul>
      <p className="mt-3 text-[12px] text-neutral-400">
        <T only={locale}
          uk="Цифри рахуються з наших відкритих вакансій і оновлюються щогодини."
          en="Counted from our live vacancies, refreshed hourly."
          ru="Цифры считаются по нашим открытым вакансиям и обновляются каждый час."
          de="Aus unseren aktiven Stellen berechnet, stündlich aktualisiert."
          es="Calculado con nuestras vacantes activas, se actualiza cada hora."
          fr="Calculé à partir de nos offres actives, mis à jour chaque heure."
          pl="Liczone z naszych aktywnych ofert, odświeżane co godzinę."
          ptBR="Calculado a partir das nossas vagas ativas, atualizado a cada hora."
          zh="根据我们当前在招职位统计，每小时更新。"
        />
      </p>
    </section>
  );
}
