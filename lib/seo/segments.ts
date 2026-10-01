// lib/seo/segments.ts
//
// 30.09.2026 (Александр: «давай все сделаем... и на мир тоже, под тир-1 на
// английском»). Посадочные «сегменты»: город, уровень, страна + технология,
// страна + удалёнка, страна + уровень. Каждая -- отдельный адрес под свой
// поисковый запрос («python jobs germany», «junior developer jobs uk»,
// «IT вакансії Київ»).
//
// Правило против «тонких» страниц: сегмент живёт, только если в нём от
// MIN_SEGMENT_POSTS вакансий. Меньше -- страницы нет (404), в карту сайта
// она не попадает. Считается от живых данных, а не списком руками: вырос
// Лондон -- страница появилась сама.
//
// Здесь только тексты и адреса; отбор вакансий -- lib/a1/segment-index.ts.

import type { Locale } from "@/components/t";
import { countryByCode, countryName, flagEmoji, type Country } from "@/lib/seo/countries";
import type { JobLevel } from "@/lib/seo/job-level";

export const MIN_SEGMENT_POSTS = 10;
export const SEGMENT_LIMIT = 40;

type L = Record<Locale, string>;

/** Украинские и русские названия городов Украины; остальные -- как у бэкенда (английские). */
const UA_CITIES: Record<string, { uk: string; ru: string }> = {
  Kyiv: { uk: "Київ", ru: "Киев" },
  Lviv: { uk: "Львів", ru: "Львов" },
  Dnipro: { uk: "Дніпро", ru: "Днепр" },
  Kharkiv: { uk: "Харків", ru: "Харьков" },
  Odesa: { uk: "Одеса", ru: "Одесса" },
  Vinnytsia: { uk: "Вінниця", ru: "Винница" },
  Zaporizhzhia: { uk: "Запоріжжя", ru: "Запорожье" },
  "Ivano-Frankivsk": { uk: "Івано-Франківськ", ru: "Ивано-Франковск" },
  Ternopil: { uk: "Тернопіль", ru: "Тернополь" },
  Chernivtsi: { uk: "Чернівці", ru: "Черновцы" },
  Uzhhorod: { uk: "Ужгород", ru: "Ужгород" },
  Lutsk: { uk: "Луцьк", ru: "Луцк" },
  Rivne: { uk: "Рівне", ru: "Ровно" },
  Poltava: { uk: "Полтава", ru: "Полтава" },
  Cherkasy: { uk: "Черкаси", ru: "Черкассы" },
  Zhytomyr: { uk: "Житомир", ru: "Житомир" },
  Mykolaiv: { uk: "Миколаїв", ru: "Николаев" },
  Khmelnytskyi: { uk: "Хмельницький", ru: "Хмельницкий" },
};

export function cityLabel(city: string, locale: "uk" | "ru" | "en"): string {
  const ua = UA_CITIES[city];
  if (!ua || locale === "en") return city;
  return ua[locale];
}

/** Адресный кусок города: «San Francisco» → «san-francisco», «Zürich» → «zurich». */
export function slugifyCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cn(country: Country, locale: Locale): string {
  return countryName(country, locale);
}

const LEVEL_EN: Record<JobLevel, string> = { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" };
const LEVEL_UK: Record<JobLevel, string> = { junior: "Junior", middle: "Middle", senior: "Senior", lead: "Lead" };

export function levelLabel(level: JobLevel): string {
  return LEVEL_EN[level];
}

// ─────────────────────────── город ───────────────────────────

export function cityH1(city: string, country: Country): L {
  const flag = flagEmoji(country.code);
  const ua = country.code === "UA";
  const c = city;
  return {
    uk: `${flag} IT-вакансії: ${ua ? cityLabel(city, "uk") : c}`,
    en: `${flag} IT jobs in ${c}`,
    ru: `${flag} IT-вакансии: ${ua ? cityLabel(city, "ru") : c}`,
    de: `${flag} IT-Jobs in ${c}`,
    es: `${flag} Empleos de TI en ${c}`,
    fr: `${flag} Emplois IT à ${c}`,
    pl: `${flag} Oferty pracy IT: ${c}`,
    ptBR: `${flag} Vagas de TI em ${c}`,
    zh: `${flag} ${c} IT 职位`,
  };
}

export function cityCountLine(city: string, country: Country): L {
  const ua = country.code === "UA";
  return {
    uk: `{n} відкритих вакансій: ${ua ? cityLabel(city, "uk") : city}`,
    en: `{n} open jobs in ${city}`,
    ru: `{n} открытых вакансий: ${ua ? cityLabel(city, "ru") : city}`,
    de: `{n} offene Stellen in ${city}`,
    es: `{n} vacantes abiertas en ${city}`,
    fr: `{n} offres ouvertes à ${city}`,
    pl: `{n} otwartych ofert: ${city}`,
    ptBR: `{n} vagas abertas em ${city}`,
    zh: `{n} 个开放职位：${city}`,
  };
}

export function cityLead(city: string, country: Country): L {
  const ua = country.code === "UA";
  const uk = ua ? cityLabel(city, "uk") : city;
  const ru = ua ? cityLabel(city, "ru") : city;
  return {
    uk: `Вакансії в IT з офісом у місті ${uk}: розробка, дані, DevOps, продукт і дизайн. Список оновлюється щодня.`,
    en: `Tech jobs with an office in ${city}: software engineering, data, DevOps, product and design. Updated daily.`,
    ru: `Вакансии в IT с офисом в городе ${ru}: разработка, данные, DevOps, продукт и дизайн. Список обновляется ежедневно.`,
    de: `Tech-Jobs mit Büro in ${city}: Softwareentwicklung, Daten, DevOps, Produkt und Design. Täglich aktualisiert.`,
    es: `Empleos tecnológicos con oficina en ${city}: desarrollo, datos, DevOps, producto y diseño. Actualizado a diario.`,
    fr: `Emplois tech avec bureau à ${city} : développement, data, DevOps, produit et design. Mis à jour chaque jour.`,
    pl: `Oferty IT z biurem w mieście ${city}: programowanie, dane, DevOps, produkt i design. Aktualizowane codziennie.`,
    ptBR: `Vagas de tecnologia com escritório em ${city}: desenvolvimento, dados, DevOps, produto e design. Atualizado diariamente.`,
    zh: `在 ${city} 设有办公室的科技职位：软件开发、数据、DevOps、产品与设计，每日更新。`,
  };
}

export function cityMeta(city: string, country: Country): { title: string; description: string } {
  if (country.code === "UA") {
    const uk = cityLabel(city, "uk");
    return {
      title: `IT вакансії ${uk} — робота в IT, ${uk} | A1 Jobs`,
      description: `Відкриті IT-вакансії в місті ${uk}: розробка, QA, дані, DevOps, продукт і дизайн. Список оновлюється щодня.`,
    };
  }
  return {
    title: `IT jobs in ${city}, ${cn(country, "en")} — developer, data & product roles | A1 Jobs`,
    description: `Open IT jobs in ${city}, ${cn(country, "en")}: software engineering, data, DevOps, product and design roles. Updated daily.`,
  };
}

// ─────────────────────────── уровень (по всему сайту, для украинской аудитории) ───────────────────────────

export function globalLevelH1(level: JobLevel): L {
  const n = LEVEL_UK[level];
  return {
    uk: `${n} вакансії в IT`,
    en: `${LEVEL_EN[level]} IT jobs`,
    ru: `${n} вакансии в IT`,
    de: `${LEVEL_EN[level]} IT-Jobs`,
    es: `Empleos TI nivel ${LEVEL_EN[level]}`,
    fr: `Emplois IT niveau ${LEVEL_EN[level]}`,
    pl: `Oferty IT: ${LEVEL_EN[level]}`,
    ptBR: `Vagas de TI nível ${LEVEL_EN[level]}`,
    zh: `${LEVEL_EN[level]} IT 职位`,
  };
}

export function globalLevelCountLine(level: JobLevel): L {
  const n = LEVEL_EN[level];
  return {
    uk: `{n} відкритих ${n}-вакансій`,
    en: `{n} open ${n} jobs`,
    ru: `{n} открытых ${n}-вакансий`,
    de: `{n} offene ${n}-Stellen`,
    es: `{n} vacantes ${n} abiertas`,
    fr: `{n} offres ${n} ouvertes`,
    pl: `{n} otwartych ofert ${n}`,
    ptBR: `{n} vagas ${n} abertas`,
    zh: `{n} 个开放的 ${n} 职位`,
  };
}

const LEVEL_LEAD_UK: Record<JobLevel, string> = {
  junior: "Вакансії, де в назві позиції вказано Junior чи стажування: для тих, хто починає в IT. Вакансії з України та віддалені з будь-якої країни, оновлюється щодня.",
  middle: "Вакансії рівня Middle за назвою позиції. Вакансії з України та віддалені з будь-якої країни, оновлюється щодня.",
  senior: "Вакансії рівня Senior за назвою позиції. Вакансії з України та віддалені з будь-якої країни, оновлюється щодня.",
  lead: "Вакансії рівня Lead, Staff, Principal та Head of за назвою позиції. Вакансії з України та віддалені з будь-якої країни, оновлюється щодня.",
};

export function globalLevelLead(level: JobLevel): L {
  const n = LEVEL_EN[level];
  const en = `Jobs whose title says ${n}. Ukraine-based roles and remote roles open to any country. Updated daily.`;
  return {
    uk: LEVEL_LEAD_UK[level],
    en,
    ru: `Вакансии, где в названии позиции указан ${n}. Вакансии из Украины и удалённые из любой страны, обновляется ежедневно.`,
    de: `Stellen mit ${n} im Titel. Rollen in der Ukraine und Remote-Rollen aus jedem Land. Täglich aktualisiert.`,
    es: `Vacantes con ${n} en el título. Puestos en Ucrania y remotos desde cualquier país. Actualizado a diario.`,
    fr: `Offres dont le titre indique ${n}. Postes en Ukraine et en télétravail depuis n'importe quel pays. Mis à jour chaque jour.`,
    pl: `Oferty z ${n} w tytule. Stanowiska w Ukrainie i zdalne z dowolnego kraju. Aktualizowane codziennie.`,
    ptBR: `Vagas com ${n} no título. Posições na Ucrânia e remotas de qualquer país. Atualizado diariamente.`,
    zh: `职位名称包含 ${n} 的职位，涵盖乌克兰本地与可从任何国家申请的远程职位，每日更新。`,
  };
}

export function globalLevelMeta(level: JobLevel): { title: string; description: string } {
  const n = LEVEL_UK[level];
  const extra: Record<JobLevel, string> = {
    junior: "робота для початківців в IT",
    middle: "робота для досвідчених",
    senior: "робота для досвідчених розробників",
    lead: "керівні та провідні ролі",
  };
  return {
    title: `${n} вакансії — ${extra[level]} | A1 Jobs`,
    description: `Відкриті ${n}-вакансії в IT: в Україні та віддалено з будь-якої країни. Список оновлюється щодня.`,
  };
}

// ─────────────────────────── страна + технология / уровень / удалёнка ───────────────────────────

export type CountrySegKind = "stack" | "level" | "remote";

/** Подпись сегмента внутри страны: «Python», «Junior», «Remote». */
export function segLabel(kind: CountrySegKind, label: string): string {
  return kind === "remote" ? "Remote" : label;
}

export function countrySegH1(kind: CountrySegKind, label: string, country: Country): L {
  const flag = flagEmoji(country.code);
  const en = cn(country, "en");
  if (kind === "remote") {
    return {
      uk: `${flag} Віддалена IT-робота: ${cn(country, "uk")}`,
      en: `${flag} Remote IT jobs in ${en}`,
      ru: `${flag} Удалённая IT-работа: ${cn(country, "ru")}`,
      de: `${flag} Remote-IT-Jobs: ${en}`,
      es: `${flag} Empleos de TI remotos: ${en}`,
      fr: `${flag} Emplois IT en télétravail : ${en}`,
      pl: `${flag} Zdalna praca IT: ${en}`,
      ptBR: `${flag} Vagas de TI remotas: ${en}`,
      zh: `${flag} ${en} 远程 IT 职位`,
    };
  }
  if (kind === "level") {
    return {
      uk: `${flag} ${label} IT-вакансії: ${cn(country, "uk")}`,
      en: `${flag} ${label} IT jobs in ${en}`,
      ru: `${flag} ${label} IT-вакансии: ${cn(country, "ru")}`,
      de: `${flag} ${label} IT-Jobs: ${en}`,
      es: `${flag} Empleos de TI ${label}: ${en}`,
      fr: `${flag} Emplois IT ${label} : ${en}`,
      pl: `${flag} Oferty IT ${label}: ${en}`,
      ptBR: `${flag} Vagas de TI ${label}: ${en}`,
      zh: `${flag} ${en} ${label} IT 职位`,
    };
  }
  return {
    uk: `${flag} ${label} вакансії: ${cn(country, "uk")}`,
    en: `${flag} ${label} jobs in ${en}`,
    ru: `${flag} ${label} вакансии: ${cn(country, "ru")}`,
    de: `${flag} ${label} Jobs: ${en}`,
    es: `${flag} Empleos ${label}: ${en}`,
    fr: `${flag} Offres ${label} : ${en}`,
    pl: `${flag} Praca ${label}: ${en}`,
    ptBR: `${flag} Vagas ${label}: ${en}`,
    zh: `${flag} ${en} ${label} 职位`,
  };
}

export function countrySegCountLine(kind: CountrySegKind, label: string, country: Country): L {
  const en = cn(country, "en");
  const what = kind === "remote" ? "remote" : label;
  return {
    uk: `{n} відкритих вакансій (${what}): ${cn(country, "uk")}`,
    en: `{n} open ${what} jobs in ${en}`,
    ru: `{n} открытых вакансий (${what}): ${cn(country, "ru")}`,
    de: `{n} offene ${what}-Stellen: ${en}`,
    es: `{n} vacantes ${what} abiertas: ${en}`,
    fr: `{n} offres ${what} ouvertes : ${en}`,
    pl: `{n} otwartych ofert (${what}): ${en}`,
    ptBR: `{n} vagas ${what} abertas: ${en}`,
    zh: `{n} 个开放职位（${what}）：${en}`,
  };
}

export function countrySegLead(kind: CountrySegKind, label: string, country: Country): L {
  const en = cn(country, "en");
  const scope =
    kind === "remote"
      ? `Remote roles with a base in ${en}`
      : kind === "level"
        ? `Roles in ${en} whose title says ${label}`
        : `Roles in ${en} that mention ${label} in the description`;
  return {
    uk: `Вакансії з країни «${cn(country, "uk")}» (${kind === "remote" ? "віддалені" : label}). Збирається з сайтів компаній, оновлюється щодня.`,
    en: `${scope}. Collected from company career pages and updated daily.`,
    ru: `Вакансии из страны «${cn(country, "ru")}» (${kind === "remote" ? "удалённые" : label}). Собирается с сайтов компаний, обновляется ежедневно.`,
    de: `Stellen in ${en} (${kind === "remote" ? "Remote" : label}). Von Karriereseiten gesammelt, täglich aktualisiert.`,
    es: `Vacantes en ${en} (${kind === "remote" ? "remoto" : label}). Recogidas de las páginas de empleo de las empresas y actualizadas a diario.`,
    fr: `Offres en ${en} (${kind === "remote" ? "télétravail" : label}). Collectées sur les pages carrières et mises à jour chaque jour.`,
    pl: `Oferty: ${en} (${kind === "remote" ? "zdalne" : label}). Zbierane ze stron karier firm, aktualizowane codziennie.`,
    ptBR: `Vagas em ${en} (${kind === "remote" ? "remoto" : label}). Coletadas de páginas de carreiras e atualizadas diariamente.`,
    zh: `${en} 的职位（${kind === "remote" ? "远程" : label}），来自公司招聘页面，每日更新。`,
  };
}

export function countrySegMeta(kind: CountrySegKind, label: string, country: Country): { title: string; description: string } {
  const en = cn(country, "en");
  if (kind === "remote") {
    return {
      title: `Remote IT jobs in ${en} — developer, data & product roles | A1 Jobs`,
      description: `Remote IT jobs based in ${en}: software engineering, data, DevOps, product and design roles at top tech companies. Updated daily.`,
    };
  }
  if (kind === "level") {
    return {
      title: `${label} developer jobs in ${en} — ${label} IT roles | A1 Jobs`,
      description: `Open ${label} IT jobs in ${en} at top tech companies: software engineering, data, DevOps, product and design. Updated daily.`,
    };
  }
  return {
    title: `${label} jobs in ${en} — ${label} developer vacancies | A1 Jobs`,
    description: `Open ${label} jobs in ${en}: roles that need ${label} at top tech companies, in the office, hybrid and remote. Updated daily.`,
  };
}

export function flagFor(country: Country): string {
  return flagEmoji(country.code);
}

export function countryLabelEn(code: string): string {
  const c = countryByCode(code);
  return c ? c.en : code;
}

// ─────────────────────────── 01.10.2026: город + технология, удалённо + технология ───────────────────────────

export function cityTechH1(city: string, tech: string, country: Country): L {
  const flag = flagEmoji(country.code);
  const ua = country.code === "UA";
  const cu = ua ? cityLabel(city, "uk") : city;
  const cr = ua ? cityLabel(city, "ru") : city;
  return {
    uk: `${flag} ${tech} вакансії: ${cu}`,
    en: `${flag} ${tech} jobs in ${city}`,
    ru: `${flag} ${tech} вакансии: ${cr}`,
    de: `${flag} ${tech}-Jobs in ${city}`,
    es: `${flag} Empleos de ${tech} en ${city}`,
    fr: `${flag} Emplois ${tech} à ${city}`,
    pl: `${flag} Praca ${tech}: ${city}`,
    ptBR: `${flag} Vagas de ${tech} em ${city}`,
    zh: `${flag} ${city} ${tech} 职位`,
  };
}

export function cityTechCountLine(city: string, tech: string, country: Country): L {
  const ua = country.code === "UA";
  return {
    uk: `{n} відкритих вакансій (${tech}): ${ua ? cityLabel(city, "uk") : city}`,
    en: `{n} open ${tech} jobs in ${city}`,
    ru: `{n} открытых вакансий (${tech}): ${ua ? cityLabel(city, "ru") : city}`,
    de: `{n} offene ${tech}-Stellen in ${city}`,
    es: `{n} vacantes de ${tech} abiertas en ${city}`,
    fr: `{n} offres ${tech} ouvertes à ${city}`,
    pl: `{n} otwartych ofert (${tech}): ${city}`,
    ptBR: `{n} vagas de ${tech} abertas em ${city}`,
    zh: `{n} 个开放职位（${tech}）：${city}`,
  };
}

export function cityTechLead(city: string, tech: string, country: Country): L {
  const ua = country.code === "UA";
  const uk = ua ? cityLabel(city, "uk") : city;
  const ru = ua ? cityLabel(city, "ru") : city;
  return {
    uk: `Вакансії, де потрібен ${tech}, з офісом у місті ${uk}. Збирається з сайтів компаній, оновлюється щодня.`,
    en: `Roles in ${city} that mention ${tech} in the description — in the office, hybrid and remote. Collected from company career pages and updated daily.`,
    ru: `Вакансии, где нужен ${tech}, с офисом в городе ${ru}. Собирается с сайтов компаний, обновляется ежедневно.`,
    de: `Stellen in ${city}, die ${tech} verlangen. Von Karriereseiten gesammelt, täglich aktualisiert.`,
    es: `Vacantes en ${city} que requieren ${tech}. Recogidas de las páginas de empleo y actualizadas a diario.`,
    fr: `Offres à ${city} qui demandent ${tech}. Collectées sur les pages carrières et mises à jour chaque jour.`,
    pl: `Oferty w mieście ${city}, w których wymagany jest ${tech}. Zbierane ze stron karier, aktualizowane codziennie.`,
    ptBR: `Vagas em ${city} que pedem ${tech}. Coletadas de páginas de carreiras e atualizadas diariamente.`,
    zh: `${city} 要求 ${tech} 的职位，来自公司招聘页面，每日更新。`,
  };
}

export function cityTechMeta(city: string, tech: string, country: Country): { title: string; description: string } {
  if (country.code === "UA") {
    const uk = cityLabel(city, "uk");
    return {
      title: `${tech} вакансії ${uk} — робота ${tech}-розробника | A1 Jobs`,
      description: `Відкриті вакансії ${tech} у місті ${uk}: офіс, гібрид і віддалено. Список оновлюється щодня.`,
    };
  }
  return {
    title: `${tech} jobs in ${city}, ${cn(country, "en")} — ${tech} developer vacancies | A1 Jobs`,
    description: `Open ${tech} jobs in ${city}, ${cn(country, "en")}: roles that need ${tech} at top tech companies, in the office, hybrid and remote. Updated daily.`,
  };
}

export function remoteTechH1(tech: string): L {
  return {
    uk: `Віддалена робота: ${tech}`,
    en: `Remote ${tech} jobs`,
    ru: `Удалённая работа: ${tech}`,
    de: `Remote-${tech}-Jobs`,
    es: `Empleos remotos de ${tech}`,
    fr: `Emplois ${tech} en télétravail`,
    pl: `Zdalna praca: ${tech}`,
    ptBR: `Vagas remotas de ${tech}`,
    zh: `远程 ${tech} 职位`,
  };
}

export function remoteTechCountLine(tech: string): L {
  return {
    uk: `{n} відкритих віддалених вакансій (${tech})`,
    en: `{n} open remote ${tech} jobs`,
    ru: `{n} открытых удалённых вакансий (${tech})`,
    de: `{n} offene Remote-Stellen (${tech})`,
    es: `{n} vacantes remotas abiertas (${tech})`,
    fr: `{n} offres en télétravail (${tech})`,
    pl: `{n} otwartych ofert zdalnych (${tech})`,
    ptBR: `{n} vagas remotas abertas (${tech})`,
    zh: `{n} 个开放远程职位（${tech}）`,
  };
}

export function remoteTechLead(tech: string): L {
  return {
    uk: `Віддалені вакансії, де потрібен ${tech}: з українських компаній і від роботодавців, які наймають з будь-якої країни. Оновлюється щодня.`,
    en: `Remote roles that need ${tech}: from Ukrainian employers and companies hiring from anywhere. Updated daily.`,
    ru: `Удалённые вакансии, где нужен ${tech}: от украинских компаний и работодателей, нанимающих из любой страны. Обновляется ежедневно.`,
    de: `Remote-Stellen mit ${tech}: von ukrainischen Arbeitgebern und Firmen, die weltweit einstellen. Täglich aktualisiert.`,
    es: `Vacantes remotas que requieren ${tech}: de empresas ucranianas y de empleadores que contratan desde cualquier país. Actualizado a diario.`,
    fr: `Offres en télétravail demandant ${tech} : d'employeurs ukrainiens et d'entreprises qui recrutent partout. Mis à jour chaque jour.`,
    pl: `Zdalne oferty z ${tech}: od ukraińskich pracodawców i firm zatrudniających z dowolnego kraju. Aktualizowane codziennie.`,
    ptBR: `Vagas remotas que pedem ${tech}: de empresas ucranianas e de empregadores que contratam de qualquer país. Atualizado diariamente.`,
    zh: `需要 ${tech} 的远程职位：来自乌克兰雇主和全球招聘的公司，每日更新。`,
  };
}

export function remoteTechMeta(tech: string): { title: string; description: string } {
  return {
    title: `Віддалена робота ${tech} — remote ${tech} вакансії | A1 Jobs`,
    description: `Відкриті віддалені вакансії ${tech}: від українських компаній і роботодавців, які наймають з будь-якої країни. Список оновлюється щодня.`,
  };
}
