export const runtime = "nodejs";
export const revalidate = 3600;

// app/es/jobs/level/[level]/page.tsx -- английская версия «Junior/Senior jobs».
// Список тот же (lib/a1/segment-index.ts), подписи одним языком, hreflang связывает с украинской.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { globalLevelPosts } from "@/lib/a1/segment-index";
import { JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { globalLevelCountLine, globalLevelH1, globalLevelLead } from "@/lib/seo/segments";
import { articleLinks, linksForGlobalLevels, linksForGlobalRoles } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { titleWithCountL } from "@/lib/seo/title-count";

const LOC = "es" as const;

type Props = { params: Promise<{ level: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

function parse(level: string): JobLevel | null {
  return (JOB_LEVELS as string[]).includes(level) ? (level as JobLevel) : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const level = parse((await params).level);
  const posts = level ? await globalLevelPosts(level) : null;
  if (!level || !posts) return {};
  const head = globalLevelH1(level)[LOC];
  const title = titleWithCountL(LOC, head, posts.length, `${head} | A1 Jobs`);
  const description = globalLevelLead(level)[LOC];
  const path = `/jobs/level/${level}`;
  const url = `${SITE_URL}/es${path}`;
  return pagedMeta({
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "es" },
    twitter: { card: "summary_large_image", title, description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const level = parse((await params).level);
  if (!level) notFound();
  const posts = await globalLevelPosts(level);
  if (!posts) notFound();
  return (
    <SegmentPage
      locale="es"
      page={page}
      h1={globalLevelH1(level)}
      countLine={globalLevelCountLine(level)}
      lead={globalLevelLead(level)}
      posts={posts}
      breadcrumbName={globalLevelH1(level).en}
      path={`/es/jobs/level/${level}`}
      groups={[...(await linksForGlobalLevels(level)), ...(await linksForGlobalRoles()), ...articleLinks(["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy", "zarplaty-v-it-za-tehnologiyamy"])]}
    />
  );
}
