// components/localized-catalog.tsx -- каталог добірок на одному языке: /en/jobs/catalog,
// /de/jobs/catalog, /pl/jobs/catalog, /es/jobs/catalog (и /en, /de ... ведут сюда).
//
// 29.10.2026 (Александр: «под большие рынки -- Британия, Германия, США -- доделать SEO»).
// Языковые посадочные (роли, стеки, города, страны) уже есть, но на них не вёл ни один
// узел на том же языке, а хлебная крошка «Jobs» на каждой из них вела на /en -- 404. Эта
// страница и есть тот узел: робот с любой языковой посадочной попадает сюда и отсюда -- на
// все остальные посадочные того же языка. Ссылки только на живые сегменты (порог
// MIN_SEGMENT_POSTS), как в украинском /jobs/catalog.

import Link from "next/link";
import { SegmentLinks, type SegmentLinkGroup } from "@/components/segment-page";
import type { Locale } from "@/components/t";
import { LOCALE_TAG } from "@/components/t";
import {
  globalLevelCounts,
  globalRoleCounts,
  listCities,
  remoteTechList,
  segmentCountries,
} from "@/lib/a1/segment-index";
import { techCounts } from "@/lib/a1/tech-index";
import { salaryRoles } from "@/lib/a1/salary-index";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import { JOB_LANDINGS } from "@/lib/seo/job-landings";
import { ROLE_LABELS } from "@/lib/seo/role-labels";
import { cityLabel, levelLabel, MIN_SEGMENT_POSTS } from "@/lib/seo/segments";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import type { JobRole } from "@/lib/seo/job-role";

export type CatalogLocale = "en" | "de" | "pl" | "es";

type L4 = Record<CatalogLocale, string>;

export const CATALOG_TEXT: Record<
  "title" | "description" | "h1" | "lead" | "formats" | "salaries" | "roles" | "stacks" | "remoteStacks" | "levels" | "countries" | "cities",
  L4
> = {
  title: {
    en: "IT jobs catalog — roles, stacks, cities and countries | A1 Jobs",
    de: "IT-Jobs Katalog — Rollen, Technologien, Städte und Länder | A1 Jobs",
    pl: "Katalog ofert IT — stanowiska, technologie, miasta i kraje | A1 Jobs",
    es: "Catálogo de empleos IT — puestos, tecnologías, ciudades y países | A1 Jobs",
  },
  description: {
    en: "Every A1 job collection in one place: by role, technology, city, country, level and work format, plus salaries by role. Updated daily.",
    de: "Alle Job-Sammlungen von A1 an einem Ort: nach Rolle, Technologie, Stadt, Land, Level und Arbeitsform, dazu Gehälter nach Rolle. Täglich aktualisiert.",
    pl: "Wszystkie zbiory ofert A1 w jednym miejscu: wg stanowiska, technologii, miasta, kraju, poziomu i formy pracy oraz wynagrodzenia. Aktualizowane codziennie.",
    es: "Todas las colecciones de A1 en un lugar: por puesto, tecnología, ciudad, país, nivel y formato, además de salarios por puesto. Actualizado a diario.",
  },
  h1: { en: "IT jobs catalog", de: "IT-Jobs Katalog", pl: "Katalog ofert IT", es: "Catálogo de empleos IT" },
  lead: {
    en: "Every collection in one place: by role, technology, city, country, level and work format.",
    de: "Alle Sammlungen an einem Ort: nach Rolle, Technologie, Stadt, Land, Level und Arbeitsform.",
    pl: "Wszystkie zbiory w jednym miejscu: wg stanowiska, technologii, miasta, kraju, poziomu i formy pracy.",
    es: "Todas las colecciones en un lugar: por puesto, tecnología, ciudad, país, nivel y formato.",
  },
  formats: { en: "By work format", de: "Nach Arbeitsform", pl: "Wg formy pracy", es: "Por formato" },
  salaries: { en: "Salaries by role", de: "Gehälter nach Rolle", pl: "Wynagrodzenia wg stanowiska", es: "Salarios por puesto" },
  roles: { en: "By role", de: "Nach Rolle", pl: "Wg stanowiska", es: "Por puesto" },
  stacks: { en: "By technology", de: "Nach Technologie", pl: "Wg technologii", es: "Por tecnología" },
  remoteStacks: { en: "Remote by technology", de: "Remote nach Technologie", pl: "Zdalnie wg technologii", es: "Remoto por tecnología" },
  levels: { en: "By level", de: "Nach Level", pl: "Wg poziomu", es: "Por nivel" },
  countries: { en: "By country", de: "Nach Land", pl: "Wg kraju", es: "Por país" },
  cities: { en: "By city", de: "Nach Stadt", pl: "Wg miasta", es: "Por ciudad" },
};

/** Заголовок группы для SegmentLinks: в locale-режиме читается только нужный язык. */
function title(t: L4): Record<Locale, string> {
  return { uk: t.en, ru: t.en, en: t.en, de: t.de, pl: t.pl, es: t.es, fr: t.en, ptBR: t.en, zh: t.en };
}

/** Самые крупные рынки -- первыми: на них рассчитан этот узел (Британия, США, Германия). */
const PRIORITY_COUNTRIES = ["GB", "US", "DE", "PL", "ES", "NL", "CA", "FR", "IE", "CH", "AT", "SE"];

export async function LocalizedCatalog({ locale, salaryPages = true }: { locale: CatalogLocale; salaryPages?: boolean }) {
  const p = (path: string) => `/${locale}${path}`;
  const [roles, levels, cities, countries, remoteTech, techN, salary] = await Promise.all([
    globalRoleCounts(),
    globalLevelCounts(),
    listCities(),
    segmentCountries(),
    remoteTechList(),
    techCounts(),
    salaryPages ? salaryRoles() : Promise.resolve([] as { role: JobRole }[]),
  ]);
  const roleLabel = (r: JobRole) => ROLE_LABELS[r]?.[locale] ?? ROLE_LABELS[r]?.en ?? r;
  const sortedCountries = [...countries].sort((a, b) => {
    const ia = PRIORITY_COUNTRIES.indexOf(a.toUpperCase());
    const ib = PRIORITY_COUNTRIES.indexOf(b.toUpperCase());
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const groups: SegmentLinkGroup[] = [
    {
      title: title(CATALOG_TEXT.formats),
      links: JOB_LANDINGS.map((l) => ({ href: p(`/jobs/${l.slug}`), label: l.h1[locale] ?? l.h1.en })),
    },
    ...(salary.length
      ? [
          {
            title: title(CATALOG_TEXT.salaries),
            links: salary.map((r) => ({ href: p(`/jobs/salary/${r.role}`), label: roleLabel(r.role) })),
          },
        ]
      : []),
    {
      title: title(CATALOG_TEXT.countries),
      links: sortedCountries
        .map((cc) => {
          const country = countryByCode(cc);
          if (!country) return null;
          return { href: p(`/jobs/country/${cc.toLowerCase()}`), label: `${flagEmoji(cc)} ${countryName(country, locale)}` };
        })
        .filter((x): x is { href: string; label: string } => x !== null),
    },
    {
      title: title(CATALOG_TEXT.roles),
      links: roles.map((r) => ({ href: p(`/jobs/role/${r.role}`), label: roleLabel(r.role) })),
    },
    {
      title: title(CATALOG_TEXT.stacks),
      links: TECH_LANDINGS.filter((t) => (techN.get(t.tech) ?? 0) >= MIN_SEGMENT_POSTS).map((t) => ({
        href: p(`/jobs/stack/${t.slug}`),
        label: t.label,
      })),
    },
    {
      title: title(CATALOG_TEXT.remoteStacks),
      links: remoteTech.map((t) => ({
        href: p(`/jobs/remote/${t.slug}`),
        label: TECH_LANDINGS.find((x) => x.slug === t.slug)?.label ?? t.slug,
      })),
    },
    {
      title: title(CATALOG_TEXT.levels),
      links: levels.map((l) => ({ href: p(`/jobs/level/${l.level}`), label: levelLabel(l.level) })),
    },
    {
      title: title(CATALOG_TEXT.cities),
      links: cities.map((c) => ({ href: p(`/jobs/city/${c.slug}`), label: cityLabel(c.city, "en") })),
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16" lang={LOCALE_TAG[locale]}>
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{CATALOG_TEXT.h1[locale]}</h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">{CATALOG_TEXT.lead[locale]}</p>
      <Link
        href={p("/jobs/remote")}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/15"
      >
        {JOB_LANDINGS.find((l) => l.slug === "remote")?.h1[locale] ?? "Remote"} →
      </Link>
      <SegmentLinks groups={groups} locale={locale} />
    </main>
  );
}
