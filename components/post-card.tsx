// components/post-card.tsx
//
// Renders one WebPost. Server component — no client JS shipped for this.
// Title links to the Phase 2 detail page. No avatar/images yet — the media
// proxy lands in Phase 3.

import Link from "next/link";
import type { WebPost } from "@/types/web-post";
import { formatRelativeTime, formatSalary } from "@/lib/format";

export function PostCard({ post }: { post: WebPost }) {
  const locationLabel = post.location ? post.location.display : post.isRemote ? "Удалённо" : "Не указано";
  const salaryLabel = post.salary ? formatSalary(post.salary) : null;
  const href = `/${post.kind === "hiring" ? "jobs" : "talents"}/${post.slug}`;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium text-neutral-900">
          <Link href={href} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <span
          className={
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
            (post.kind === "hiring" ? "bg-[#4F71EB]/10 text-[#4F71EB]" : "bg-[#C830FF]/10 text-[#C830FF]")
          }
        >
          {post.kind === "hiring" ? "Вакансия" : "Специалист"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
        <span>{post.author.name}</span>
        <span aria-hidden="true">·</span>
        <span>{locationLabel}</span>
        {salaryLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span>{salaryLabel}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <span>{formatRelativeTime(post.publishedAt)}</span>
      </div>

      <p className="mt-3 line-clamp-3 text-sm text-neutral-600">{post.contentText}</p>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 6).map((tag) => (
            <span key={tag} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
