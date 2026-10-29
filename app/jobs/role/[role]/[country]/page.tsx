export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/role/[role]/[country]/page.tsx -- профессия + страна: «QA вакансії
// в Польщі», «DevOps jobs in Germany».
//
// 25.10.2026 (Александр: «конечно делать, это же для Гугла хорошо»). В базе
// больше 50 тысяч вакансий, а страница профессии была одна -- для Украины и
// удалёнки. Здесь та же профессия по каждой стране, где у неё 10+ вакансий
// (MIN_SEGMENT_POSTS): меньше -- 404, пустых страниц в индексе не бывает.
// Украина отдельной парой не живёт -- её покрывает /jobs/role/<role>.

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
import { roleCountryCountLine, roleCountryH1, roleCountryLead, roleCountryMeta } from "@/lib/seo/role-texts";
import { linksForCountry, linksForCountryRoles, linksForRoleCountries } from "@/lib/seo/segment-links";
import { altLanguages } from "@/lib/seo/hreflang";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ role: string; country: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

// 25.10.2026 (Александр: «по всем странам, которые у нас в листинге, можно
// было посмотреть; если данных недостаточно -- так и писать»). Страница есть
// для любой страны списка; меньше MIN_SEGMENT_POSTS вакансий -- плашка
// «в этом регионе пока мало» и noindex. Украина и «Весь світ» -- это общая
// страница профессии (Украина + удалённые), туда и уводим.
async function resolve(roleSlug: string, code: string) {
  const info = roleInfo(roleSlug);
  const country = countryByCode(code);
  if (!info || !country) return null;
  if (country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) permanentRedirect(`/jobs/role/${info.slug}`);
  if (code !== code.toLowerCase()) permanentRedirect(`/jobs/role/${info.slug}/${country.code.toLowerCase()}`);
  const posts = await countryRolePostsAny(country.code, info.slug);
  return { info, country, posts, thin: posts.length < MIN_SEGMENT_POSTS };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { role, country } = await params;
  const r = await resolve(role, country);
  // notFound() здесь, а не только в странице: иначе мягкий 404 (см. /jobs/role/[role]).
  if (!r) notFound();
  const meta = roleCountryMeta(r.info.slug, r.country, r.posts.length);
  const path = `/jobs/role/${r.info.slug}/${country}`;
  const url = `${SITE_URL}${path}`;
  return pagedMeta({
    title: meta.title,
    description: meta.description,
    // 29.10.2026: связь с английской версией.
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
    ...(r.thin ? { robots: { index: false, follow: true } } : {}),
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const { role, country } = await params;
  const r = await resolve(role, country);
  if (!r) notFound();
  const path = `/jobs/role/${r.info.slug}/${country}`;
  const h1 = roleCountryH1(r.info.slug, r.country);
  return (
    <SegmentPage
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
              { href: `/jobs/role/${r.info.slug}`, label: LINK_ROLE_EVERYWHERE },
              { href: `/jobs/country/${country}/roles`, label: LINK_ALL_ROLES },
            ]}
          />
        ) : undefined
      }
      breadcrumbName={h1.uk}
      path={path}
      groups={[
        { title: { uk: "Уся професія", en: "This role everywhere", ru: "Вся профессия", de: "Diese Rolle überall", es: "Este puesto en todas partes", fr: "Ce métier partout", pl: "To stanowisko wszędzie", ptBR: "Esta função em todo lugar", zh: "该职位全部" }, links: [{ href: `/jobs/role/${r.info.slug}`, label: r.info.label }, { href: "/jobs/role", label: "Усі професії" }] },
        ...(await linksForCountryRoles(r.country.code, r.info.slug)),
        ...(await linksForRoleCountries(r.info.slug, country)),
        ...(await linksForCountry(r.country.code, { skip: path })),
      ]}
    />
  );
}
