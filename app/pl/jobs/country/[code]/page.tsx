export const runtime = "nodejs";
export const revalidate = 600;

// app/pl/jobs/country/[code]/page.tsx -- «IT jobs in Germany» и остальные страны.
// У страновых витрин заголовок и описание и так английские (lib/seo/country-landings.ts);
// английская версия отличается тем, что подписи идут одним языком, и своим hreflang.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobLandingPage } from "@/components/job-landing";
import { SegmentLinks } from "@/components/segment-page";
import { findCountryLanding } from "@/lib/seo/country-landings";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";
import { fetchFeedPage, pageToCursor } from "@/lib/a1/feed";
import { articleLinks, linksForCountry, linksForCountryRoles } from "@/lib/seo/segment-links";
import { altLanguages, SITE_URL } from "@/lib/seo/hreflang";

const LOC = "pl" as const;

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const found = findCountryLanding((await params).code);
  if (!found) return {};
  const { landing, country } = found;
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const path = `/jobs/${landing.slug}`;
  const base = `${SITE_URL}/pl${path}`;
  const url = page > 1 ? `${base}?page=${page}` : base;
  const { total } = await fetchFeedPage("hiring", pageToCursor(1), { country: country.code });

  const title = `${landing.h1[LOC]} | A1 Jobs`;
  const description = landing.lead[LOC];

  return {
    title,
    description,
    alternates: { canonical: url, languages: altLanguages(path) },
    robots: total === 0 ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url, type: "website", locale: "pl" },
    twitter: { card: "summary_large_image", title: landing.metaTitle, description: landing.metaDescription },
  };
}

const COUNTRY_GUIDES: Record<string, string> = {
  US: "tech-jobs-in-usa",
  GB: "tech-jobs-in-uk",
  DE: "tech-jobs-in-germany",
  CA: "tech-jobs-in-canada",
  PL: "tech-jobs-in-poland",
  IL: "tech-jobs-in-israel",
  NL: "tech-jobs-in-netherlands",
  IE: "tech-jobs-in-ireland",
  ES: "tech-jobs-in-spain",
  FR: "tech-jobs-in-france",
  AU: "tech-jobs-in-australia",
};

export default async function Page({ params, searchParams }: Props) {
  const found = findCountryLanding((await params).code);
  if (!found) notFound();
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const groups =
    found.country.code === "WW"
      ? articleLinks(["viddalena-robota-na-inozemnu-kompaniyu", "rynok-it-vakansiy"])
      : [
          ...(await linksForCountryRoles(found.country.code)),
          ...(await linksForCountry(found.country.code)),
          ...articleLinks(
            COUNTRY_GUIDES[found.country.code]
              ? [COUNTRY_GUIDES[found.country.code]!]
              : ["rynok-it-vakansiy", "viddalena-robota-na-inozemnu-kompaniyu"],
          ),
        ];
  return (
    <>
      <JobLandingPage
        landing={found.landing}
        page={page}
        filters={{ country: found.country.code }}
        locale="pl"
        basePathOverride={`/pl/jobs/${found.landing.slug}`}
      />
      <div className="mx-auto max-w-3xl px-4 pb-fab-safe">
        <SegmentLinks locale="pl" groups={groups} />
      </div>
    </>
  );
}
