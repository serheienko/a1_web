export const runtime = "nodejs";
export const revalidate = 3600;

// app/jobs/salary/[role]/[country]/page.tsx -- «Зарплати: QA, Польща».
// Разрез основной страницы по стране. Открывается только там, где
// вакансий с названной суммой хватает на честную медиану: см. шапку
// app/jobs/salary/[role]/page.tsx.

import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { RegionNotice } from "@/components/region-notice";
import { LINK_ROLE_IN_COUNTRY, LINK_SALARY_ALL, thinSalaryText } from "@/lib/seo/region-texts";
import { WORLDWIDE_CODE } from "@/lib/seo/countries";
import { SegmentPage } from "@/components/segment-page";
import { SalarySummary } from "@/components/salary-summary";
import { pagedMeta, pageOf } from "@/lib/seo/paged";
import { salaryCountriesForRole, salaryForRoleCountry, salaryPostsForRoleCountry } from "@/lib/a1/salary-index";
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
  if (!role || !country) return {};
  // 25.10.2026: страница есть для любой страны; мало данных -- noindex.
  const thin = !(await salaryForRoleCountry(role, cc));
  const meta = salaryMeta(role, country);
  const url = `${SITE_URL}/jobs/salary/${role}/${cc.toLowerCase()}`;
  return pagedMeta(
    {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: url },
      openGraph: { title: meta.title, description: meta.description, url, type: "website" },
      twitter: { card: "summary_large_image", title: meta.title, description: meta.description },
      ...(thin ? { robots: { index: false, follow: true } } : {}),
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
  if (country.code === WORLDWIDE_CODE) permanentRedirect(`/jobs/salary/${role}`);
  if (cc !== cc.toLowerCase()) permanentRedirect(`/jobs/salary/${role}/${country.code.toLowerCase()}`);
  const segment = await salaryForRoleCountry(role, cc);
  const page = pageOf(await searchParams);
  // 25.10.2026 (Александр: «для Украины показываются не целевые зарплаты...
  // если данных недостаточно -- так и писать "в этом регионе..."»). Вилки
  // нет -- честная плашка и вакансии с суммой, что есть.
  if (!segment) {
    const posts = await salaryPostsForRoleCountry(role, cc);
    const lc = country.code.toLowerCase();
    const roleInCountry = country.code === "UA" ? `/jobs/role/${role}` : `/jobs/role/${role}/${lc}`;
    return (
      <SegmentPage
        page={page}
        h1={salaryH1(role, country)}
        countLine={salaryCountLine(role)}
        lead={salaryLead(role, country)}
        posts={posts}
        beforeList={
          <RegionNotice
            text={thinSalaryText(role, country, posts.length)}
            links={[
              { href: `/jobs/salary/${role}`, label: LINK_SALARY_ALL },
              { href: roleInCountry, label: LINK_ROLE_IN_COUNTRY },
            ]}
          />
        }
        breadcrumbName={salaryH1(role, country).uk}
        path={`/jobs/salary/${role}/${lc}`}
        groups={[...(await linksForSalaryRoles(role))]}
      />
    );
  }
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
