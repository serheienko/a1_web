export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/salary/[role]/[country]/page.tsx -- «Зарплати: QA, Польща».
// Разрез основной страницы по стране. Открывается только там, где
// вакансий с названной суммой хватает на честную медиану: см. шапку
// app/jobs/salary/[role]/page.tsx.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SegmentPage } from "@/components/segment-page";
import { SalarySummary } from "@/components/salary-summary";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { salaryCountriesForRole, salaryForRoleCountry } from "@/lib/a1/salary-index";
import { JOB_ROLES, type JobRole } from "@/lib/seo/job-role";
import { countryByCode } from "@/lib/seo/countries";
import { salaryCountLine, salaryH1, salaryLead, salaryMeta } from "@/lib/seo/salary-texts";
import { articleLinks, linksForSalaryRoles } from "@/lib/seo/segment-links";

const SITE_URL = "https://jobs.a1appp.com";

type Props = {
  params: Promise<{ role: string; country: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function parse(role: string): JobRole | null {
  return (JOB_ROLES as string[]).includes(role) ? (role as JobRole) : null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { role: roleParam, country: cc } = await params;
  const role = parse(roleParam);
  const country = countryByCode(cc);
  if (!role || !country || !(await salaryForRoleCountry(role, cc))) return {};
  const meta = salaryMeta(role, country);
  const url = `${SITE_URL}/jobs/salary/${role}/${cc.toLowerCase()}`;
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
  const { role: roleParam, country: cc } = await params;
  const role = parse(roleParam);
  const country = countryByCode(cc);
  if (!role || !country) notFound();
  const segment = await salaryForRoleCountry(role, cc);
  if (!segment) notFound();
  const page = pageOf(await searchParams);
  // Соседние страны -- под сводкой, чтобы переключиться было одним кликом,
  // а не прокруткой через весь список вакансий.
  const others = (await salaryCountriesForRole(role)).filter(
    (c) => c.cc.toUpperCase() !== country.code.toUpperCase(),
  );
  return (
    <SegmentPage
      page={page}
      h1={salaryH1(role, country)}
      countLine={salaryCountLine(role)}
      lead={salaryLead(role, country)}
      posts={segment.posts}
      beforeList={<SalarySummary stats={segment.stats} role={role} countries={others} />}
      breadcrumbName={salaryH1(role, country).uk}
      path={`/jobs/salary/${role}/${country.code.toLowerCase()}`}
      groups={[
        ...(await linksForSalaryRoles(role)),
        ...articleLinks(["zarplaty-v-it-za-tehnologiyamy", "rynok-it-vakansiy"]),
      ]}
    />
  );
}
