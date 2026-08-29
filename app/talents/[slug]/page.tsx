export const runtime = "nodejs";
export const revalidate = 60;

// app/talents/[slug]/page.tsx — one specialist per page (PLAN.md Phase 2).
//
// Deliberately no JSON-LD here. PLAN.md §3.3: a candidate is a person, not
// a job — "Use ProfilePage + Person there, or no structured data at all."
// Given the still-open Talents privacy question (a real name/photo/what-
// they're-looking-for becoming a permanent, Google-findable page), this
// goes further than the minimum and skips Person markup too, on top of
// noindex below — recommendation (b) in PLAN.md's OPEN QUESTIONS. Revisit
// once the founder decides (a)/(b)/(c)/(d).

import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchPostById } from "@/lib/a1/posts";
import { slugify, parseSlugId } from "@/lib/seo/slug";
import Image from "next/image";
import { PostImages } from "@/components/post-images";
import { formatRelativeTime, formatSalary, truncateAtWordBoundary } from "@/lib/format";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { generateImageBlurDataUrl } from "@/lib/avatar-blur";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { T } from "@/components/t";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }> };

async function loadTalent(slug: string) {
  const id = parseSlugId(slug);
  if (!id) return null;
  const post = await fetchPostById(id);
  if (!post || post.kind !== "seeking") return null;
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadTalent(slug);
  if (!post) return {};

  const canonicalSlug = slugify(post.title, post.id);
  const description = post.contentText.replace(/\s+/g, " ").trim().slice(0, 155);
  const title = truncateAtWordBoundary(`${post.title} — ${post.author.name} | A1 Talents`, 60);

  const canonicalUrl = `${SITE_URL}/talents/${canonicalSlug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: { index: false, follow: true },
    // Still noindex (see file header), but a real og:image matters more
    // here, not less — PLAN.md's OPEN QUESTIONS recommends this page work
    // as a shareable link, which is exactly when a link preview shows.
    // Image comes from the sibling opengraph-image.tsx file convention.
    openGraph: { title: post.title, description, type: "profile", url: canonicalUrl },
    twitter: { card: "summary_large_image", title: post.title, description },
  };
}

export default async function TalentDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = parseSlugId(slug);
  if (!id) notFound();

  const post = await fetchPostById(id);
  if (!post || post.kind !== "seeking") notFound();

  const canonicalSlug = slugify(post.title, post.id);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/talents/${canonicalSlug}`);
  }

  // 2026-08-28: real per-image blur-up (lib/avatar-blur.ts), same as the
  // feed already does for avatars — see components/post-images.tsx's own
  // comment for why this has to be computed here (a server component)
  // rather than inside that client component. Both run concurrently, not
  // one after the other.
  const [authorAvatarBlurDataUrl, postImages] = await Promise.all([
    generateImageBlurDataUrl(post.author.avatarUrl),
    Promise.all(post.images.map(async (img) => ({ ...img, blurDataUrl: await generateImageBlurDataUrl(img.url) }))),
  ]);

  const locationLabel = post.location ? (
    post.location.display
  ) : post.isRemote ? (
    <T uk="Віддалено" en="Remote" ru="Удалённо" de="Remote" es="Remoto" fr="À distance" pl="Zdalnie" ptBR="Remoto" zh="远程" />
  ) : (
    <T uk="Не вказано" en="Not specified" ru="Не указано" de="Nicht angegeben" es="No especificado" fr="Non précisé" pl="Nie podano" ptBR="Não especificado" zh="未指定" />
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <span className="inline-block rounded-full bg-[#C830FF]/10 px-2.5 py-1 text-xs font-medium text-[#C830FF] dark:bg-[#C830FF]/20">
        <T uk="Фахівець" en="Talent" ru="Специалист" de="Fachkraft" es="Especialista" fr="Spécialiste" pl="Specjalista" ptBR="Especialista" zh="人才" />
      </span>

      <h1 className="mt-3 text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">{post.title}</h1>

      {/* Avatar header (Aleksandr, 2026-08-26: "добавь аватар в отображении
          поста") — same photo-or-cat-fallback pipeline as components/post-card.tsx,
          just laid out byline-style (avatar + name, meta line underneath)
          instead of the card's single-row version. */}
      <div className="mt-4 flex items-center gap-3">
        {(() => {
          const avatarImg = post.author.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt=""
              width={48}
              height={48}
              placeholder="blur"
              blurDataURL={authorAvatarBlurDataUrl ?? BLUR_DATA_URL}
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pickDefaultCatAvatar(post.author.username ?? post.author.name ?? post.id)}
              alt=""
              width={48}
              height={48}
              // Rounded square, not a circle -- see app/u/[username]/
              // page.tsx's comment on the same fix, 2026-08-29.
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          );
          return post.author.username ? (
            <Link href={`/u/${post.author.username}`} className="shrink-0 transition-opacity hover:opacity-80">
              {avatarImg}
            </Link>
          ) : (
            <div className="shrink-0">{avatarImg}</div>
          );
        })()}
        <div className="min-w-0">
          {post.author.username ? (
            <Link href={`/u/${post.author.username}`} className="block truncate font-medium text-neutral-900 hover:underline dark:text-neutral-50">
              {post.author.name}
            </Link>
          ) : (
            <span className="block truncate font-medium text-neutral-900 dark:text-neutral-50">{post.author.name}</span>
          )}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint dark:text-neutral-400">
            <span>{locationLabel}</span>
            {post.salary && (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatSalary(post.salary)}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{formatRelativeTime(post.publishedAt)}</span>
          </div>
        </div>
      </div>

      <PostImages images={postImages} />

      {/* Aleksandr, 2026-08-27: "поднять теги наверх, перед основным
          текстом" — tags used to sit after contentText; moved above it
          so they read as context for the post, not an afterthought.
          Also switched to fully-rounded pills (~30px radius) here.
          2026-08-28: "сделай эти теги [белым] 100%" — bg-neutral-100
          barely showed up against this page's own light-gray background;
          switched to a solid white pill with a hairline border, matching
          components/post-card.tsx's feed-card tags exactly. */}
      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{post.contentText}</div>
    </main>
  );
}
