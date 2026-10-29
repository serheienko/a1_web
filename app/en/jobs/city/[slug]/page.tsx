export const runtime = "nodejs";
export const revalidate = 3600;

// app/en/jobs/city/[slug]/page.tsx -- английская версия страницы города.
// Для международных городов английский и есть основной язык запроса («IT jobs in Berlin»).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { cityPosts } from "@/lib/a1/segment-index";
import { countryByCode } from "@/lib/seo/countries";
import { cityCountLine, cityH1, cityLead } from "@/lib/seo/segments";
import { linksForCity } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { titleWithCountEn } from "@/lib/seo/title-count";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) return {};
  const head = `IT jobs in ${seg.city}`;
  const title = titleWithCountEn(head, seg.posts.length, `${head}, ${country.en} | A1 Jobs`);
  const description = `Open IT jobs in ${seg.city}, ${country.en}: software engineering, data, DevOps, product and design roles. Updated daily.`;
  const path = `/jobs/city/${seg.slug}`;
  const url = `${SITE_URL}/en${path}`;
  return pagedMeta({
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    openGraph: { title, description, url, type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const seg = await cityPosts((await params).slug);
  const country = seg && countryByCode(seg.cc);
  if (!seg || !country) notFound();
  return (
    <SegmentPage
      locale="en"
      page={page}
      h1={cityH1(seg.city, country)}
      countLine={cityCountLine(seg.city, country)}
      lead={cityLead(seg.city, country)}
      posts={seg.posts}
      breadcrumbName={cityH1(seg.city, country).en.replace(/^\S+\s/, "")}
      path={`/en/jobs/city/${seg.slug}`}
      groups={await linksForCity(seg.cc, seg.slug)}
    />
  );
}
