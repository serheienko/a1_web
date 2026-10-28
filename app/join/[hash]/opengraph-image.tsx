// app/join/[hash]/opengraph-image.tsx — превью ссылки-приглашения в группу.
// 28.10.2026: фото группы, название, число участников (раньше -- общая
// картинка сайта). Та же карточка, что у вакансий (lib/seo/card-og-image.tsx).

import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";
import { buildCardOgImage } from "@/lib/seo/card-og-image";
import { fetchInvitePreview } from "@/lib/seo/group-invite";
import { pickDefaultCatAvatar } from "@/lib/avatars";

export const runtime = "nodejs";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type Props = { params: Promise<{ hash: string }> };

export default async function Image({ params }: Props) {
  const { hash } = await params;
  const g = await fetchInvitePreview(decodeURIComponent(hash));
  if (!g) return buildOgImage({ eyebrow: "A1", title: "A1", subtitle: "a1appp.com" });
  return buildCardOgImage({
    handle: "a1appp.com",
    eyebrow: null,
    title: g.title,
    pictureUrl: g.photo ?? pickDefaultCatAvatar(g.chatId ?? hash),
    pictureShape: "circle",
    pictureName: g.title,
    facts: [{ kind: "people", text: String(g.memberCount) }],
    chips: [],
    description: g.description,
  });
}
