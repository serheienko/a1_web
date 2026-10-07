// app/premium-preview/page.tsx
//
// Test-environment playground for A1 Premium (2026-10-07). Exists only when
// PREMIUM_PREVIEW=1 is set on the server (the separate test copy of the
// site); on the real site this route is a plain 404.

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PreviewClient } from "./preview-client";

export const metadata: Metadata = {
  title: "A1 Premium — test",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PremiumPreviewPage() {
  if (process.env.PREMIUM_PREVIEW !== "1") notFound();
  return <PreviewClient />;
}
