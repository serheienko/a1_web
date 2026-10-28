// app/jobs/[slug]/opengraph-image.tsx — per-vacancy og:image.
//
// 28.10.2026: карточка как у профиля (lib/seo/card-og-image.tsx):
// логотип компании, название, зарплата, город, удалённо, теги. Раньше
// здесь было фото поста или фиолетовый фон с названием.

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

  if (!post || post.kind !== "hiring") {
    // Удалённый/просроченный пост: ссылка живёт дольше поста, картинка нужна всё равно.
    return buildOgImage({ eyebrow: "A1 Jobs", title: "A1 Jobs", subtitle: "jobs.a1appp.com" });
  }

  return buildCardOgImage(cardParamsForPost(post, "jobs.a1appp.com"));
}
