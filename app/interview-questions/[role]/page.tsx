export const runtime = "nodejs";
export const revalidate = 3600;

// 16.10.2026: «Питання на співбесіді <професія>» (lib/interview).
import type { Metadata } from "next";
import { interviewRoleMetadata, renderInterviewRole } from "@/lib/interview/route";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return interviewRoleMetadata("en", (await params).role);
}

export default async function Page({ params }: Props) {
  return renderInterviewRole("en", (await params).role);
}
