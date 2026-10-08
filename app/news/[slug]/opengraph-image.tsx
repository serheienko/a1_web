// app/news/[slug]/opengraph-image.tsx -- картинка для соцсетей и поиска у каждой новости.

import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";
import { findNews } from "@/lib/news/articles";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "A1 Jobs IT news";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = findNews((await params).slug);
  return buildOgImage({
    eyebrow: article ? `A1 Jobs · ${article.kicker}` : "A1 Jobs",
    title: article?.h1 ?? "A1 Jobs",
    subtitle: "jobs.a1appp.com/news",
  });
}
