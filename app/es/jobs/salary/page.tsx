export const runtime = "nodejs";
export const revalidate = 3600;
// app/es/jobs/salary/page.tsx -- хаб зарплат на языке «es» (components/localized-salary.tsx).
import { LocalizedSalaryHub, salaryHubMetadata } from "@/components/localized-salary";

export const metadata = salaryHubMetadata("es");

export default async function Page() {
  return <LocalizedSalaryHub loc="es" />;
}
