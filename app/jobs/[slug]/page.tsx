export const runtime = "nodejs";
export const revalidate = 60;

// app/jobs/[slug]/page.tsx — one vacancy per page (PLAN.md Phase 2, §3.1's
// "money page for SEO"). Slug format: "<kebab-title>-<postId>".

import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { fetchPostById } from "@/lib/a1/posts";
import { slugify, parseSlugId } from "@/lib/seo/slug";
import { buildJobPostingJsonLd, isJobPostingExpired } from "@/lib/seo/jsonld";
import Image from "next/image";
import { formatRelativeTime, formatSalary, truncateAtWordBoundary } from "@/lib/format";
import { pickDefaultCatAvatar } from "@/lib/avatars";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ slug: string }> };

async function loadJob(slug: string) {
  const id = parseSlugId(slug);
  if (!id) return null;
  const post = await fetchPostById(id);
  if (!post || post.kind !== "hiring") return null;
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadJob(slug);
  if (!post) return {};

  const canonicalSlug = slugify(post.title, post.id);
  const canonicalUrl = `${SITE_URL}/jobs/${canonicalSlug}`;
  const description = post.contentText.replace(/\s+/g, " ").trim().slice(0, 155);
  const title = truncateAtWordBoundary(`${post.title} — ${post.author.name} | A1 Jobs`, 60);
  const expired = isJobPostingExpired(post);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: expired ? { index: false, follow: true } : undefined,
    openGraph: { title: post.title, description, type: "article", url: canonicalUrl },
    // No og:image yet — a generated fallback (opengraph-image.tsx) is the
    // remaining Phase 3 piece; post photos now render in the page body above.
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const id = parseSlugId(slug);
  if (!id) notFound();

  const post = await fetchPostById(id);
  // A deleted post (posts.get's PostEmpty variant) or a legacy type both
  // fail here. PLAN.md §3.4 wants a hard 410 for "deleted"; the App
  // Router's notFound() only gives us a 404. Google's job-removal guidance
  // treats 404 and 410 as equivalent signals that a posting is gone, so
  // this is a deliberate simplification, not a shortcut — revisit with a
  // custom Route Handler if the founder wants literal 410 semantics.
  if (!post || post.kind !== "hiring") notFound();

  const canonicalSlug = slugify(post.title, post.id);
  if (slug !== canonicalSlug) {
    permanentRedirect(`/jobs/${canonicalSlug}`);
  }

  const expired = isJobPostingExpired(post);
  const jsonLd = expired ? null : buildJobPostingJsonLd(post);
  const locationLabel = post.location ? post.location.display : post.isRemote ? "Удалённо" : "Не указано";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      {jsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      {expired && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Эта вакансия больше не активна.
        </div>
      )}

      <span className="inline-block rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent dark:bg-accent/20">
        Вакансия
      </span>

      <h1 className="mt-3 text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-50">{post.title}</h1>

      {/* Avatar header (Aleksandr, 2026-08-26: "добавь аватар в отображении
          поста") — same photo-or-cat-fallback pipeline as components/post-card.tsx,
          just laid out byline-style (avatar + name, meta line underneath)
          instead of the card's single-row version. */}
      <div className="mt-4 flex items-center gap-3">
        {post.author.avatarUrl ? (
          <Image
            src={post.author.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pickDefaultCatAvatar(post.author.username ?? post.author.name ?? post.id)}
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          {post.author.username ? (
            <Link href={`/u/${post.author.username}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-50">
              {post.author.name}
            </Link>
          ) : (
            <span className="font-medium text-neutral-900 dark:text-neutral-50">{post.author.name}</span>
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

      {post.images.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {post.images
            .filter((img) => img.width > 0 && img.height > 0)
            .map((img, i) => (
              <Image
                key={img.url}
                src={img.url}
                alt=""
                width={img.width}
                height={img.height}
                sizes="(min-width: 672px) 672px, 100vw"
                priority={i === 0}
                className="w-full rounded-lg"
              />
            ))}
        </div>
      )}

      <div className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{post.contentText}</div>

      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {tag}
            </span>
          ))}
        </div>
      )}
    </main>
  );
}
