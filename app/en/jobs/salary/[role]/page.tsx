export const runtime = "nodejs";
export const revalidate = 3600;
// app/en/jobs/salary/[role]/page.tsx -- зарплаты по роли на языке «en» (components/localized-salary.tsx).
import type { Metadata } from "next";
import { LocalizedSalaryRole, salaryRoleMetadata } from "@/components/localized-salary";

type Props = { params: Promise<{ role: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  return salaryRoleMetadata("en", props);
}

export default async function Page(props: Props) {
  return <LocalizedSalaryRole loc="en" {...props} />;
}
