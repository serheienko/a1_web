// app/talents/[slug]/opengraph-image.tsx — og:image поста «шукаю роботу».
// 28.10.2026: та же карточка, что у вакансии (lib/seo/card-og-image.tsx),
// но фото автора в круге.

import { fetchPostById } from "@/lib/a1/posts";
import { parseSlugId } from "@/lib/seo/slug";
import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";
import { buildCardOgImage, cardParamsForPost } from "@/lib/seo/card-og-image";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const id = parseSlugId(slug);
  const post = id ? await fetchPostById(id) : null;

  if (!post || post.kind !== "seeking") {
    return buildOgImage({ eyebrow: "A1 Talents", title: "A1 Talents", subtitle: "jobs.a1appp.com/talents" });
  }

  return buildCardOgImage(cardParamsForPost(post, "jobs.a1appp.com/talents"));
}
