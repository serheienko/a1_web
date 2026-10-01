export const runtime = "nodejs";
export const revalidate = 900;

// app/jobs/country/[code]/page.tsx -- посадочная «IT-вакансии в <стране>»
// (Конкистадор, 30.09.2026). См. lib/seo/country-landings.ts.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobLandingPage } from "@/components/job-landing";
import { findCountryLanding } from "@/lib/seo/country-landings";
import { SegmentLinks } from "@/components/segment-page";
import { articleLinks, linksForCountry } from "@/lib/seo/segment-links";
import { parsePageParam, toURLSearchParams, fetchFeedPage, pageToCursor } from "@/lib/a1/feed";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const found = findCountryLanding((await params).code);
  if (!found) return {};
  const { landing, country } = found;
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const base = `${SITE_URL}/jobs/${landing.slug}`;
  const url = page > 1 ? `${base}?page=${page}` : base;

  // Страна без вакансий -- пустая страница, в индексе ей делать нечего.
  const { total } = await fetchFeedPage("hiring", pageToCursor(1), { country: country.code });

  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    alternates: { canonical: url },
    robots: total === 0 ? { index: false, follow: true } : undefined,
    openGraph: { title: landing.metaTitle, description: landing.metaDescription, url, type: "website" },
    twitter: { card: "summary_large_image", title: landing.metaTitle, description: landing.metaDescription },
  };
}

// 01.10.2026: английские гайды блога под страны первого эшелона.
const COUNTRY_GUIDES: Record<string, string> = {
  US: "tech-jobs-in-usa",
  GB: "tech-jobs-in-uk",
  DE: "tech-jobs-in-germany",
  CA: "tech-jobs-in-canada",
  PL: "tech-jobs-in-poland",
  IL: "tech-jobs-in-israel",
};

export default async function Page({ params, searchParams }: Props) {
  const found = findCountryLanding((await params).code);
  if (!found) notFound();
  const page = parsePageParam(toURLSearchParams(await searchParams));
  // 30.09.2026: внизу страницы -- ссылки на сегменты страны (технология,
  // уровень, город); на главную и шапку это не влияет.
  const groups =
    found.country.code === "WW"
      ? articleLinks(["viddalena-robota-na-inozemnu-kompaniyu", "rynok-it-vakansiy"])
      : [
          ...(await linksForCountry(found.country.code)),
          ...articleLinks(
            COUNTRY_GUIDES[found.country.code]
              ? [COUNTRY_GUIDES[found.country.code]!]
              : ["rynok-it-vakansiy", "viddalena-robota-na-inozemnu-kompaniyu"],
          ),
        ];
  return (
    <>
      <JobLandingPage landing={found.landing} page={page} filters={{ country: found.country.code }} />
      <div className="mx-auto max-w-3xl px-4 pb-fab-safe">
        <SegmentLinks groups={groups} />
      </div>
    </>
  );
}
