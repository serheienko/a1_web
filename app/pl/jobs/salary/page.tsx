export const runtime = "nodejs";
export const revalidate = 3600;
// app/pl/jobs/salary/page.tsx -- хаб зарплат на языке «pl» (components/localized-salary.tsx).
import { LocalizedSalaryHub, salaryHubMetadata } from "@/components/localized-salary";

export const metadata = salaryHubMetadata("pl");

export default async function Page() {
  return <LocalizedSalaryHub loc="pl" />;
}
