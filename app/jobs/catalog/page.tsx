export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/catalog/page.tsx -- «Каталог вакансій»: все живые витрины в одном
// месте.
//
// 10.10.2026 (Александр: «а где можно увидеть витрины?»). Посадочных стало
// больше трёх тысяч, и на них не вело НИ ОДНОЙ ссылки с главной или из меню:
// попасть можно было только из поиска или со страницы вакансии. Это плохо
// дважды. Человеку -- он не знает, что у нас есть страница «вакансії SAP».
// Роботу -- в Search Console полторы тысячи наших страниц числятся
// «обнаружена, но не проиндексирована» ровно потому, что внутри сайта на них
// никто не ссылается.
//
// Страница нарочно простая: это узел, из которого ведут ссылки, а не витрина
// сама по себе. Показываем только живые сегменты -- те, что прошли порог
// MIN_SEGMENT_POSTS, то есть битых адресов здесь не бывает.

import type { Metadata } from "next";
import { SegmentLinks, type SegmentLinkGroup } from "@/components/segment-page";
import { T } from "@/components/t";
import {
  globalLevelCounts,
  globalRoleCounts,
  listCities,
  remoteTechList,
  segmentCountries,
} from "@/lib/a1/segment-index";
import { techCounts } from "@/lib/a1/tech-index";
import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import { FACT_LANDINGS } from "@/lib/seo/fact-landings";
import { JOB_LANDINGS } from "@/lib/seo/job-landings";
import { roleInfo } from "@/lib/seo/job-role";
import { cityLabel, levelLabel, MIN_SEGMENT_POSTS } from "@/lib/seo/segments";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";

const SITE_URL = "https://jobs.a1appp.com";

const TITLE = "Каталог вакансій — усі напрями, стеки, міста та країни | A1 Jobs";
const DESCRIPTION =
  "Усі добірки вакансій A1 в одному місці: за професією, за технологією, за містом, за країною, за рівнем і за форматом роботи. Оновлюється щодня.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/jobs/catalog` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/jobs/catalog`, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function Page() {
  const [roles, levels, cities, countries, remoteTech, techN] = await Promise.all([
    globalRoleCounts(),
    globalLevelCounts(),
    listCities(),
    segmentCountries(),
    remoteTechList(),
    techCounts(),
  ]);

  const groups: SegmentLinkGroup[] = [
    {
      title: { uk: "За форматом роботи", en: "By work format", ru: "По формату работы", de: "Nach Arbeitsform", es: "Por formato", fr: "Par format", pl: "Wg formy pracy", ptBR: "Por formato", zh: "按工作形式" },
      links: JOB_LANDINGS.map((l) => ({ href: `/jobs/${l.slug}`, label: l.h1.uk })),
    },
    {
      title: { uk: "За професією", en: "By role", ru: "По профессии", de: "Nach Rolle", es: "Por puesto", fr: "Par métier", pl: "Wg stanowiska", ptBR: "Por função", zh: "按职位" },
      links: roles.map((r) => ({ href: `/jobs/role/${r.role}`, label: roleInfo(r.role)?.label ?? r.role })),
    },
    {
      title: { uk: "За технологією", en: "By technology", ru: "По технологии", de: "Nach Technologie", es: "Por tecnología", fr: "Par technologie", pl: "Wg technologii", ptBR: "Por tecnologia", zh: "按技术" },
      links: TECH_LANDINGS.filter((t) => (techN.get(t.tech) ?? 0) >= MIN_SEGMENT_POSTS).map((t) => ({
        href: `/jobs/stack/${t.slug}`,
        label: t.label,
      })),
    },
    {
      title: { uk: "Віддалено за технологією", en: "Remote by technology", ru: "Удалённо по технологии", de: "Remote nach Technologie", es: "Remoto por tecnología", fr: "Télétravail par technologie", pl: "Zdalnie wg technologii", ptBR: "Remoto por tecnologia", zh: "远程按技术" },
      links: remoteTech.map((t) => ({
        href: `/jobs/remote/${t.slug}`,
        label: TECH_LANDINGS.find((x) => x.slug === t.slug)?.label ?? t.slug,
      })),
    },
    {
      title: { uk: "За рівнем", en: "By level", ru: "По уровню", de: "Nach Level", es: "Por nivel", fr: "Par niveau", pl: "Wg poziomu", ptBR: "Por nível", zh: "按级别" },
      links: levels.map((l) => ({ href: `/jobs/level/${l.level}`, label: levelLabel(l.level) })),
    },
    {
      title: { uk: "За країною", en: "By country", ru: "По стране", de: "Nach Land", es: "Por país", fr: "Par pays", pl: "Wg kraju", ptBR: "Por país", zh: "按国家" },
      links: countries
        .map((cc) => {
          const country = countryByCode(cc);
          if (!country) return null;
          return { href: `/jobs/country/${cc.toLowerCase()}`, label: `${flagEmoji(cc)} ${countryName(country, "uk")}` };
        })
        .filter((x): x is { href: string; label: string } => x !== null),
    },
    {
      title: { uk: "За містом", en: "By city", ru: "По городу", de: "Nach Stadt", es: "Por ciudad", fr: "Par ville", pl: "Wg miasta", ptBR: "Por cidade", zh: "按城市" },
      links: cities.map((c) => ({ href: `/jobs/city/${c.slug}`, label: cityLabel(c.city, "uk") })),
    },
    {
      title: { uk: "Окремі добірки", en: "Other collections", ru: "Отдельные подборки", de: "Weitere Sammlungen", es: "Otras colecciones", fr: "Autres sélections", pl: "Inne zbiory", ptBR: "Outras coleções", zh: "其他合集" },
      links: [
        ...FACT_LANDINGS.map((l) => ({ href: `/jobs/tag/${l.slug}`, label: l.chip.uk })),
        { href: "/jobs/top-100", label: "Топ-100 компаній світу" },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        <T uk="Каталог вакансій" en="Job catalog" ru="Каталог вакансий" de="Job-Katalog" es="Catálogo de empleos" fr="Catalogue des offres" pl="Katalog ofert" ptBR="Catálogo de vagas" zh="职位目录" />
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        <T
          uk="Усі добірки вакансій в одному місці: за професією, технологією, містом, країною, рівнем і форматом роботи."
          en="Every collection in one place: by role, technology, city, country, level and work format."
          ru="Все подборки вакансий в одном месте: по профессии, технологии, городу, стране, уровню и формату работы."
          de="Alle Sammlungen an einem Ort: nach Rolle, Technologie, Stadt, Land, Level und Arbeitsform."
          es="Todas las colecciones en un lugar: por puesto, tecnología, ciudad, país, nivel y formato."
          fr="Toutes les sélections au même endroit : métier, technologie, ville, pays, niveau et format."
          pl="Wszystkie zbiory w jednym miejscu: wg stanowiska, technologii, miasta, kraju, poziomu i formy pracy."
          ptBR="Todas as coleções em um só lugar: por função, tecnologia, cidade, país, nível e formato."
          zh="所有职位合集集中在一处：按职位、技术、城市、国家、级别和工作形式。"
        />
      </p>
      <SegmentLinks groups={groups} />
    </main>
  );
}
