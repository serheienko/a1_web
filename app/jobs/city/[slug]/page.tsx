export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/city/[slug]/page.tsx -- «IT вакансії Київ», «IT jobs in London».
// Живёт, только если в городе 10+ вакансий (lib/seo/segments.ts).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { cityPosts } from "@/lib/a1/segment-index";
import { countryByCode } from "@/lib/seo/countries";
import { cityCountLine, cityH1, cityLead, cityMeta } from "@/lib/seo/segments";
import { linksForCity } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) return {};
  const meta = cityMeta(seg.city, country);
  const url = `${SITE_URL}/jobs/city/${seg.slug}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function Page({ params }: Props) {
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) notFound();
  return (
    <SegmentPage
      h1={cityH1(seg.city, country)}
      countLine={cityCountLine(seg.city, country)}
      lead={cityLead(seg.city, country)}
      posts={seg.posts}
      breadcrumbName={cityH1(seg.city, country).en.replace(/^\S+\s/, "")}
      path={`/jobs/city/${seg.slug}`}
      groups={await linksForCity(seg.cc, seg.slug)}
    />
  );
}
