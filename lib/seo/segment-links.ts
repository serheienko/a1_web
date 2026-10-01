// lib/seo/segment-links.ts
//
// 30.09.2026. Перелинковка между SEO-сегментами: с любой страницы робот
// идёт дальше, а человеку под рукой соседняя. Ссылки ведут ТОЛЬКО на
// живые сегменты (10+ вакансий) -- битых адресов не бывает.

import { countryByCode, countryName, flagEmoji } from "@/lib/seo/countries";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import { JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { cityLabel, levelLabel } from "@/lib/seo/segments";
import { citiesForTech, cityTechList, countrySegments, countriesForTech, globalLevelCounts, globalRoleCounts, listCities, remoteTechList } from "@/lib/a1/segment-index";
import type { SegmentLinkGroup } from "@/components/segment-page";
import { findArticle } from "@/lib/blog/articles";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { ROLE_LINKS_TITLE } from "@/lib/seo/role-texts";

const techLabel = (slug: string) => TECH_LANDINGS.find((t) => t.slug === slug)?.label ?? slug;

/** Блок ссылок для страницы страны и её сегментов. */
export async function linksForCountry(cc: string, opts?: { skip?: string }): Promise<SegmentLinkGroup[]> {
  const country = countryByCode(cc);
  if (!country) return [];
  const lc = cc.toLowerCase();
  const seg = await countrySegments(cc);
  const en = country.en;
  const href = (s: string) => `/jobs/country/${lc}/${s}`;

  const groups: SegmentLinkGroup[] = [];
  if (opts?.skip) {
    groups.push({
      title: { uk: `Усі вакансії: ${countryName(country, "uk")}`, en: `All jobs in ${en}`, ru: `Все вакансии: ${countryName(country, "ru")}`, de: `Alle Jobs: ${countryName(country, "de")}`, es: `Todas las vacantes: ${countryName(country, "es")}`, fr: `Toutes les offres : ${countryName(country, "fr")}`, pl: `Wszystkie oferty: ${countryName(country, "pl")}`, ptBR: `Todas as vagas: ${countryName(country, "ptBR")}`, zh: `${countryName(country, "zh")} 全部职位` },
      links: [{ href: `/jobs/country/${lc}`, label: `${flagEmoji(cc)} ${en}` }],
    });
  }
  groups.push(
    {
      title: { uk: "За технологією", en: "By technology", ru: "По технологии", de: "Nach Technologie", es: "Por tecnología", fr: "Par technologie", pl: "Wg technologii", ptBR: "Por tecnologia", zh: "按技术栈" },
      links: seg.stacks.filter((s) => href(s.slug) !== opts?.skip).map((s) => ({ href: href(s.slug), label: techLabel(s.slug) })),
    },
    {
      title: { uk: "За рівнем і форматом", en: "By level and format", ru: "По уровню и формату", de: "Nach Level und Format", es: "Por nivel y formato", fr: "Par niveau et format", pl: "Wg poziomu i formatu", ptBR: "Por nível e formato", zh: "按级别与方式" },
      links: [
        ...seg.levels.map((l) => ({ href: href(l.level), label: levelLabel(l.level) })),
        ...(seg.remote > 0 ? [{ href: href("remote"), label: "Remote" }] : []),
      ].filter((l) => l.href !== opts?.skip),
    },
    {
      title: { uk: "За містом", en: "By city", ru: "По городу", de: "Nach Stadt", es: "Por ciudad", fr: "Par ville", pl: "Wg miasta", ptBR: "Por cidade", zh: "按城市" },
      links: seg.cities.slice(0, 12).map((c) => ({ href: `/jobs/city/${c.slug}`, label: c.city })),
    },
  );
  return groups;
}

/** Блок для страницы города: соседи по стране и стране целиком. */
export async function linksForCity(cc: string, currentSlug: string): Promise<SegmentLinkGroup[]> {
  const country = countryByCode(cc);
  if (!country) return [];
  const all = await listCities();
  const others = all.filter((c) => c.cc === cc && c.slug !== currentSlug).slice(0, 12);
  const groups: SegmentLinkGroup[] = [];
  if (cc !== "UA") {
    groups.push({
      title: { uk: "Країна", en: "Country", ru: "Страна", de: "Land", es: "País", fr: "Pays", pl: "Kraj", ptBR: "País", zh: "国家" },
      links: [{ href: `/jobs/country/${cc.toLowerCase()}`, label: `${flagEmoji(cc)} ${country.en}` }],
    });
  }
  const techs = await cityTechList(currentSlug);
  if (techs.length > 0) {
    groups.push({
      title: { uk: "За технологією", en: "By technology", ru: "По технологии", de: "Nach Technologie", es: "Por tecnología", fr: "Par technologie", pl: "Wg technologii", ptBR: "Por tecnologia", zh: "按技术" },
      links: techs.slice(0, 16).map((t) => ({ href: `/jobs/city/${currentSlug}/${t.slug}`, label: techLabel(t.slug) })),
    });
  }
  groups.push({
    title: { uk: "Інші міста", en: "Other cities", ru: "Другие города", de: "Weitere Städte", es: "Otras ciudades", fr: "Autres villes", pl: "Inne miasta", ptBR: "Outras cidades", zh: "其他城市" },
    links: others.map((c) => ({ href: `/jobs/city/${c.slug}`, label: cc === "UA" ? cityLabel(c.city, "uk") : c.city })),
  });
  return groups;
}

/** Блок для страницы стека: удалённо + города (01.10.2026), потом страны. */
export async function linksForTech(techSlug: string): Promise<SegmentLinkGroup[]> {
  return [...(await techRemoteAndCities(techSlug)), ...(await linksForTechCountries(techSlug))];
}

async function techRemoteAndCities(techSlug: string): Promise<SegmentLinkGroup[]> {
  const groups: SegmentLinkGroup[] = [];
  const remote = (await remoteTechList()).some((x) => x.slug === techSlug);
  if (remote) {
    groups.push({
      title: { uk: "Формат", en: "Work format", ru: "Формат", de: "Arbeitsform", es: "Modalidad", fr: "Format", pl: "Forma pracy", ptBR: "Formato", zh: "工作方式" },
      links: [{ href: `/jobs/remote/${techSlug}`, label: `${techLabel(techSlug)} · remote` }],
    });
  }
  const cities = await citiesForTech(techSlug);
  if (cities.length > 0) {
    groups.push({
      title: { uk: "За містами", en: "By city", ru: "По городам", de: "Nach Stadt", es: "Por ciudad", fr: "Par ville", pl: "Wg miast", ptBR: "Por cidade", zh: "按城市" },
      links: cities.slice(0, 14).map((c) => ({ href: `/jobs/city/${c.slug}/${techSlug}`, label: c.cc === "UA" ? cityLabel(c.city, "uk") : c.city })),
    });
  }
  return groups;
}

/** Блок для страницы удалённой технологии: другие технологии удалённо и сама технология. */
export async function linksForRemoteTech(techSlug: string): Promise<SegmentLinkGroup[]> {
  const others = (await remoteTechList()).filter((x) => x.slug !== techSlug);
  const groups: SegmentLinkGroup[] = [
    {
      title: { uk: "Технологія", en: "Technology", ru: "Технология", de: "Technologie", es: "Tecnología", fr: "Technologie", pl: "Technologia", ptBR: "Tecnologia", zh: "技术" },
      links: [{ href: `/jobs/stack/${techSlug}`, label: `${techLabel(techSlug)} — all jobs` }],
    },
  ];
  if (others.length > 0) {
    groups.push({
      title: { uk: "Віддалено за технологією", en: "Remote by technology", ru: "Удалённо по технологии", de: "Remote nach Technologie", es: "Remoto por tecnología", fr: "Télétravail par technologie", pl: "Zdalnie wg technologii", ptBR: "Remoto por tecnologia", zh: "远程按技术" },
      links: others.slice(0, 16).map((x) => ({ href: `/jobs/remote/${x.slug}`, label: techLabel(x.slug) })),
    });
  }
  return [...groups, ...articleLinks(["viddalena-robota-na-inozemnu-kompaniyu"])];
}

/** Блок для страницы «город + технология»: город целиком и соседние технологии города. */
export async function linksForCityTech(citySlug: string, techSlug: string, cc: string): Promise<SegmentLinkGroup[]> {
  const city = (await listCities()).find((c) => c.slug === citySlug);
  const groups: SegmentLinkGroup[] = [];
  if (city) {
    groups.push({
      title: { uk: "Місто", en: "City", ru: "Город", de: "Stadt", es: "Ciudad", fr: "Ville", pl: "Miasto", ptBR: "Cidade", zh: "城市" },
      links: [{ href: `/jobs/city/${citySlug}`, label: `${flagEmoji(cc)} ${cc === "UA" ? cityLabel(city.city, "uk") : city.city}` }],
    });
  }
  const others = (await cityTechList(citySlug)).filter((x) => x.slug !== techSlug);
  if (others.length > 0) {
    groups.push({
      title: { uk: "Інші технології в місті", en: "Other technologies here", ru: "Другие технологии в городе", de: "Weitere Technologien", es: "Otras tecnologías", fr: "Autres technologies", pl: "Inne technologie", ptBR: "Outras tecnologias", zh: "其他技术" },
      links: others.slice(0, 14).map((x) => ({ href: `/jobs/city/${citySlug}/${x.slug}`, label: techLabel(x.slug) })),
    });
  }
  groups.push({
    title: { uk: "Технологія", en: "Technology", ru: "Технология", de: "Technologie", es: "Tecnología", fr: "Technologie", pl: "Technologia", ptBR: "Tecnologia", zh: "技术" },
    links: [{ href: `/jobs/stack/${techSlug}`, label: `${techLabel(techSlug)} — all jobs` }],
  });
  return groups;
}

/** Блок для страницы стека: эта технология по странам. */
async function linksForTechCountries(techSlug: string): Promise<SegmentLinkGroup[]> {
  const list = await countriesForTech(techSlug);
  const label = techLabel(techSlug);
  return [
    {
      title: { uk: `${label} за країною`, en: `${label} by country`, ru: `${label} по странам`, de: `${label} nach Land`, es: `${label} por país`, fr: `${label} par pays`, pl: `${label} wg kraju`, ptBR: `${label} por país`, zh: `${label} 按国家` },
      links: list.slice(0, 14).flatMap((x) => {
        const c = countryByCode(x.cc);
        return c ? [{ href: `/jobs/country/${x.cc}/${techSlug}`, label: `${flagEmoji(c.code)} ${c.en}` }] : [];
      }),
    },
  ];
}

/** Блок «за рівнем» для глобальных страниц уровня и для стека. */
export async function linksForGlobalLevels(current?: JobLevel): Promise<SegmentLinkGroup[]> {
  const counts = await globalLevelCounts();
  return [
    {
      title: { uk: "За рівнем", en: "By level", ru: "По уровню", de: "Nach Level", es: "Por nivel", fr: "Par niveau", pl: "Wg poziomu", ptBR: "Por nível", zh: "按级别" },
      links: JOB_LEVELS.filter((l) => l !== current && counts.some((c) => c.level === l)).map((l) => ({ href: `/jobs/level/${l}`, label: levelLabel(l) })),
    },
  ];
}

/** 01.10.2026. Блок «Корисні статті» внизу посадочных: ведёт в блог (/blog). */
export function articleLinks(slugs: string[]): SegmentLinkGroup[] {
  const links = slugs
    .map((slug) => findArticle(slug))
    .filter((a): a is NonNullable<ReturnType<typeof findArticle>> => !!a)
    .map((a) => ({ href: `/blog/${a.slug}`, label: a.h1 }));
  if (links.length === 0) return [];
  const title = { uk: "Корисні статті", en: "Useful articles", ru: "Полезные статьи", de: "Nützliche Artikel", es: "Artículos útiles", fr: "Articles utiles", pl: "Przydatne artykuły", ptBR: "Artigos úteis", zh: "实用文章" };
  return [{ title, links }];
}

/** Блок для /jobs/remote: удалённо по технологиям (01.10.2026). */
export async function linksForRemoteHub(): Promise<SegmentLinkGroup[]> {
  const list = await remoteTechList();
  if (list.length === 0) return [];
  return [
    {
      title: { uk: "Віддалено за технологією", en: "Remote by technology", ru: "Удалённо по технологии", de: "Remote nach Technologie", es: "Remoto por tecnología", fr: "Télétravail par technologie", pl: "Zdalnie wg technologii", ptBR: "Remoto por tecnologia", zh: "远程按技术" },
      links: list.map((x) => ({ href: `/jobs/remote/${x.slug}`, label: techLabel(x.slug) })),
    },
  ];
}

/** 01.10.2026. Блок «за професією»: ссылки между страницами /jobs/role/*. */
export async function linksForGlobalRoles(current?: JobRole): Promise<SegmentLinkGroup[]> {
  const counts = await globalRoleCounts();
  return [
    {
      title: ROLE_LINKS_TITLE,
      links: counts
        .filter((c) => c.role !== current)
        .map((c) => ({ href: `/jobs/role/${c.role}`, label: roleInfo(c.role)?.label ?? c.role })),
    },
  ];
}
