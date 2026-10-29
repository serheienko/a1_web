// components/salary-summary.tsx
//
// 22.10.2026. Три числа над списком вакансий на зарплатной странице:
// вилка, медиана, сколько вакансий за этим стоит. Почему вилка -- это
// квартили, а не минимум с максимумом, и почему всё считается в месяц и
// без конвертации валют -- в шапке lib/a1/salary-stats.ts.
//
// Девять языков -- тем же приёмом, что у <T/> и CountLine: рисуем все
// девять вариантов, видимый выбирает CSS. Иначе пришлось бы читать язык
// из куки и терять статическую генерацию страницы.

import Link from "next/link";
import { LOCALES, LOCALE_VISIBILITY_CLASS, T, type Locale } from "@/components/t";
import { formatSalary } from "@/lib/format";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import type { SalaryStats } from "@/lib/a1/salary-stats";

function money(amount: number, currency: string, locale: Locale): string {
  return formatSalary({ min: amount, max: amount, currency, period: "MONTH" }, locale);
}

/** 29.10.2026: на языковой странице (/en, /de ...) -- только этот язык, без девяти вариантов. */
function tx(locale: Locale | undefined, props: Record<Locale, string>): React.ReactNode {
  return locale ? props[locale] : <T {...props} />;
}

function each(locale: Locale | undefined, render: (l: Locale) => string): React.ReactNode {
  if (locale) return render(locale);
  return LOCALES.map((l) => (
    <span key={l} className={LOCALE_VISIBILITY_CLASS[l]}>
      {render(l)}
    </span>
  ));
}

/** Одно число с подписью. */
function Cell({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-2xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
      <div className="text-[12px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-neutral-900 tabular-nums dark:text-neutral-50">{children}</div>
    </div>
  );
}

/**
 * 22.10.2026. Разрез по странам -- прямо под сводкой, а не в блоке
 * перелинковки внизу. На живых данных у «Project та Product Management»
 * 758 из 1032 вакансий американские: мировая медиана -- это медиана США,
 * и человеку из Києва она говорит неправду, пока он не увидит рядом свою
 * страну. Внизу, после сорока карточек вакансий, он её не увидит.
 */
export type SalaryCountry = { cc: string; stats: SalaryStats };

export function SalarySummary({
  stats,
  role,
  countries = [],
  locale,
}: {
  /** Языковая страница: подписи одним языком и ссылки с приставкой языка. */
  locale?: Locale;
  stats: SalaryStats;
  /** Нужен только чтобы собрать адреса разрезов. */
  role?: string;
  countries?: SalaryCountry[];
}) {
  return (
    <section className="mb-8" aria-label="salary summary">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Cell
          label={tx(locale, { uk: "Вилка", en: "Typical range", ru: "Вилка", de: "Spanne", es: "Rango", fr: "Fourchette", pl: "Widełki", ptBR: "Faixa", zh: "区间" })}
        >
          {each(locale, (l) => formatSalary({ min: stats.p25, max: stats.p75, currency: stats.currency, period: "MONTH" }, l))}
        </Cell>
        <Cell label={tx(locale, { uk: "Медіана", en: "Median", ru: "Медиана", de: "Median", es: "Mediana", fr: "Médiane", pl: "Mediana", ptBR: "Mediana", zh: "中位数" })}>
          {each(locale, (l) => money(stats.median, stats.currency, l))}
        </Cell>
        <Cell label={tx(locale, { uk: "Вакансій у розрахунку", en: "Jobs counted", ru: "Вакансий в расчёте", de: "Stellen gezählt", es: "Vacantes contadas", fr: "Offres comptées", pl: "Policzonych ofert", ptBR: "Vagas contadas", zh: "纳入职位数" })}>
          {stats.count}
        </Cell>
      </div>

      {role && countries.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 text-[12px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {tx(locale, { uk: "За країнами", en: "By country", ru: "По странам", de: "Nach Land", es: "Por país", fr: "Par pays", pl: "Wg kraju", ptBR: "Por país", zh: "按国家" })}
          </div>
          <ul className="flex flex-wrap gap-2">
            {countries.map(({ cc, stats: cs }) => (
              <li key={cc}>
                <Link
                  href={`${locale ? `/${locale}` : ""}/jobs/salary/${role}/${cc.toLowerCase()}`}
                  className="flex items-baseline gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] transition hover:border-accent/40 hover:bg-accent/5 dark:border-neutral-800"
                >
                  <span aria-hidden="true">{flagEmoji(cc)}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {(() => {
                      const c = countryByCode(cc);
                      return c ? countryName(c, locale ?? "uk") : cc.toUpperCase();
                    })()}
                  </span>
                  <span className="font-semibold text-neutral-900 tabular-nums dark:text-neutral-100">
                    {each(locale, (l) => money(cs.median, cs.currency, l))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Что именно посчитано: без этой строки числа выглядят точнее,
          чем они есть. Половина рынка между четвертью и тремя
          четвертями -- это и есть «вилка», а не минимум с максимумом. */}
      <p className="mt-3 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        {tx(locale, { uk: "Вилка — це середина ринку: чверть вакансій платить менше, чверть більше. Суми — на місяць, тільки з вакансій, де компанія назвала її сама.", en: "The range is the middle of the market: a quarter of jobs pay less, a quarter more. Figures are per month, taken only from jobs where the company stated them.", ru: "Вилка — это середина рынка: четверть вакансий платит меньше, четверть больше. Суммы — в месяц, только из вакансий, где компания назвала её сама.", de: "Die Spanne ist die Mitte des Marktes: ein Viertel zahlt weniger, ein Viertel mehr. Beträge pro Monat, nur aus Stellen mit genannter Summe.", es: "El rango es el centro del mercado: un cuarto paga menos, un cuarto más. Importes mensuales, solo de vacantes donde la empresa indicó la cifra.", fr: "La fourchette est le milieu du marché : un quart paie moins, un quart plus. Montants mensuels, uniquement d'offres où l'entreprise a indiqué la somme.", pl: "Widełki to środek rynku: ćwierć ofert płaci mniej, ćwierć więcej. Kwoty miesięczne, tylko z ofert, w których firma sama podała sumę.", ptBR: "A faixa é o meio do mercado: um quarto paga menos, um quarto mais. Valores mensais, apenas de vagas em que a empresa informou o número.", zh: "区间代表市场中段：四分之一的职位更低，四分之一更高。金额按月计算，仅取自公司自行标明薪资的职位。" })}
        {stats.skipped > 0 ? (
          <>
            {" "}
            {tx(locale, { uk: `Ще ${stats.skipped} вакансій названо в іншій валюті — їх не змішуємо, курсу ми не вигадуємо.`, en: `Another ${stats.skipped} jobs state a different currency — we do not mix them, and we do not invent an exchange rate.`, ru: `Ещё ${stats.skipped} вакансий названо в другой валюте — их не смешиваем, курс мы не выдумываем.`, de: `Weitere ${stats.skipped} Stellen nennen eine andere Währung — wir mischen nicht und erfinden keinen Kurs.`, es: `Otras ${stats.skipped} vacantes usan otra moneda: no las mezclamos ni inventamos un tipo de cambio.`, fr: `${stats.skipped} autres offres sont dans une autre devise : nous ne les mélangeons pas et n'inventons pas de taux.`, pl: `Kolejne ${stats.skipped} ofert podaje inną walutę — nie mieszamy ich i nie wymyślamy kursu.`, ptBR: `Outras ${stats.skipped} vagas usam outra moeda: não misturamos nem inventamos câmbio.`, zh: `另有 ${stats.skipped} 个职位使用其他货币——我们不做混算，也不自行设定汇率。` })}
          </>
        ) : null}
      </p>
    </section>
  );
}
