export const runtime = "nodejs";
export const revalidate = 3600;

// app/pl/jobs/stack/[slug]/page.tsx
//
// 29.10.2026: английская версия посадочной по стеку. Тело общее с украинской
// (components/stack-landing.tsx), разница -- язык подписей и свои метаданные с hreflang.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { StackLanding } from "@/components/stack-landing";
import { findTechLanding, techLandingH1, techLandingLead } from "@/lib/seo/tech-landings";
import { titleWithCountL } from "@/lib/seo/title-count";
import { postsForTech } from "@/lib/a1/tech-index";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";

const LOC = "pl" as const;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findTechLanding((await params).slug);
  if (!landing) return {};
  const count = (await postsForTech(landing.tech).catch(() => [])).length;
  const head = techLandingH1(landing.label)[LOC];
  const title = titleWithCountL(LOC, head, count, `${head} | A1 Jobs`);
  const description = techLandingLead(landing.label)[LOC];
  const path = `/jobs/stack/${landing.slug}`;
  const url = `${SITE_URL}/pl${path}`;

  return pagedMeta({
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "pl" },
    twitter: { card: "summary_large_image", title, description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const landing = findTechLanding((await params).slug);
  if (!landing) notFound();
  return <StackLanding landing={landing} page={pageOf(await searchParams)} locale="pl" />;
}
