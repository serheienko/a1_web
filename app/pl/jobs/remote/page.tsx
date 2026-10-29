export const runtime = "nodejs";
export const revalidate = 600;

// app/pl/jobs/remote/page.tsx -- английская версия витрины «remote».
// Та же лента и тот же фильтр, подписи одним языком; hreflang связывает с украинским адресом.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobLandingPage } from "@/components/job-landing";
import { SegmentLinks } from "@/components/segment-page";
import { findJobLanding } from "@/lib/seo/job-landings";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";
import { articleLinks, linksForRemoteHub } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";

const SLUG = "remote";

const LOC = "pl" as const;

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const landing = findJobLanding(SLUG);
  if (!landing) return {};
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const path = `/jobs/${SLUG}`;
  const base = `${SITE_URL}/pl${path}`;
  const url = page > 1 ? `${base}?page=${page}` : base;
  const title = `${landing.h1[LOC]} | A1 Jobs`;
  const description = landing.lead[LOC];

  return {
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "pl" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ searchParams }: Props) {
  const landing = findJobLanding(SLUG);
  if (!landing) notFound();
  const page = parsePageParam(toURLSearchParams(await searchParams));
  return (
    <>
      <JobLandingPage landing={landing} page={page} locale="pl" basePathOverride={`/pl/jobs/${SLUG}`} />
      <div className="mx-auto max-w-3xl px-4 pb-fab-safe">
        <SegmentLinks locale="pl" groups={[...(await linksForRemoteHub()), ...articleLinks(["viddalena-robota-na-inozemnu-kompaniyu", "rynok-it-vakansiy"])]} />
      </div>
    </>
  );
}
