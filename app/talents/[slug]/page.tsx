export const runtime = "nodejs";
export const revalidate = 300;

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
import type { Metadata } from "next";
import { fetchPostById } from "@/lib/a1/posts";
import { slugify, parseSlugId } from "@/lib/seo/slug";
import Image from "next/image";
import { formatRelativeTime, formatSalary, truncateAtWordBoundary } from "@/lib/format";

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

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/talents/${canonicalSlug}` },
    robots: { index: false, follow: true },
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

  const locationLabel = post.location ? post.location.display : post.isRemote ? "Удалённо" : "Не указано";

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <span className="inline-block rounded-full bg-[#C830FF]/10 px-2.5 py-1 text-xs font-medium text-[#C830FF]">
        Специалист
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
