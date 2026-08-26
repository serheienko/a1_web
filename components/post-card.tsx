// components/post-card.tsx
//
// Renders one WebPost. Server component — no client JS shipped for this.
// Title links to the Phase 2 detail page. The thumbnail is the author's
// avatar (a small circular crop), not a post photo — full post photo
// galleries render on the detail page only. See mapAuthor() in
// lib/a1/mappers.ts for why avatarUrl is built from author.photos[0]
// (a real MediaDocument via the /api/media proxy) rather than the raw
// author.photo field, which is a pre-signed URL that expires in ~2 minutes.
//
// No avatarUrl (no uploaded photo) falls back to one of the app's own 30
// cat-mascot defaults (lib/avatars.ts) — plain `<img>`, not next/image,
// since it's a fixed public S3 asset outside next.config's remotePatterns
// and not worth adding a whole external host just for 30 tiny images.

import Image from "next/image";
import Link from "next/link";
import type { WebPost } from "@/types/web-post";
import { formatRelativeTime, formatSalary } from "@/lib/format";
import { pickDefaultCatAvatar } from "@/lib/avatars";

export function PostCard({ post }: { post: WebPost }) {
  const locationLabel = post.location ? post.location.display : post.isRemote ? "Удалённо" : "Не указано";
  const salaryLabel = post.salary ? formatSalary(post.salary) : null;
  const href = `/${post.kind === "hiring" ? "jobs" : "talents"}/${post.slug}`;
  const avatarUrl = post.author.avatarUrl;

  return (
    <article className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300">
      <Link href={href} className="shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pickDefaultCatAvatar(post.author.username ?? post.author.name ?? post.id)}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 rounded-full object-cover"
          />
        )}
      </Link>

      <div className="min-w-0 flex-1">
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
      </div>
    </article>
  );
}
