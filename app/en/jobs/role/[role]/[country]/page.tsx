export const runtime = "nodejs";
export const revalidate = 3600;

// app/en/jobs/role/[role]/[country]/page.tsx -- «QA jobs in Poland» и прочие пары профессия+страна.
// Английская версия: самый ценный для англоязычного поиска разрез («python jobs germany»).
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RegionNotice } from "@/components/region-notice";
import { MIN_SEGMENT_POSTS } from "@/lib/seo/segments";
import { LINK_ALL_ROLES, LINK_ROLE_EVERYWHERE, thinRoleText } from "@/lib/seo/region-texts";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { countryRolePostsAny } from "@/lib/a1/segment-index";
import { roleInfo } from "@/lib/seo/job-role";
import { countryByCode, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE } from "@/lib/seo/countries";
import { roleCountryCountLine, roleCountryH1, roleCountryLead } from "@/lib/seo/role-texts";
import { linksForCountry, linksForCountryRoles, linksForRoleCountries } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { titleWithCountEn } from "@/lib/seo/title-count";

type Props = { params: Promise<{ role: string; country: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

async function resolve(roleSlug: string, code: string) {
  const info = roleInfo(roleSlug);
  const country = countryByCode(code);
  if (!info || !country) return null;
  if (country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) permanentRedirect(`/en/jobs/role/${info.slug}`);
  if (code !== code.toLowerCase()) permanentRedirect(`/en/jobs/role/${info.slug}/${country.code.toLowerCase()}`);
  const posts = await countryRolePostsAny(country.code, info.slug);
  return { info, country, posts, thin: posts.length < MIN_SEGMENT_POSTS };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { role, country } = await params;
  const r = await resolve(role, country);
  if (!r) notFound();
  const head = `${r.info.en} jobs in ${r.country.en}`;
  const title = titleWithCountEn(head, r.posts.length, `${head} | A1 Jobs`);
  const description = `Open ${r.info.en} jobs in ${r.country.en}: ${r.posts.length} positions from local and international companies. Updated daily.`;
  const path = `/jobs/role/${r.info.slug}/${country}`;
  const url = `${SITE_URL}/en${path}`;
  return pagedMeta({
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
    ...(r.thin ? { robots: { index: false, follow: true } } : {}),
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const { role, country } = await params;
  const r = await resolve(role, country);
  if (!r) notFound();
  const path = `/en/jobs/role/${r.info.slug}/${country}`;
  const h1 = roleCountryH1(r.info.slug, r.country);
  return (
    <SegmentPage
      locale="en"
      page={page}
      h1={h1}
      countLine={roleCountryCountLine()}
      lead={roleCountryLead(r.info.slug, r.country)}
      posts={r.posts}
      beforeList={
        r.thin ? (
          <RegionNotice
            text={thinRoleText(r.info.slug, r.country)}
            links={[
              { href: `/en/jobs/role/${r.info.slug}`, label: LINK_ROLE_EVERYWHERE },
              { href: `/jobs/country/${country}/roles`, label: LINK_ALL_ROLES },
            ]}
          />
        ) : undefined
      }
      breadcrumbName={h1.en}
      path={path}
      groups={[
        { title: { uk: "Уся професія", en: "This role everywhere", ru: "Вся профессия", de: "Diese Rolle überall", es: "Este puesto en todas partes", fr: "Ce métier partout", pl: "To stanowisko wszędzie", ptBR: "Esta função em todo lugar", zh: "该职位全部" }, links: [{ href: `/en/jobs/role/${r.info.slug}`, label: r.info.label }, { href: "/jobs/role", label: "All roles" }] },
        ...(await linksForCountryRoles(r.country.code, r.info.slug)),
        ...(await linksForRoleCountries(r.info.slug, country)),
        ...(await linksForCountry(r.country.code, { skip: path })),
      ]}
    />
  );
}
