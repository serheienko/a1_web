export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/remote/[stack]/page.tsx -- «Віддалена робота Python», «Remote Python jobs».
// Удалённые вакансии (украинские и «отовсюду») по технологии; 10+ вакансий или 404.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { remoteTechPosts } from "@/lib/a1/segment-index";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { remoteTechCountLine, remoteTechH1, remoteTechLead, remoteTechMeta } from "@/lib/seo/segments";
import { linksForRemoteTech } from "@/lib/seo/segment-links";
import { altLanguages } from "@/lib/seo/hreflang";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ stack: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findTechLanding((await params).stack);
  if (!landing || !(await remoteTechPosts(landing.slug))) return {};
  const meta = remoteTechMeta(landing.label);
  const path = `/jobs/remote/${landing.slug}`;
  const url = `${SITE_URL}${path}`;
  return pagedMeta({
    title: meta.title,
    description: meta.description,
    // 29.10.2026: связь с английской версией.
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
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
      page={page}
      h1={remoteTechH1(landing.label)}
      countLine={remoteTechCountLine(landing.label)}
      lead={remoteTechLead(landing.label)}
      posts={posts}
      breadcrumbName={remoteTechH1(landing.label).en}
      path={`/jobs/remote/${landing.slug}`}
      groups={await linksForRemoteTech(landing.slug)}
    />
  );
}
