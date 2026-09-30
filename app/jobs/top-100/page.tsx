export const runtime = "nodejs";
export const revalidate = 900;

// app/jobs/top-100/page.tsx -- имиджевая посадочная «🌏 Топ 100»
// (Конкистадор, 30.09.2026). См. lib/seo/top100-landing.ts.

import type { Metadata } from "next";
import { JobLandingPage } from "@/components/job-landing";
import { TOP100_LANDING } from "@/lib/seo/top100-landing";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const landing = TOP100_LANDING;
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const url = page > 1 ? `${SITE_URL}/jobs/${landing.slug}?page=${page}` : `${SITE_URL}/jobs/${landing.slug}`;

  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: landing.metaTitle, description: landing.metaDescription, url, type: "website" },
    twitter: { card: "summary_large_image", title: landing.metaTitle, description: landing.metaDescription },
  };
}

export default async function Page({ searchParams }: Props) {
  const page = parsePageParam(toURLSearchParams(await searchParams));
  return <JobLandingPage landing={TOP100_LANDING} page={page} filters={{ top100: true }} />;
}
