export const runtime = "nodejs";
export const revalidate = 3600;

// app/de/jobs/remote/[stack]/page.tsx -- «Remote Python jobs» и прочие.
// Английская версия: тот же список, подписи одним языком, hreflang с украинской.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { remoteTechPosts } from "@/lib/a1/segment-index";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { remoteTechCountLine, remoteTechH1, remoteTechLead } from "@/lib/seo/segments";
import { linksForRemoteTech } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { titleWithCountL } from "@/lib/seo/title-count";

const LOC = "de" as const;

type Props = { params: Promise<{ stack: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findTechLanding((await params).stack);
  const posts = landing ? await remoteTechPosts(landing.slug) : null;
  if (!landing || !posts) return {};
  const head = remoteTechH1(landing.label)[LOC];
  const title = titleWithCountL(LOC, head, posts.length, `${head} | A1 Jobs`);
  const description = remoteTechLead(landing.label)[LOC];
  const path = `/jobs/remote/${landing.slug}`;
  const url = `${SITE_URL}/de${path}`;
  return pagedMeta({
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "de" },
    twitter: { card: "summary_large_image", title, description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const landing = findTechLanding((await params).stack);
  if (!landing) notFound();
  const posts = await remoteTechPosts(landing.slug);
  if (!posts) notFound();
  return (
    <SegmentPage
      locale="de"
      page={page}
      h1={remoteTechH1(landing.label)}
      countLine={remoteTechCountLine(landing.label)}
      lead={remoteTechLead(landing.label)}
      posts={posts}
      breadcrumbName={remoteTechH1(landing.label).en}
      path={`/de/jobs/remote/${landing.slug}`}
      groups={await linksForRemoteTech(landing.slug)}
    />
  );
}
