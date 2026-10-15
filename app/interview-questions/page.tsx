export const runtime = "nodejs";
export const revalidate = 3600;

// 16.10.2026: «Питання на співбесіді» -- список профессий (lib/interview).
import type { Metadata } from "next";
import { interviewHubMetadata, renderInterviewHub } from "@/lib/interview/route";

export const metadata: Metadata = interviewHubMetadata("en");

export default function Page() {
  return renderInterviewHub("en");
}
