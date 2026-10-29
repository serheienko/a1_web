export const runtime = "nodejs";
export const revalidate = 3600;
// app/en/jobs/salary/[role]/[country]/page.tsx -- зарплаты по роли и стране на языке «en».
import type { Metadata } from "next";
import { LocalizedSalaryCountry, salaryCountryMetadata } from "@/components/localized-salary";

type Props = { params: Promise<{ role: string; country: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  return salaryCountryMetadata("en", props);
}

export default async function Page(props: Props) {
  return <LocalizedSalaryCountry loc="en" {...props} />;
}
