export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/role/[role]/page.tsx -- «Вакансії QA», «Frontend вакансії»,
// «Вакансії UI/UX дизайнера». Профессия берётся из заголовка вакансии
// (lib/seo/job-role.ts); аудитория -- как у главной: Украина и удалённые
// «отовсюду». Ниже порога MIN_SEGMENT_POSTS страницы нет (404).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { globalRolePosts } from "@/lib/a1/segment-index";
import { roleInfo } from "@/lib/seo/job-role";
import { roleCountLine, roleH1, roleLead, roleMeta } from "@/lib/seo/role-texts";
import { articleLinks, linksForGlobalLevels, linksForGlobalRoles } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ role: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const info = roleInfo((await params).role);
  if (!info || !(await globalRolePosts(info.slug))) return {};
  const meta = roleMeta(info.slug);
  const url = `${SITE_URL}/jobs/role/${info.slug}`;
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
  const info = roleInfo((await params).role);
  if (!info) notFound();
  const posts = await globalRolePosts(info.slug);
  if (!posts) notFound();
  return (
    <SegmentPage
      page={page}
      h1={roleH1(info.slug)}
      countLine={roleCountLine(info.slug)}
      lead={roleLead(info.slug)}
      posts={posts}
      breadcrumbName={roleH1(info.slug).uk}
      path={`/jobs/role/${info.slug}`}
      groups={[
        ...(await linksForGlobalRoles(info.slug)),
        ...(await linksForGlobalLevels()),
        ...articleLinks(["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy", "zarplaty-v-it-za-tehnologiyamy"]),
      ]}
    />
  );
}
