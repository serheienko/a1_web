// app/talents/opengraph-image.tsx — branded og:image for the Talents
// feed. 2026-08-28, same pass as app/opengraph-image.tsx.
//
// The feed itself is noindex (see app/talents/page.tsx's header
// comment — privacy question in PLAN.md's OPEN QUESTIONS), but a good
// og:image still matters here: this page is meant to work as a
// shareable link even while it isn't in Google.

import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "A1 Talents — люди, які шукають роботу або проєкти";

export default async function Image() {
  return buildOgImage({
    eyebrow: "A1 Talents",
    title: "Люди, які шукають роботу або проєкти",
    subtitle: "jobs.a1appp.com/talents",
  });
}
