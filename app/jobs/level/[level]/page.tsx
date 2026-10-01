export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/level/[level]/page.tsx -- «Junior вакансії», «Senior вакансії».
// Уровень берётся из заголовка вакансии (lib/seo/job-level.ts); аудитория
// -- та же, что у главной: Украина и удалённые «отовсюду». Страны мира
// получают свои страницы уровня: /jobs/country/<код>/junior.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { globalLevelPosts } from "@/lib/a1/segment-index";
import { JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { globalLevelCountLine, globalLevelH1, globalLevelLead, globalLevelMeta } from "@/lib/seo/segments";
import { articleLinks, linksForGlobalLevels } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ level: string }> };

function parse(level: string): JobLevel | null {
  return (JOB_LEVELS as string[]).includes(level) ? (level as JobLevel) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const level = parse((await params).level);
  if (!level || !(await globalLevelPosts(level))) return {};
  const meta = globalLevelMeta(level);
  const url = `${SITE_URL}/jobs/level/${level}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function Page({ params }: Props) {
  const level = parse((await params).level);
  if (!level) notFound();
  const posts = await globalLevelPosts(level);
  if (!posts) notFound();
  return (
    <SegmentPage
      h1={globalLevelH1(level)}
      countLine={globalLevelCountLine(level)}
      lead={globalLevelLead(level)}
      posts={posts}
      breadcrumbName={globalLevelH1(level).uk}
      path={`/jobs/level/${level}`}
      groups={[...(await linksForGlobalLevels(level)), ...articleLinks(["persha-robota-v-it-bez-dosvidu", "rynok-it-vakansiy", "zarplaty-v-it-za-tehnologiyamy"])]}
    />
  );
}
