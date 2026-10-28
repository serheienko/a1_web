// app/cv-builder/[lang]/opengraph-image.tsx -- превью ссылки на остальных языках (28.10.2026).
import { cvLandingOg } from "@/lib/cv-landing/og";
import { cvLandingLangFromSegment } from "@/lib/cv-landing/registry";
import { OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  return cvLandingOg(cvLandingLangFromSegment((await params).lang) ?? "en");
}
