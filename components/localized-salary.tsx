// components/localized-salary.tsx -- зарплатные страницы на языках: /en/jobs/salary/<role>,
// /en/jobs/salary/<role>/<country> и хаб /en/jobs/salary (то же для de, pl, es).
//
// 29.10.2026 (Александр: «под Британию, Германию, США доделать SEO»). Украинские зарплатные
// страницы есть с 22.10, а запросы, за которыми к нам может прийти Британия / США / Германия,
// звучат именно так: «software engineer salary uk», «Gehalt Backend Entwickler Deutschland».
// Числа и отбор те же самые (lib/a1/salary-index.ts) -- меняется только язык каркаса. Порог
// честности тот же: нет медианы -- страница страны отдаётся с noindex и плашкой, роли без
// данных -- 404.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SegmentPage, type SegmentLinkGroup } from "@/components/segment-page";
import { SalarySummary } from "@/components/salary-summary";
import { LOCALE_TAG, type Locale } from "@/components/t";
import { formatSalary } from "@/lib/format";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import {
  salaryCountriesForRole,
  salaryForRole,
  salaryForRoleCountry,
  salaryPostsForRoleCountry,
  salaryRoles,
} from "@/lib/a1/salary-index";
import { JOB_ROLES, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import { countryByCode, countryName, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE, type Country } from "@/lib/seo/countries";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";

export type SalaryLocale = "en" | "de" | "pl" | "es";

type L = Record<Locale, string>;

/** Девятиязычная запись из четырёх живых языков (остальные -- английский; на этих страницах не читаются). */
function nine(en: string, de: string, pl: string, es: string): L {
  return { uk: en, ru: en, en, de, pl, es, fr: en, ptBR: en, zh: en };
}

const MONTHS: Record<SalaryLocale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  pl: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"],
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
};

function monthNow(loc: SalaryLocale): string {
  const d = new Date();
  return `${MONTHS[loc][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function role(slug: string): JobRole | null {
  return (JOB_ROLES as string[]).includes(slug) ? (slug as JobRole) : null;
}

function label(r: JobRole, loc: SalaryLocale): string {
  return ROLE_LABELS[r]?.[loc] ?? ROLE_LABELS[r]?.en ?? r;
}

// ───────────────────────── тексты ─────────────────────────

function h1(r: JobRole, c?: Country): L {
  const n = (loc: SalaryLocale) => label(r, loc);
  if (!c) return nine(`${n("en")} salaries`, `Gehälter: ${n("de")}`, `Wynagrodzenia: ${n("pl")}`, `Salarios: ${n("es")}`);
  return nine(
    `${n("en")} salaries in ${countryName(c, "en")}`,
    `Gehälter: ${n("de")} in ${countryName(c, "de")}`,
    `Wynagrodzenia: ${n("pl")}, ${countryName(c, "pl")}`,
    `Salarios de ${n("es")} en ${countryName(c, "es")}`,
  );
}

function countLine(): L {
  return nine(
    "based on {n} jobs with a stated salary",
    "auf Basis von {n} Stellen mit genanntem Gehalt",
    "na podstawie {n} ofert z podaną kwotą",
    "según {n} vacantes con salario indicado",
  );
}

function lead(r: JobRole, c?: Country): L {
  const where = (loc: SalaryLocale, pre: string) => (c ? `${pre}${countryName(c, loc)}` : "");
  const mix = !c;
  return nine(
    `What ${label(r, "en")} roles pay${where("en", " in ")}.${mix ? " This is all countries at once, so the figure is mixed — the same role by country is right below." : ""} Counted only from jobs where the company stated the figure itself — all of them are listed below. Updated daily.`,
    `Was ${label(r, "de")}-Stellen${where("de", " in ")} zahlen.${mix ? " Das sind alle Länder zusammen, die Zahl ist also gemischt — dieselbe Rolle nach Land steht direkt darunter." : ""} Gezählt werden nur Stellen, bei denen das Unternehmen den Betrag selbst genannt hat — sie stehen alle unten. Täglich aktualisiert.`,
    `Ile płacą na stanowiskach ${label(r, "pl")}${c ? ` — ${countryName(c, "pl")}` : ""}.${mix ? " To wszystkie kraje naraz, więc liczba jest mieszana — to samo stanowisko wg kraju jest tuż poniżej." : ""} Liczymy tylko oferty, w których firma sama podała kwotę — wszystkie są poniżej. Aktualizowane codziennie.`,
    `Cuánto se paga en puestos de ${label(r, "es")}${where("es", " en ")}.${mix ? " Son todos los países a la vez, así que la cifra es mixta: el mismo puesto por país está justo debajo." : ""} Solo contamos vacantes en las que la empresa indicó la cifra: todas están abajo. Actualizado a diario.`,
  );
}

function thinText(r: JobRole, c: Country, n: number): L {
  return nine(
    `Not enough ${label(r, "en")} jobs with a stated salary in ${countryName(c, "en")} for an honest median yet (${n} so far). Here are the ones we have.`,
    `Für einen ehrlichen Median gibt es in ${countryName(c, "de")} noch zu wenige ${label(r, "de")}-Stellen mit genanntem Gehalt (bisher ${n}). Hier sind die vorhandenen.`,
    `W kraju ${countryName(c, "pl")} jest jeszcze za mało ofert ${label(r, "pl")} z podaną kwotą, by uczciwie policzyć medianę (na razie ${n}). Oto te, które mamy.`,
    `Aún no hay suficientes vacantes de ${label(r, "es")} con salario indicado en ${countryName(c, "es")} para una mediana honesta (por ahora ${n}). Estas son las que tenemos.`,
  );
}

const T_ALL_ROLES: L = nine("All salaries by role", "Alle Gehälter nach Rolle", "Wszystkie wynagrodzenia", "Todos los salarios");
const T_JOBS_HERE: L = nine("Open jobs for this role", "Offene Stellen in dieser Rolle", "Oferty na tym stanowisku", "Vacantes de este puesto");
const T_OTHER_ROLES: L = nine("Salaries by role", "Gehälter nach Rolle", "Wynagrodzenia wg stanowiska", "Salarios por puesto");
const T_OTHER_COUNTRIES: L = nine("Same role in other countries", "Dieselbe Rolle in anderen Ländern", "To samo stanowisko w innych krajach", "El mismo puesto en otros países");

function meta(loc: SalaryLocale, r: JobRole, c?: Country, median?: string): { title: string; description: string } {
  const n = label(r, loc);
  const place = c ? countryName(c, loc) : "";
  const m = monthNow(loc);
  switch (loc) {
    case "de":
      return {
        title: c ? (median ? `Gehalt ${n} in ${place}: ${median} Median | A1 Jobs` : `Gehalt ${n} in ${place} — Median und Spanne · ${m} | A1 Jobs`) : `Gehalt ${n} — Median und Spanne · ${m} | A1 Jobs`,
        description: `Was ${n}-Stellen${c ? ` in ${place}` : ""} zahlen: Spanne, Median und alle Stellen mit genanntem Gehalt. Täglich aktualisiert.`,
      };
    case "pl":
      return {
        title: c ? (median ? `Zarobki ${n}: ${place} — mediana ${median} | A1 Jobs` : `Zarobki ${n}: ${place} — mediana i widełki · ${m} | A1 Jobs`) : `Zarobki ${n} — mediana i widełki · ${m} | A1 Jobs`,
        description: `Ile płacą na stanowiskach ${n}${c ? ` — ${place}` : ""}: widełki, mediana i wszystkie oferty z podaną kwotą. Aktualizowane codziennie.`,
      };
    case "es":
      return {
        title: c ? (median ? `Salario ${n} en ${place}: mediana ${median} | A1 Jobs` : `Salario ${n} en ${place} — mediana y rango · ${m} | A1 Jobs`) : `Salario ${n} — mediana y rango · ${m} | A1 Jobs`,
        description: `Cuánto se paga en puestos de ${n}${c ? ` en ${place}` : ""}: rango, mediana y todas las vacantes con salario indicado. Actualizado a diario.`,
      };
    default:
      return {
        title: c ? (median ? `${n} salary in ${place}: ${median} median | A1 Jobs` : `${n} salary in ${place} — median and range · ${m} | A1 Jobs`) : `${n} salary — median and range · ${m} | A1 Jobs`,
        description: `What ${n} roles pay${c ? ` in ${place}` : ""}: typical range, median and every job with a stated salary. Updated daily.`,
      };
  }
}

/** Страны, где зарплату называют в месяц; остальные -- в год. */
const MONTHLY_COUNTRIES = new Set(["UA", "PL", "CZ", "SK", "RO", "BG", "HU", "LT", "LV", "EE", "MD", "GE", "AM", "AZ", "KZ", "RS", "HR", "SI", "BA", "ME", "MK", "AL", "TR", "BR", "AR", "MX", "IN", "PH", "VN"]);

/** Слишком длинный title с медианой -- без неё (Google режет на ~60 символах). */
function fit(title: string, fallback: string): string {
  return title.length <= 70 ? title : fallback;
}

// ───────────────────────── роль ─────────────────────────

type RoleParams = { params: Promise<{ role: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };
type CountryParams = { params: Promise<{ role: string; country: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function salaryRoleMetadata(loc: SalaryLocale, { params, searchParams }: RoleParams): Promise<Metadata> {
  const r = role((await params).role);
  if (!r || !(await salaryForRole(r))) return {};
  const m = meta(loc, r);
  const path = `/jobs/salary/${r}`;
  const url = `${SITE_URL}/${loc}${path}`;
  return pagedMeta(
    {
      title: m.title,
      description: m.description,
      alternates: { canonical: url, languages: altLanguages(path) },
      openGraph: { title: m.title, description: m.description, url, type: "website" },
      twitter: { card: "summary_large_image", title: m.title, description: m.description },
    },
    url,
    pageOf(await searchParams),
  );
}

async function roleGroups(loc: SalaryLocale, r: JobRole, extra: SegmentLinkGroup[] = []): Promise<SegmentLinkGroup[]> {
  const all = await salaryRoles();
  return [
    ...extra,
    {
      title: T_JOBS_HERE,
      links: [{ href: `/${loc}/jobs/role/${r}`, label: label(r, loc) }],
    },
    {
      title: T_OTHER_ROLES,
      links: all.filter((x) => x.role !== r).map((x) => ({ href: `/${loc}/jobs/salary/${x.role}`, label: label(x.role, loc) })),
    },
  ];
}

export async function LocalizedSalaryRole({ loc, params, searchParams }: RoleParams & { loc: SalaryLocale }) {
  const r = role((await params).role);
  if (!r) notFound();
  const segment = await salaryForRole(r);
  if (!segment) notFound();
  const countries = await salaryCountriesForRole(r);
  const head = h1(r);
  return (
    <SegmentPage
      locale={loc}
      page={pageOf(await searchParams)}
      h1={head}
      countLine={countLine()}
      lead={lead(r)}
      posts={segment.posts}
      beforeList={<SalarySummary stats={segment.stats} role={r} countries={countries} locale={loc} />}
      breadcrumbName={head[loc]}
      path={`/${loc}/jobs/salary/${r}`}
      groups={await roleGroups(loc, r)}
    />
  );
}

// ───────────────────────── роль + страна ─────────────────────────

async function resolveCountry(loc: SalaryLocale, roleSlug: string, cc: string) {
  const r = role(roleSlug);
  const c = countryByCode(cc);
  if (!r || !c) return null;
  if (c.code === WORLDWIDE_CODE) permanentRedirect(`/${loc}/jobs/salary/${r}`);
  if (cc !== cc.toLowerCase()) permanentRedirect(`/${loc}/jobs/salary/${r}/${c.code.toLowerCase()}`);
  return { r, c };
}

export async function salaryCountryMetadata(loc: SalaryLocale, { params, searchParams }: CountryParams): Promise<Metadata> {
  const { role: rs, country: cc } = await params;
  const x = await resolveCountry(loc, rs, cc);
  if (!x) return {};
  const segment = await salaryForRoleCountry(x.r, cc);
  // В заголовке -- в той форме, в какой о зарплате думают в стране: в Британии, США, Германии
  // и т. п. -- годовая, в Польше, Украине и соседях -- месячная (страница ниже -- всегда в месяц).
  const yearly = segment ? !MONTHLY_COUNTRIES.has(x.c.code.toUpperCase()) : false;
  const median = segment
    ? formatSalary(
        {
          min: Math.round(segment.stats.median * (yearly ? 12 : 1) / (yearly ? 500 : 1)) * (yearly ? 500 : 1),
          max: Math.round(segment.stats.median * (yearly ? 12 : 1) / (yearly ? 500 : 1)) * (yearly ? 500 : 1),
          currency: segment.stats.currency,
          period: yearly ? "YEAR" : "MONTH",
        },
        loc,
      )
    : undefined;
  const plain = meta(loc, x.r, x.c);
  const withMedian = meta(loc, x.r, x.c, median);
  const title = fit(withMedian.title, plain.title);
  const path = `/jobs/salary/${x.r}/${cc.toLowerCase()}`;
  const url = `${SITE_URL}/${loc}${path}`;
  return pagedMeta(
    {
      title,
      description: plain.description,
      alternates: { canonical: url, languages: altLanguages(path) },
      openGraph: { title, description: plain.description, url, type: "website" },
      twitter: { card: "summary_large_image", title, description: plain.description },
      ...(segment ? {} : { robots: { index: false, follow: true } }),
    },
    url,
    pageOf(await searchParams),
  );
}

export async function LocalizedSalaryCountry({ loc, params, searchParams }: CountryParams & { loc: SalaryLocale }) {
  const { role: rs, country: cc } = await params;
  const x = await resolveCountry(loc, rs, cc);
  if (!x) notFound();
  const { r, c } = x;
  const lc = c.code.toLowerCase();
  const head = h1(r, c);
  const page = pageOf(await searchParams);
  const segment = await salaryForRoleCountry(r, cc);
  const jobsHref = c.code === DEFAULT_COUNTRY_CODE ? `/${loc}/jobs/role/${r}` : `/${loc}/jobs/role/${r}/${lc}`;
  const others = (await salaryCountriesForRole(r)).filter((o) => o.cc.toUpperCase() !== c.code.toUpperCase());
  const otherGroup: SegmentLinkGroup[] = others.length
    ? [
        {
          title: T_OTHER_COUNTRIES,
          links: others.map((o) => {
            const oc = countryByCode(o.cc);
            return { href: `/${loc}/jobs/salary/${r}/${o.cc.toLowerCase()}`, label: oc ? countryName(oc, loc) : o.cc.toUpperCase() };
          }),
        },
      ]
    : [];
  if (!segment) {
    const posts = await salaryPostsForRoleCountry(r, cc);
    return (
      <SegmentPage
        locale={loc}
        page={page}
        h1={head}
        countLine={countLine()}
        lead={lead(r, c)}
        posts={posts}
        beforeList={
          <div className="mb-6 rounded-2xl border border-neutral-200 px-4 py-3 text-[14px] text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
            {thinText(r, c, posts.length)[loc]}{" "}
            <Link href={`/${loc}/jobs/salary/${r}`} className="text-accent">{T_ALL_ROLES[loc]}</Link>
            {" · "}
            <Link href={jobsHref} className="text-accent">{T_JOBS_HERE[loc]}</Link>
          </div>
        }
        breadcrumbName={head[loc]}
        path={`/${loc}/jobs/salary/${r}/${lc}`}
        groups={await roleGroups(loc, r, otherGroup)}
      />
    );
  }
  return (
    <SegmentPage
      locale={loc}
      page={page}
      h1={head}
      countLine={countLine()}
      lead={lead(r, c)}
      posts={segment.posts}
      beforeList={<SalarySummary stats={segment.stats} role={r} countries={others} locale={loc} />}
      breadcrumbName={head[loc]}
      path={`/${loc}/jobs/salary/${r}/${lc}`}
      groups={await roleGroups(loc, r, [{ title: T_JOBS_HERE, links: [{ href: jobsHref, label: `${label(r, loc)} · ${countryName(c, loc)}` }] }])}
    />
  );
}

// ───────────────────────── хаб ─────────────────────────

const HUB: Record<"title" | "description" | "h1" | "lead", Record<SalaryLocale, string>> = {
  title: {
    en: "IT salaries by role — median and typical range | A1 Jobs",
    de: "IT-Gehälter nach Rolle — Median und Spanne | A1 Jobs",
    pl: "Zarobki w IT wg stanowiska — mediana i widełki | A1 Jobs",
    es: "Salarios IT por puesto — mediana y rango | A1 Jobs",
  },
  description: {
    en: "What tech roles pay, counted only from jobs where the company stated the salary itself. By role and by country. Updated daily.",
    de: "Was IT-Rollen zahlen — nur aus Stellen, in denen das Unternehmen das Gehalt selbst nennt. Nach Rolle und Land. Täglich aktualisiert.",
    pl: "Ile płacą w IT — tylko z ofert, w których firma sama podała kwotę. Wg stanowiska i kraju. Aktualizowane codziennie.",
    es: "Cuánto pagan los puestos IT, solo de vacantes donde la empresa indicó el salario. Por puesto y por país. Actualizado a diario.",
  },
  h1: { en: "IT salaries", de: "IT-Gehälter", pl: "Zarobki w IT", es: "Salarios IT" },
  lead: {
    en: "What roles pay, counted from jobs where the company stated the figure itself. These are world-wide figures, often skewed by the richest market (usually the US) — open a role for the breakdown by country.",
    de: "Was Rollen zahlen — gezählt aus Stellen mit vom Unternehmen genanntem Betrag. Weltweite Zahlen, oft vom reichsten Markt (meist USA) geprägt — die Aufteilung nach Land steht auf der Seite jeder Rolle.",
    pl: "Ile płacą stanowiska — liczone z ofert, w których firma sama podała kwotę. To liczby światowe, często zawyżane przez najbogatszy rynek (zwykle USA) — podział na kraje jest na stronie każdego stanowiska.",
    es: "Cuánto pagan los puestos, contado de vacantes donde la empresa indicó la cifra. Son cifras mundiales, a menudo sesgadas por el mercado más rico (normalmente EE. UU.): abre un puesto para ver el desglose por país.",
  },
};

export function salaryHubMetadata(loc: SalaryLocale): Metadata {
  const path = "/jobs/salary";
  const url = `${SITE_URL}/${loc}${path}`;
  return {
    title: HUB.title[loc],
    description: HUB.description[loc],
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title: HUB.title[loc], description: HUB.description[loc], url, type: "website" },
  };
}

const MEDIAN_WORD: Record<SalaryLocale, string> = { en: "median", de: "Median", pl: "mediana", es: "mediana" };

export async function LocalizedSalaryHub({ loc }: { loc: SalaryLocale }) {
  const roles = await salaryRoles();
  const url = `${SITE_URL}/${loc}/jobs/salary`;
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-16 pb-fab-safe" lang={LOCALE_TAG[loc]}>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd(HUB.h1[loc], url)) }} />
      <nav aria-label="breadcrumb" className="mb-4 text-[13px] text-neutral-400 dark:text-neutral-500">
        <Link href={`/${loc}/jobs/catalog`} className="transition hover:text-accent">
          {{ en: "Jobs", de: "Stellen", pl: "Oferty", es: "Vacantes" }[loc]}
        </Link>
        <span aria-hidden="true" className="px-1.5">/</span>
      </nav>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">{HUB.h1[loc]}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">{HUB.lead[loc]}</p>
      </header>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {roles.map((x) => (
          <li key={x.role}>
            <Link href={`/${loc}/jobs/salary/${x.role}`} className="flex items-baseline justify-between gap-3 py-3 transition hover:text-accent">
              <span className="font-medium">{label(x.role, loc)}</span>
              <span className="text-[13px] text-neutral-500 tabular-nums dark:text-neutral-400">
                {MEDIAN_WORD[loc]}{" "}
                {formatSalary({ min: x.stats.median, max: x.stats.median, currency: x.stats.currency, period: "MONTH" }, loc)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
