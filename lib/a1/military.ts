// lib/a1/military.ts
//
// 08.10.2026 (Александр: «переименовать тег бронирования в Військо…
// вакансии с бронированием и без, сверху баннер со статистикой»).
// Что считаем «военной» вакансией и как раскладываем её по направлениям.
//
// ВОЕННАЯ вакансия -- любая из трёх:
//   1) компания пишет о бронировании (lib/a1/job-facts.ts) -- как и раньше;
//   2) в ЗАГОЛОВКЕ явное военное слово: БпЛА, дрон, FPV, оборона, ЗСУ...;
//   3) в тексте таких слов не меньше двух РАЗНЫХ (одно «defense» в
//      описании кибербезопасности вакансию военной не делает).
// Плюс работодатель целиком: если у компании минимум 3 военные вакансии
// и они составляют половину её вакансий на сайте, остальные тоже
// считаем военными (бухгалтер в дроновой компании -- это тоже спрос
// оборонки). Правило осторожное: лучше недосчитать, чем приписать
// гражданской компании чужое.
//
// Направления (ROLES) определяем по ЗАГОЛОВКУ -- он не врёт. Порядок
// правил важен: «Інженер з ремонту БпЛА» -- производство, а не пилоты.

import type { WebPost } from "@/types/web-post";

export type RoleKey =
  | "hr-fin-sales"
  | "managers"
  | "qa-sec"
  | "electronics"
  | "production"
  | "software"
  | "design"
  | "uav-ops"
  | "procurement"
  | "other";

export const ROLE_ORDER: Exclude<RoleKey, "other">[] = [
  "hr-fin-sales",
  "managers",
  "qa-sec",
  "electronics",
  "production",
  "software",
  "design",
  "uav-ops",
  "procurement",
];

export const ROLE_LABEL: Record<RoleKey, { uk: string; en: string; ru: string }> = {
  "hr-fin-sales": { uk: "HR, фінанси, юристи, продажі", en: "HR, finance, legal, sales", ru: "HR, финансы, юристы, продажи" },
  managers: { uk: "Менеджери та керівники", en: "Managers and leads", ru: "Менеджеры и руководители" },
  "qa-sec": { uk: "QA, безпека, підтримка, аналітика", en: "QA, security, support, analytics", ru: "QA, безопасность, поддержка, аналитика" },
  electronics: { uk: "Електроніка та Embedded", en: "Electronics and embedded", ru: "Электроника и Embedded" },
  production: { uk: "Виробництво, ремонт, якість", en: "Production, repair, quality", ru: "Производство, ремонт, качество" },
  software: { uk: "Програмісти та AI", en: "Software and AI", ru: "Программисты и AI" },
  design: { uk: "Конструктори та механіки", en: "Design and mechanical", ru: "Конструкторы и механики" },
  "uav-ops": { uk: "Пілоти, оператори, інструктори БпЛА", en: "UAV pilots, operators, instructors", ru: "Пилоты, операторы, инструкторы БпЛА" },
  procurement: { uk: "Закупівлі, логістика, ЗЕД", en: "Procurement, logistics, customs", ru: "Закупки, логистика, ВЭД" },
  other: { uk: "Інші ролі", en: "Other roles", ru: "Другие роли" },
};

// Порядок = приоритет: первое совпавшее правило выигрывает.
const ROLE_RULES: [RoleKey, RegExp][] = [
  ["electronics", /embedded|\bpcb\b|hardware|електрон|схемотех|firmware|fpga|радіо|\brf\b|antenna|антен|мікроконтрол|радиоэлектрон|схемотех/i],
  ["qa-sec", /\bqa\b|\bsdet\b|tester|тестувальник|тестировщик|security|безпек|osint|аналітик|analyst|аналитик|support|підтримк|кібер|cyber|data scien/i],
  ["procurement", /закупів|закупк|procurement|supply|logist|логіст|\bзед\b|warehouse|склад|customs|митн|постачан/i],
  ["hr-fin-sales", /recruit|рекрутер|\bhr\b|hr[- ]|бухгалтер|accountant|фінанс|финанс|finance|financ|юрист|юрискон|legal|lawyer|sales|продаж|account manager|business development|маркетинг|marketing|talent|office manager|офіс-менедж|секретар|адміністратор|ceo\b/i],
  ["production", /ремонт|технік|technician|виробництв|production|якост|quality|складальн|монтаж|збирач|assembl|верстат|чпк|\bcnc\b|токар|фрезер|слюсар|manufactur|зварник|welder|електромонтаж|електрик|machine operator|контролер/i],
  ["uav-ops", /випробувальник|пілот|pilot|оператор|operator|інструктор|instructor|навчан|trainer/i],
  ["software", /developer|software|\bai\b|\bml\b|machine learning|python|c\+\+|backend|frontend|full[- ]?stack|devops|програміст|розробник|engineer.*(ai|ml|software)|computer vision|data engineer|\bsre\b/i],
  ["design", /конструктор|design engineer|mechanical|механік|механич|\bcad\b|solidworks|aerodynamic|аеродинам|інженер-констр|проєктувальник|проектувальник|structural|термо|матеріал/i],
  ["managers", /manager|менеджер|head of|керівник|руководител|lead|director|директор|начальник|coordinator|координатор|\bcto\b|\bcoo\b|chief|product owner|owner|architect|архітектор|scrum/i],
  ["production", /інженер|engineer|технолог/i],
];

export function roleOf(title: string): RoleKey {
  for (const [key, re] of ROLE_RULES) if (re.test(title)) return key;
  return "other";
}

// --------------------------------------------------------- военная ли

const STRONG_TITLE =
  /бпла|безпілот|\buav\b|\buas\b|fpv|дрон|drone|оборон|defen[cs]e\s*(tech|industry|sector)|military|miltech|mil-tech|військ|воєнн|\bзсу\b|збройн|\bреб\b|радіолокац|ракет|боєприпас|\bппо\b|electronic warfare|counter-?uav|\bc-?uas\b|ugv|наземн\w* робот/i;

const BODY_TERMS: RegExp[] = [
  /бпла|безпілот/i,
  /\buav\b|\buas\b/i,
  /fpv/i,
  /дрон|drone/i,
  /оборонн|defen[cs]e\s*(tech|industry|sector|forces)/i,
  /військов|military/i,
  /\bзсу\b|збройних сил|сил оборони/i,
  /\bреб\b|electronic warfare|радіоелектронн/i,
  /\bппо\b|радіолокац|ракет/i,
];

export function isMilitaryDirect(title: string, text: string): boolean {
  if (STRONG_TITLE.test(title)) return true;
  let hits = 0;
  const body = text.length > 6000 ? text.slice(0, 6000) : text;
  for (const re of BODY_TERMS) if (re.test(body) && ++hits >= 2) return true;
  return false;
}

const AGENCY = /everstar|recruit|рекрут|staffing|headhunt|кадров|hr[- ]?agency|talent\s*(partners|acquisition)|outsourc\w*\s*hr/i;

export function isAgency(name: string): boolean {
  return AGENCY.test(name);
}

export type MilitaryItem = { post: WebPost; reservation: boolean };

function employerKey(post: WebPost): string {
  return (post.author.userId || post.author.name || "").trim().toLowerCase();
}

/**
 * Выбирает военные вакансии из всех живых. `hasReservation` -- уже
 * посчитанный признак бронирования (чтобы не разбирать текст второй раз).
 */
export function pickMilitary(
  posts: WebPost[],
  hasReservation: (post: WebPost) => boolean,
): MilitaryItem[] {
  type Row = { post: WebPost; reservation: boolean; direct: boolean };
  const rows: Row[] = [];
  const perEmployer = new Map<string, { all: number; direct: number }>();

  for (const post of posts) {
    if (post.kind !== "hiring") continue;
    const reservation = hasReservation(post);
    const direct = reservation || isMilitaryDirect(post.title, post.contentText);
    const key = employerKey(post);
    if (key) {
      const e = perEmployer.get(key) ?? { all: 0, direct: 0 };
      e.all += 1;
      if (direct) e.direct += 1;
      perEmployer.set(key, e);
    }
    rows.push({ post, reservation, direct });
  }

  const defenseEmployers = new Set<string>();
  for (const [key, e] of perEmployer) {
    if (e.direct >= 3 && e.direct / e.all >= 0.5 && !isAgency(key)) defenseEmployers.add(key);
  }

  const out: MilitaryItem[] = [];
  for (const r of rows) {
    if (r.direct || defenseEmployers.has(employerKey(r.post))) {
      out.push({ post: r.post, reservation: r.reservation });
    }
  }
  return out;
}

// ------------------------------------------------------------ статистика

export type MilitaryStats = {
  total: number;
  withReservation: number;
  withoutReservation: number;
  employersCount: number;
  /** Доля вакансий, которую дают 30 крупнейших работодателей, %. */
  top30Share: number;
  /** Доля вакансий в Киеве от всех военных, %. */
  kyivShare: number;
  roles: { key: RoleKey; count: number; pct: number; examples: string[] }[];
  employers: { name: string; count: number; agency: boolean }[];
  cities: { name: string; count: number }[];
  noCity: number;
};

const KYIV = /^(kyiv|kiev|київ|киев)\b/i;

function cityName(post: WebPost): string {
  const raw = (post.location?.city || "").trim();
  if (!raw) return "";
  if (KYIV.test(raw)) return "Київ";
  return raw.replace(/,.*$/, "").trim();
}

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0;
}

export function buildMilitaryStats(items: MilitaryItem[]): MilitaryStats {
  const total = items.length;
  const withReservation = items.filter((i) => i.reservation).length;

  const byRole = new Map<RoleKey, { count: number; titles: Map<string, number> }>();
  const byEmployer = new Map<string, { name: string; count: number }>();
  const byCity = new Map<string, number>();
  let noCity = 0;

  for (const { post } of items) {
    const role = roleOf(post.title);
    const r = byRole.get(role) ?? { count: 0, titles: new Map() };
    r.count += 1;
    const t = post.title.trim().slice(0, 48);
    r.titles.set(t, (r.titles.get(t) ?? 0) + 1);
    byRole.set(role, r);

    const ek = employerKey(post);
    if (ek) {
      const e = byEmployer.get(ek) ?? { name: post.author.name, count: 0 };
      e.count += 1;
      byEmployer.set(ek, e);
    }

    const city = cityName(post);
    if (city) byCity.set(city, (byCity.get(city) ?? 0) + 1);
    else noCity += 1;
  }

  const roles = [...byRole.entries()]
    .filter(([key]) => key !== "other")
    .map(([key, v]) => ({
      key,
      count: v.count,
      pct: pct(v.count, total),
      examples: [...v.titles.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t),
    }))
    .sort((a, b) => b.count - a.count);

  const empSorted = [...byEmployer.values()].sort((a, b) => b.count - a.count);
  const top30 = empSorted.slice(0, 30).reduce((s, e) => s + e.count, 0);
  const citySorted = [...byCity.entries()].sort((a, b) => b[1] - a[1]);

  return {
    total,
    withReservation,
    withoutReservation: total - withReservation,
    employersCount: byEmployer.size,
    top30Share: pct(top30, total),
    kyivShare: pct(byCity.get("Київ") ?? 0, total),
    roles,
    employers: empSorted.slice(0, 8).map((e) => ({ name: e.name, count: e.count, agency: isAgency(e.name) })),
    cities: citySorted.slice(0, 5).map(([name, count]) => ({ name, count })),
    noCity,
  };
}
