export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/city/[slug]/[tech]/page.tsx -- «Python вакансії Київ», «Python jobs in London».
// Живёт, только если у города уже есть своя страница и в нём 10+ вакансий с этой технологией.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { cityPosts, cityTechPosts } from "@/lib/a1/segment-index";
import { countryByCode } from "@/lib/seo/countries";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { cityTechCountLine, cityTechH1, cityTechLead, cityTechMeta } from "@/lib/seo/segments";
import { linksForCityTech } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string; tech: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

async function load(params: Props["params"]) {
  const { slug, tech } = await params;
  const landing = findTechLanding(tech);
  const city = await cityPosts(slug);
  const country = city && countryByCode(city.cc);
  const posts = landing ? await cityTechPosts(slug, tech) : null;
  if (!landing || !city || !country || !posts) return null;
  return { landing, city, country, posts };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const meta = cityTechMeta(data.city.city, data.landing.label, data.country);
  const url = `${SITE_URL}/jobs/city/${data.city.slug}/${data.landing.slug}`;
  return pagedMeta({
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  }, url, pageOf(await searchParams));
}

export default async function Page({ params, searchParams }: Props) {
  const page = pageOf(await searchParams);
  const data = await load(params);
  if (!data) notFound();
  const { landing, city, country, posts } = data;
  return (
    <SegmentPage
      page={page}
      h1={cityTechH1(city.city, landing.label, country)}
      countLine={cityTechCountLine(city.city, landing.label, country)}
      lead={cityTechLead(city.city, landing.label, country)}
      posts={posts}
      breadcrumbName={cityTechH1(city.city, landing.label, country).en.replace(/^\S+\s/, "")}
      path={`/jobs/city/${city.slug}/${landing.slug}`}
      groups={await linksForCityTech(city.slug, landing.slug, city.cc)}
    />
  );
}
