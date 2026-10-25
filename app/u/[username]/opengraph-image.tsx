// app/u/[username]/opengraph-image.tsx -- личная карточка-превью профиля
// (25.10.2026). Что и зачем -- см. lib/seo/profile-og-image.tsx.
//
// Те же данные, что у самой страницы (fetchUserByUsername/
// fetchUserRawByUsername/fetchAuthorFirstPage), поэтому превью никогда не
// показывает то, что человек в профиле скрыл.

import { fetchUserByUsername, fetchUserRawByUsername } from "@/lib/a1/users";
import { fetchAuthorFirstPage } from "@/lib/a1/feed";
import { buildOgImage, OG_IMAGE_SIZE, OG_IMAGE_CONTENT_TYPE } from "@/lib/seo/og-image";
import { buildProfileOgImage } from "@/lib/seo/profile-og-image";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const alt = "A1 profile";

type Props = { params: Promise<{ username: string }> };

export default async function Image({ params }: Props) {
  const { username } = await params;
  const profile = await fetchUserByUsername(username).catch(() => null);
  if (!profile) {
    return buildOgImage({ eyebrow: "A1", title: "A1", subtitle: "jobs.a1appp.com" });
  }

  const raw = await fetchUserRawByUsername(username).catch(() => null);
  const user = raw?.object === "user" ? raw : null; // только для числа вакансий
  const authorPage = user ? await fetchAuthorFirstPage(user._id).catch(() => null) : null;
  const openJobs = authorPage?.hiringTotal || (authorPage?.posts ?? []).filter((post) => post.kind === "hiring").length;

  // Текущее место работы -- компания без даты окончания (первая такая).
  const current = profile.companies.find((c) => c.positionStart && !c.positionEnd) ?? null;

  return buildProfileOgImage({
    username: profile.username,
    fullName: profile.fullName,
    title: profile.profileTitle || profile.expertise || null,
    location: profile.location?.display || null,
    company: current?.name || null,
    languages: profile.languages.map((l) => l.value),
    avatarUrl: profile.avatarUrl,
    skills: [...profile.skills].sort((a, b) => b.level - a.level).map((s) => s.value),
    bio: profile.bio || null,
    voiceIntro: Boolean(profile.voiceIntroUrl),
    openJobs,
  });
}
