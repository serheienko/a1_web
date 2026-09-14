export const runtime = "nodejs";
// Час, а не 15 секунд как у главной: посадочная -- это витрина формата, а
// не живая лента, и её содержимое меняется на несколько вакансий в сутки.
// Заодно это держит нагрузку на бэкенд низкой при обходе роботом.
export const revalidate = 3600;

// app/jobs/remote/page.tsx
//
// 2026-09-14. Посадочная страница по формату работы. Вся начинка --
// в components/job-landing.tsx, вся мотивация и данные, по которым
// выбраны именно эти три страницы, -- в шапке lib/seo/job-landings.ts.
//
// Статический сегмент, поэтому Next разрешает его РАНЬШЕ динамического
// app/jobs/[slug] -- страница вакансии не задета никак. Слаг вакансии
// всегда оканчивается на "-po_<id>", так что пересечься эти адреса не
// могут в принципе.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JobLandingPage } from "@/components/job-landing";
import { findJobLanding } from "@/lib/seo/job-landings";
import { parsePageParam, toURLSearchParams } from "@/lib/a1/feed";

const SITE_URL = "https://jobs.a1appp.com";
const SLUG = "remote";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const landing = findJobLanding(SLUG);
  if (!landing) return {};
  const page = parsePageParam(toURLSearchParams(await searchParams));
  const url = page > 1 ? `${SITE_URL}/jobs/${SLUG}?page=${page}` : `${SITE_URL}/jobs/${SLUG}`;

  return {
    title: landing.metaTitle,
    description: landing.metaDescription,
    // Каждая страница пагинации канонична сама себе: её вакансий нет на
    // первой, схлопнуть канонический адрес значило бы сказать Google их
    // не индексировать. То же решение, что на главной.
    alternates: { canonical: url },
    openGraph: { title: landing.metaTitle, description: landing.metaDescription, url, type: "website" },
    twitter: { card: "summary_large_image", title: landing.metaTitle, description: landing.metaDescription },
  };
}

export default async function Page({ searchParams }: Props) {
  const landing = findJobLanding(SLUG);
  if (!landing) notFound();
  const page = parsePageParam(toURLSearchParams(await searchParams));
  return <JobLandingPage landing={landing} page={page} />;
}
