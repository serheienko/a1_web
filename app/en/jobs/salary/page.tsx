export const runtime = "nodejs";
export const revalidate = 3600;
// app/en/jobs/salary/page.tsx -- хаб зарплат на языке «en» (components/localized-salary.tsx).
import { LocalizedSalaryHub, salaryHubMetadata } from "@/components/localized-salary";

export const metadata = salaryHubMetadata("en");

export default async function Page() {
  return <LocalizedSalaryHub loc="en" />;
}
