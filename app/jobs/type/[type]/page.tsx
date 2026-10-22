export const runtime = "nodejs";
// Час, как у посадочных по формату работы: витрина, а не живая лента.
export const revalidate = 3600;

// app/jobs/type/[type]/page.tsx -- «Робота на неповний день», «Робота за
// контрактом», «Робота на повну ставку». Тексты и список -- в
// lib/seo/employment-landings.ts, начинка общая с /jobs/remote
// (components/job-landing.tsx).
//
// Один динамический сегмент на три страницы, а не три папки: в отличие
// от remote/office/hybrid здесь нет риска столкнуться со слагом вакансии
// (тот живёт прямо под /jobs), и три копии одного файла пришлось бы
// править синхронно.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobLandingPage } from "@/components/job-landing";
import { SegmentLinks } from "@/components/segment-page";
import { articleLinks, linksForEmploymentTypes, linksForGlobalRoles } from "@/lib/seo/segment-links";
import { EMPLOYMENT_LANDINGS, findEmploymentLanding } from "@/lib/seo/employment-landings";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";
import { landingCountry } from "@/lib/seo/landing-country";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export function generateStaticParams() {
  return EMPLOYMENT_LANDINGS.map((l) => ({ type: l.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const landing = findEmploymentLanding((await params).type);
  if (!landing) return {};
  const sp = await searchParams;
  const page = parsePageParam(toURLSearchParams(sp));
  const country = landingCountry(sp);
  const base = `${SITE_URL}/jobs/type/${landing.slug}`;
  const url = page > 1 ? `${base}?page=${page}` : base;

  return {
    // Вариант со страной -- фильтр, не витрина: не индексируем.
    ...(country ? { robots: { index: false, follow: true } } : {}),
    title: landing.metaTitle,
    description: landing.metaDescription,
    // Каждая страница пагинации канонична сама себе -- то же решение,
    // что на главной и на /jobs/remote.
    alternates: { canonical: url },
    openGraph: { title: landing.metaTitle, description: landing.metaDescription, url, type: "website" },
    twitter: { card: "summary_large_image", title: landing.metaTitle, description: landing.metaDescription },
  };
}

export default async function Page({ params, searchParams }: Props) {
  const landing = findEmploymentLanding((await params).type);
  if (!landing) notFound();
  const sp = await searchParams;
  const page = parsePageParam(toURLSearchParams(sp));
  const country = landingCountry(sp);
  return (
    <>
      <JobLandingPage landing={landing} page={page} country={country} />
      {country ? null : (
        <div className="mx-auto max-w-3xl px-4 pb-fab-safe">
          <SegmentLinks
            groups={[
              ...linksForEmploymentTypes(landing.slug),
              ...(await linksForGlobalRoles()),
              ...articleLinks(["rynok-it-vakansiy", "viddalena-robota-na-inozemnu-kompaniyu", "zarplaty-v-it-za-tehnologiyamy"]),
            ]}
          />
        </div>
      )}
    </>
  );
}
