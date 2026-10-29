export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/city/[slug]/page.tsx -- «IT вакансії Київ», «IT jobs in London».
// Живёт, только если в городе 10+ вакансий (lib/seo/segments.ts).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { cityPosts } from "@/lib/a1/segment-index";
import { countryByCode } from "@/lib/seo/countries";
import { cityCountLine, cityH1, cityLabel, cityLead, cityMeta } from "@/lib/seo/segments";
import { titleWithCount } from "@/lib/seo/title-count";
import { linksForCity } from "@/lib/seo/segment-links";
import { altLanguages } from "@/lib/seo/hreflang";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) return {};
  const meta = cityMeta(seg.city, country);
  // 29.10.2026: у украинских городов в названии число вакансий и месяц (lib/seo/title-count.ts).
  if (country.code === "UA") meta.title = titleWithCount(`IT вакансії ${cityLabel(seg.city, "uk")}`, seg.posts.length, meta.title);
  const path = `/jobs/city/${seg.slug}`;
  const url = `${SITE_URL}${path}`;
  return pagedMeta({
    title: meta.title,
    description: meta.description,
    // 29.10.2026: связь с английской версией (app/en/jobs/city/[slug]/page.tsx).
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) notFound();
  return (
    <SegmentPage
      page={page}
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
