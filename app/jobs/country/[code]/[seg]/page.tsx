export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/country/[code]/[seg]/page.tsx -- страна + технология / уровень /
// удалёнка: «Python jobs in Germany», «Junior IT jobs in the UK»,
// «Remote IT jobs in Canada». Живёт, только если в сегменте 10+ вакансий.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { countryLevelPosts, countryRemotePosts, countryTechPosts } from "@/lib/a1/segment-index";
import { countryByCode, DEFAULT_COUNTRY_CODE, WORLDWIDE_CODE, type Country } from "@/lib/seo/countries";
import { JOB_LEVELS, type JobLevel } from "@/lib/seo/job-level";
import { TECH_LANDINGS } from "@/lib/seo/tech-landings";
import {
  countrySegCountLine,
  countrySegH1,
  countrySegLead,
  countrySegMeta,
  levelLabel,
  type CountrySegKind,
} from "@/lib/seo/segments";
import { linksForCountry } from "@/lib/seo/segment-links";
import type { WebPost } from "@/types/web-post";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ code: string; seg: string }> };

type Resolved = { country: Country; kind: CountrySegKind; label: string; posts: WebPost[] };

async function resolve(code: string, seg: string): Promise<Resolved | null> {
  const country = countryByCode(code);
  if (!country || country.code === DEFAULT_COUNTRY_CODE || country.code === WORLDWIDE_CODE) return null;

  if (seg === "remote") {
    const posts = await countryRemotePosts(country.code);
    return posts ? { country, kind: "remote", label: "Remote", posts } : null;
  }
  if ((JOB_LEVELS as string[]).includes(seg)) {
    const posts = await countryLevelPosts(country.code, seg as JobLevel);
    return posts ? { country, kind: "level", label: levelLabel(seg as JobLevel), posts } : null;
  }
  const tech = TECH_LANDINGS.find((t) => t.slug === seg);
  if (!tech) return null;
  const posts = await countryTechPosts(country.code, tech.slug);
  return posts ? { country, kind: "stack", label: tech.label, posts } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, seg } = await params;
  const r = await resolve(code, seg);
  if (!r) return {};
  const meta = countrySegMeta(r.kind, r.label, r.country);
  const url = `${SITE_URL}/jobs/country/${code.toLowerCase()}/${seg}`;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: { title: meta.title, description: meta.description, url, type: "website" },
    twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
  };
}

export default async function Page({ params }: Props) {
  const { code, seg } = await params;
  const r = await resolve(code, seg);
  if (!r) notFound();
  const path = `/jobs/country/${code.toLowerCase()}/${seg}`;
  return (
    <SegmentPage
      h1={countrySegH1(r.kind, r.label, r.country)}
      countLine={countrySegCountLine(r.kind, r.label, r.country)}
      lead={countrySegLead(r.kind, r.label, r.country)}
      posts={r.posts}
      breadcrumbName={countrySegH1(r.kind, r.label, r.country).en.replace(/^\S+\s/, "")}
      path={path}
      groups={await linksForCountry(r.country.code, { skip: path })}
    />
  );
}
