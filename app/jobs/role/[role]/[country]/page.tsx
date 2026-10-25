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
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { countryRolePosts } from "@/lib/a1/segment-index";
import { roleInfo } from "@/lib/seo/job-role";
import { countryByCode, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE } from "@/lib/seo/countries";
import { roleCountryCountLine, roleCountryH1, roleCountryLead, roleCountryMeta } from "@/lib/seo/role-texts";
import { linksForCountry, linksForCountryRoles, linksForRoleCountries } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ role: string; country: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

async function resolve(roleSlug: string, code: string) {
  const info = roleInfo(roleSlug);
  const country = countryByCode(code);
  if (!info || !country || country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) return null;
  if (code !== code.toLowerCase()) return null;
  const posts = await countryRolePosts(country.code, info.slug);
  return posts ? { info, country, posts } : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { role, country } = await params;
  const r = await resolve(role, country);
  // notFound() здесь, а не только в странице: иначе мягкий 404 (см. /jobs/role/[role]).
  if (!r) notFound();
  const meta = roleCountryMeta(r.info.slug, r.country, r.posts.length);
  const url = `${SITE_URL}/jobs/role/${r.info.slug}/${country}`;
  return pagedMeta({
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
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
