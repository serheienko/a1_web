export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/salary/[role]/page.tsx -- «Зарплати: QA та тестування».
// Вилка, медиана и все вакансии, из которых они посчитаны. Отбор --
// lib/a1/salary-index.ts, арифметика -- lib/a1/salary-stats.ts, тексты --
// lib/seo/salary-texts.ts.
//
// Страница существует, только если в выборке набралось достаточно
// вакансий с названной суммой (MIN_SALARY_POSTS). Иначе 404 -- и ссылок
// на неё нигде нет: медиана по трём вакансиям хуже, чем её отсутствие.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { SalarySummary } from "@/components/salary-summary";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { salaryForRole, salaryCountriesForRole } from "@/lib/a1/salary-index";
import { JOB_ROLES, type JobRole } from "@/lib/seo/job-role";
import { salaryCountLine, salaryH1, salaryLead, salaryMeta } from "@/lib/seo/salary-texts";
import { articleLinks, linksForSalaryRoles } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function parse(role: string): JobRole | null {
  return (JOB_ROLES as string[]).includes(role) ? (role as JobRole) : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const role = parse((await params).role);
  if (!role || !(await salaryForRole(role))) return {};
  const meta = salaryMeta(role);
  const url = `${SITE_URL}/jobs/salary/${role}`;
  return pagedMeta(
    {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: url },
      openGraph: { title: meta.title, description: meta.description, url, type: "website" },
      twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
    },
    url,
    pageOf(await searchParams),
  );
}

export default async function Page({ params, searchParams }: Props) {
  const role = parse((await params).role);
  if (!role) notFound();
  const segment = await salaryForRole(role);
  if (!segment) notFound();
  const page = pageOf(await searchParams);
  const countries = await salaryCountriesForRole(role);
  return (
    <SegmentPage
      page={page}
      h1={salaryH1(role)}
      countLine={salaryCountLine(role)}
      lead={salaryLead(role)}
      posts={segment.posts}
      beforeList={<SalarySummary stats={segment.stats} role={role} countries={countries} />}
      breadcrumbName={salaryH1(role).uk}
      path={`/jobs/salary/${role}`}
      groups={[
        ...(await linksForSalaryRoles(role)),
        ...articleLinks(["zarplaty-v-it-za-tehnologiyamy", "rynok-it-vakansiy"]),
      ]}
    />
  );
}
