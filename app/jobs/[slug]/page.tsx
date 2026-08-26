export const runtime = "nodejs";
export const revalidate = 300;

// app/jobs/[slug]/page.tsx — one vacancy per page (PLAN.md Phase 2, §3.1's
// "money page for SEO"). Slug format: "<kebab-title>-<postId>".

import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { fetchPostById } from "@/lib/a1/posts";
import { slugify, parseSlugId } from "@/lib/seo/slug";
import { buildJobPostingJsonLd, isJobPostingExpired } from "@/lib/seo/jsonld";
import { formatRelativeTime, formatSalary, truncateAtWordBoundary } from "@/lib/format";

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
    // No og:image yet — post media rendering (and a generated fallback)
    // lands in Phase 3, once /api/media exists.
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
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Эта вакансия больше не активна.
        </div>
      )}

      <span className="inline-block rounded-full bg-[#4F71EB]/10 px-2.5 py-1 text-xs font-medium text-[#4F71EB]">
        Вакансия
      </span>

      <h1 className="mt-3 text-2xl font-semibold text-neutral-900 sm:text-3xl">{post.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
        <span>{post.author.name}</span>
        <span aria-hidden="true">·</span>
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

      <div className="mt-6 whitespace-pre-wrap text-neutral-700">{post.contentText}</div>

      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </main>
  );
}
