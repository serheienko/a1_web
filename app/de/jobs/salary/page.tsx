export const runtime = "nodejs";
export const revalidate = 3600;
// app/de/jobs/salary/page.tsx -- хаб зарплат на языке «de» (components/localized-salary.tsx).
import { LocalizedSalaryHub, salaryHubMetadata } from "@/components/localized-salary";

export const metadata = salaryHubMetadata("de");

export default async function Page() {
  return <LocalizedSalaryHub loc="de" />;
}
