// app/cv-builder/opengraph-image.tsx -- превью ссылки, украинская версия (28.10.2026).
import { cvLandingOg } from "@/lib/cv-landing/og";
import { OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default function Image() {
  return cvLandingOg("uk");
}
