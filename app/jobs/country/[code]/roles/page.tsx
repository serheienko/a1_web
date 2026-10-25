export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/country/[code]/roles/page.tsx -- «Вакансії за професією» в одной
// стране (25.10.2026).
//
// Александр: «если я на странице профессий меняю сверху гео -- показывать
// страницу по ролям именно этой страны (и так же с зарплатами); по всем
// странам из списка. Если данных мало -- так и писать». Украина и «Весь
// світ» -- это общий указатель /jobs/role (Украина + удалённые), туда и
// уводим. В индекс -- только страны, где есть хоть одна профессия со своей
// страницей (10+ вакансий); остальные открыты людям, но noindex.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { T } from "@/components/t";
import { RegionNotice } from "@/components/region-notice";
import { orderedRoles, RoleHubGrid } from "@/components/role-hub";
import { countryRoleCounts, countryRoleCountsAll } from "@/lib/a1/segment-index";
import { salaryCountriesForRole } from "@/lib/a1/salary-index";
import { countryByCode, countryName, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE } from "@/lib/seo/countries";
import { roleInfo, type JobRole } from "@/lib/seo/job-role";
import { buildLandingBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { countryRolesEmpty, countryRolesH1, countryRolesLead, LINK_ALL_ROLES } from "@/lib/seo/region-texts";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ code: string }> };

function resolve(code: string) {
  const country = countryByCode(code);
  if (!country) return null;
  return country;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const country = resolve(code);
  if (!country || country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) return {};
  const url = `${SITE_URL}/jobs/country/${country.code.toLowerCase()}/roles`;
  const name = countryName(country, "uk");
  const title = `Вакансії за професією: ${name}. QA, DevOps, розробка, дизайн, PM | A1 Jobs`;
  const description = `Професії з відкритими вакансіями в країні ${name}: розробка, QA, DevOps, дані, дизайн, менеджмент, маркетинг, продажі. Число вакансій і зарплати, оновлюється щодня.`;
  const indexable = (await countryRoleCounts(country.code)).length > 0;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function Page({ params }: Props) {
  const { code } = await params;
  const country = resolve(code);
  if (!country) notFound();
  if (country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) permanentRedirect("/jobs/role");
  if (code !== code.toLowerCase()) permanentRedirect(`/jobs/country/${country.code.toLowerCase()}/roles`);

  const lc = country.code.toLowerCase();
  const counts = await countryRoleCountsAll(country.code);
  const byRole = new Map<JobRole, number>(counts.map((c) => [c.role, c.count]));
  const roles = orderedRoles(byRole);

  // Зарплатная ссылка -- только где у страны хватает данных на вилку.
  const salaryLists = await Promise.all(roles.map((r) => salaryCountriesForRole(r).catch(() => [])));
  const withSalary = new Set(roles.filter((_, i) => (salaryLists[i] ?? []).some((s) => s.cc === lc)));

  const pageUrl = `${SITE_URL}/jobs/country/${lc}/roles`;
  const h1 = countryRolesH1(country);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: h1.uk,
    itemListElement: roles.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: roleInfo(r)?.uk ?? r,
      url: `${SITE_URL}/jobs/role/${r}/${lc}`,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pb-fab-safe sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLandingBreadcrumbJsonLd(h1.uk, pageUrl)) }} />
      {roles.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} /> : null}
      <nav className="mb-4 text-[13px] text-neutral-500 dark:text-neutral-400">
        <Link href="/" className="hover:text-accent"><T uk="Вакансії" en="Jobs" ru="Вакансии" de="Jobs" es="Vacantes" fr="Offres" pl="Oferty" ptBR="Vagas" zh="职位" /></Link>
        <span className="mx-1.5">/</span>
        <Link href={`/jobs/country/${lc}`} className="hover:text-accent">{countryName(country, "uk")}</Link>
        <span className="mx-1.5">/</span>
        <Link href="/jobs/role" className="hover:text-accent"><T {...LINK_ALL_ROLES} /></Link>
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-50">
        <T {...h1} />
      </h1>
      {roles.length > 0 ? (
        <>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300">
            <T {...countryRolesLead(country, roles.length)} />
          </p>
          <RoleHubGrid
            counts={byRole}
            roleHref={(r) => `/jobs/role/${r}/${lc}`}
            salaryHref={(r) => (withSalary.has(r) ? `/jobs/salary/${r}/${lc}` : null)}
          />
        </>
      ) : (
        <RegionNotice
          text={countryRolesEmpty(country)}
          links={[
            { href: "/jobs/role", label: LINK_ALL_ROLES },
            { href: `/jobs/country/${lc}`, label: { uk: `Усі вакансії: ${country.uk}`, en: `All jobs: ${country.en}`, ru: `Все вакансии: ${country.ru}`, de: `Alle Jobs: ${country.en}`, es: `Todas las vacantes: ${country.en}`, fr: `Toutes les offres : ${country.en}`, pl: `Wszystkie oferty: ${country.en}`, ptBR: `Todas as vagas: ${country.en}`, zh: `全部职位：${country.en}` } },
          ]}
        />
      )}
    </main>
  );
}
