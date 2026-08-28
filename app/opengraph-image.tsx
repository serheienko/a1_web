// app/opengraph-image.tsx — branded og:image for the Jobs feed (/), site
// root. 2026-08-28, ships alongside the Ukrainian SEO metadata in
// app/page.tsx — the site had no og:image at all before this.
//
// File-convention special file: Next picks this up automatically for
// every page under app/ that doesn't have its own more specific
// opengraph-image (app/jobs/[slug]/, app/talents/, app/talents/[slug]/
// each define their own, closer to the leaf).

import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "A1 Jobs — вакансії від компаній та приватних осіб";

export default async function Image() {
  return buildOgImage({
    eyebrow: "A1 Jobs",
    title: "Вакансії від компаній та приватних осіб",
    subtitle: "jobs.a1appp.com",
  });
}
