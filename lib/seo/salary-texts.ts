// lib/seo/salary-texts.ts
//
// 22.10.2026 (Разведчик: «сторінки Зарплати: <роль>, <країна>»). Тексты
// зарплатных страниц. Устроено как lib/seo/role-texts.ts: всё собирается
// из полей самой профессии (lib/seo/job-role.ts) и страны
// (lib/seo/countries.ts), а не из справочников Record<JobRole, ...> --
// при сорока с лишним профессиях справочник означал бы правку в трёх
// местах на каждую новую.
//
// Отбор и арифметика -- в lib/a1/salary-index.ts и lib/a1/salary-stats.ts.

import type { Locale } from "@/components/t";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { countryName, type Country } from "@/lib/seo/countries";

type L = Record<Locale, string>;

/** Девятиязычная запись, где отличаются только украинский и русский. */
function nine(uk: string, ru: string, en: string): L {
  return { uk, en, ru, de: en, es: en, fr: en, pl: en, ptBR: en, zh: en };
}

export function salaryH1(role: JobRole, country?: Country): L {
  const info = roleInfo(role)!;
  if (!country) {
    return nine(`Зарплати: ${info.uk}`, `Зарплаты: ${info.ru}`, `${info.en} salaries`);
  }
  return nine(
    `Зарплати: ${info.uk}, ${countryName(country, "uk")}`,
    `Зарплаты: ${info.ru}, ${countryName(country, "ru")}`,
    `${info.en} salaries in ${country.en}`,
  );
}

/** Строка под заголовком. {n} -- число вакансий, попавших в расчёт. */
export function salaryCountLine(role: JobRole): L {
  const en = `based on {n} ${roleInfo(role)!.en} jobs with a stated salary`;
  return nine(
    "за {n} вакансіями, де компанія назвала суму",
    "по {n} вакансиям, где компания назвала сумму",
    en,
  );
}

export function salaryLead(role: JobRole, country?: Country): L {
  const info = roleInfo(role)!;
  // Страна приписывается через тире, а не предлогом: справочник
  // (lib/seo/countries.ts) знает только именительный падеж, и «в Польща»
  // из него выходит само собой. Тот же приём, что у cityH1 в
  // lib/seo/segments.ts -- там падеж обходят двоеточием.
  const place = country ? ` — ${countryName(country, "uk")}` : "";
  const placeRu = country ? ` — ${countryName(country, "ru")}` : "";
  const placeEn = country ? ` in ${country.en}` : "";
  // 22.10.2026, сразу после выкладки. На живых данных видно: у «Project
  // та Product Management» из 1032 вакансій 758 американских, и мировая
  // медиана -- это медиана США. Человеку из Києва она говорит неправду,
  // если не сказать вслух, что число смешанное. Поэтому у страницы без
  // страны своя вторая фраза, а разрез по странам поднят под сводку
  // (components/salary-summary.tsx).
  const mixUk = country ? "" : " Це всі країни разом, тож число змішане: нижче той самий напрям окремо по країнах.";
  const mixRu = country ? "" : " Это все страны сразу, так что число смешанное: ниже то же направление отдельно по странам.";
  const mixEn = country ? "" : " This is all countries at once, so the figure is mixed — the same role by country is right below.";
  return nine(
    `Скільки платять за напрямом «${info.uk_hint}»${place}.${mixUk} Рахуємо тільки по вакансіях, де компанія сама назвала суму: нижче вони всі. Оновлюється щодня разом зі стрічкою.`,
    `Сколько платят по направлению «${info.ru}»${placeRu}.${mixRu} Считаем только по вакансиям, где компания сама назвала сумму: ниже они все. Обновляется ежедневно вместе с лентой.`,
    `What ${info.en} roles pay${placeEn}.${mixEn} Counted only from jobs where the company stated the figure itself — all of them are listed below. Updated daily.`,
  );
}

export function salaryMeta(role: JobRole, country?: Country): { title: string; description: string } {
  const info = roleInfo(role)!;
  const place = country ? `, ${countryName(country, "uk")}` : "";
  return {
    title: `Зарплати: ${info.uk}${place} — вилка та медіана | A1 Jobs`,
    description: `Скільки платять за напрямом «${info.uk_hint}»${place}: вилка, медіана і всі вакансії з указаною сумою. Оновлюється щодня.`,
  };
}

/** Заголовок страницы-указателя /jobs/salary. */
export const SALARY_HUB_H1: L = nine("Зарплати в IT", "Зарплаты в IT", "IT salaries");

export const SALARY_HUB_LEAD: L = nine(
  // 23.10.2026 (Александр, после першого показу хабу): цифри тут світові й часто
  // переважені США чи іншим найбагатшим ринком -- на самій сторінці ролі (нижче)
  // це вже пояснено й розбито по країнах, а в цьому списку такого пояснення не
  // було, і медіана без контексту читається як «у нас в Україні» та викликає
  // сміх. Додано коротке застереження прямо тут.
  "Скільки платять за напрямами — за вакансіями, де компанія сама назвала суму. Числа тут світові й часто переважені найбагатшим ринком (найчастіше США) — розбивку по країнах дивіться на сторінці кожного напряму. Сторінка з'являється лише там, де таких вакансій достатньо: медіана за трьома вакансіями — це не медіана, а три вакансії.",
  "Сколько платят по направлениям — по вакансиям, где компания сама назвала сумму. Числа здесь мировые и часто смещены в сторону самого богатого рынка (чаще всего США) — разбивку по странам смотрите на странице каждого направления. Страница появляется только там, где таких вакансий достаточно: медиана по трём вакансиям — это не медиана, а три вакансии.",
  "What roles pay, counted from jobs where the company stated the figure itself. These are world-wide figures, often skewed by the single richest market (usually the US) — see each role's own page for the country breakdown. A page appears only where there are enough such jobs — a median over three jobs is not a median, it is three jobs.",
);

export const SALARY_LINKS_TITLE: L = {
  uk: "Зарплати за напрямом",
  en: "Salaries by role",
  ru: "Зарплаты по направлению",
  de: "Gehälter nach Rolle",
  es: "Salarios por puesto",
  fr: "Salaires par métier",
  pl: "Wynagrodzenia wg stanowiska",
  ptBR: "Salários por função",
  zh: "各职位薪资",
};
