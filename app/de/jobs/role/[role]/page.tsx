// app/de/jobs/role/[role]/page.tsx
//
// 29.10.2026 (Александр: «сайт мировой, а в поиске он украинский»). Первая языковая версия посадочной:
// тот же список вакансий, но заголовок, описание и подписи -- ТОЛЬКО по-английски, и обе версии
// связаны метками hreflang. Украинский адрес /jobs/role/<role> не меняется.
//
// Мастер-план: «Языковые версии сайта» (Claude Docs, 29.10.2026). Это образец для шага 1: когда он
// подтвердится на живом сайте, той же механикой накрываются стеки, города, страны и remote.
//
// Почему страница своя, а не общий сегмент /[lang]/: перенос всего дерева адресов под языковой
// сегмент -- работа на несколько дней и риск для уже набранного индекса. Google атрибут lang в коде
// не учитывает (ранжирует по самому тексту и hreflang), поэтому для языка достаточно отдельного
// адреса с английским содержимым.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { globalRolePosts } from "@/lib/a1/segment-index";
import { roleInfo } from "@/lib/seo/job-role";
import { roleCountLine, roleH1, roleLead } from "@/lib/seo/role-texts";
import { titleWithCountL } from "@/lib/seo/title-count";
import { articleLinks, interviewLinks, linksForGlobalLevels, linksForGlobalRoles, linksForRoleCountries, linksForSalaryOfRole } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

const LOC = "de" as const;

type Props = { params: Promise<{ role: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const info = roleInfo((await params).role);
  const posts = info ? await globalRolePosts(info.slug) : null;
  if (!info || !posts) notFound();

  const head = roleH1(info.slug)[LOC];
  const fallback = `${head} | A1 Jobs`;
  const title = titleWithCountL(LOC, head, posts.length, fallback);
  const description = roleLead(info.slug)[LOC];
  const url = `${SITE_URL}/de/jobs/role/${info.slug}`;
  const uk = `${SITE_URL}/jobs/role/${info.slug}`;

  return pagedMeta({
    title,
    description,
    alternates: {
      canonical: url,
      // Обе версии ссылаются друг на друга; x-default -- украинская (она основная и старшая).
      languages: { uk, en: url, "x-default": uk },
    },
    openGraph: { title, description, url, type: "website", locale: "de" },
    twitter: { card: "summary_large_image", title, description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const info = roleInfo((await params).role);
  if (!info) notFound();
  const posts = await globalRolePosts(info.slug);
  if (!posts) notFound();
  return (
    <SegmentPage
      locale="de"
      page={page}
      h1={roleH1(info.slug)}
      countLine={roleCountLine(info.slug)}
      lead={roleLead(info.slug)}
      posts={posts}
      breadcrumbName={roleH1(info.slug).en}
      path={`/de/jobs/role/${info.slug}`}
      groups={[
        ...(await linksForSalaryOfRole(info.slug)),
        ...(await linksForRoleCountries(info.slug)),
        ...interviewLinks({ role: info.slug }),
        ...(await linksForGlobalRoles(info.slug)),
        ...(await linksForGlobalLevels()),
        ...articleLinks(["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy", "zarplaty-v-it-za-tehnologiyamy"]),
      ]}
    />
  );
}
