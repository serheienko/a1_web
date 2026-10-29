export const runtime = "nodejs";
export const revalidate = 3600;

// app/de/jobs/city/[slug]/[tech]/page.tsx -- «Python jobs in Berlin» и прочие.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { cityPosts, cityTechPosts } from "@/lib/a1/segment-index";
import { countryByCode } from "@/lib/seo/countries";
import { findTechLanding } from "@/lib/seo/tech-landings";
import { cityTechCountLine, cityTechH1, cityTechLead } from "@/lib/seo/segments";
import { linksForCityTech } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";
import { titleWithCountL } from "@/lib/seo/title-count";

const LOC = "de" as const;

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
  const head = cityTechH1(data.city.city, data.landing.label, data.country)[LOC];
  const title = titleWithCountL(LOC, head, data.posts.length, `${head} | A1 Jobs`);
  const description = cityTechLead(data.city.city, data.landing.label, data.country)[LOC];
  const path = `/jobs/city/${data.city.slug}/${data.landing.slug}`;
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
  const data = await load(params);
  if (!data) notFound();
  const { landing, city, country, posts } = data;
  return (
    <SegmentPage
      locale="de"
      page={page}
      h1={cityTechH1(city.city, landing.label, country)}
      countLine={cityTechCountLine(city.city, landing.label, country)}
      lead={cityTechLead(city.city, landing.label, country)}
      posts={posts}
      breadcrumbName={cityTechH1(city.city, landing.label, country).en.replace(/^\S+\s/, "")}
      path={`/de/jobs/city/${city.slug}/${landing.slug}`}
      groups={await linksForCityTech(city.slug, landing.slug, city.cc)}
    />
  );
}
