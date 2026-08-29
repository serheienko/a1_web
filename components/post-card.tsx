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
//
// Avatar + author name link to the author's public profile
// (app/u/[username]/page.tsx) when there's a username to link to — an
// anonymous author (isAnonymous, no username) has no profile page, so
// falls back to plain, unlinked text/image.

import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import Link from "next/link";
import type { WebPost } from "@/types/web-post";
import { formatRelativeTime, formatSalary } from "@/lib/format";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { T } from "@/components/t";
import { TagLabel } from "@/components/tag-label";

export function PostCard({
  post,
  // Aleksandr, 2026-08-28: "аватары подгружаются не через блюр с разными
  // цветами" — a real per-avatar blur (see lib/avatar-blur.ts), computed
  // server-side by whoever already has this post (the feed pages, or
  // app/api/feed/route.ts for "Load more"). PostCard itself stays a
  // plain presentational component — no data fetching here — so it can
  // keep being rendered directly from components/load-more.tsx, a
  // client component that can't itself await a server-only sharp() call.
  // Falls back to the generic shimmer when there's no precomputed blur
  // (still loading, or generation failed) — never breaks the avatar.
  avatarBlurDataUrl,
}: {
  post: WebPost;
  avatarBlurDataUrl?: string | null;
}) {
  const locationLabel = post.location ? (
    post.location.display
  ) : post.isRemote ? (
    <T uk="Віддалено" en="Remote" ru="Удалённо" de="Remote" es="Remoto" fr="À distance" pl="Zdalnie" ptBR="Remoto" zh="远程" />
  ) : (
    <T uk="Не вказано" en="Not specified" ru="Не указано" de="Nicht angegeben" es="No especificado" fr="Non précisé" pl="Nie podano" ptBR="Não especificado" zh="未指定" />
  );
  const salaryLabel = post.salary ? formatSalary(post.salary) : null;
  const href = `/${post.kind === "hiring" ? "jobs" : "talents"}/${post.slug}`;
  const avatarUrl = post.author.avatarUrl;
  const profileHref = post.author.username ? `/u/${post.author.username}` : null;

  const avatarImg = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      width={56}
      height={56}
      placeholder="blur"
      blurDataURL={avatarBlurDataUrl ?? BLUR_DATA_URL}
      className="h-14 w-14 rounded-full object-cover"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pickDefaultCatAvatar(post.author.username ?? post.author.name ?? post.id)}
      alt=""
      width={56}
      height={56}
      // Rounded square, not a circle -- see app/u/[username]/page.tsx's
      // comment on the same fix, 2026-08-29.
      className="h-14 w-14 rounded-xl object-cover"
    />
  );

  return (
    // Card look verified against the real Figma "Feed Preview White" frame
    // via Inspect (2026-08-26), not the Variables panel — see the note in
    // app/globals.css. Real values: bg #FFFFFF (no stroke, separated by
    // shadow alone), corner-radius 20 (rounded-card), 16px padding. Dark
    // mode keeps the pre-existing neutral-900/border treatment since no
    // dark-mode screen has been checked yet.
    <article className="flex items-start gap-4 rounded-card bg-card p-4 shadow-sm transition hover:shadow-md dark:border dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      {/* 2026-08-28: "нажатие на эту область сейчас открывает профиль...
          мне надо, чтобы оно открывало пост. У нас профиль открывает
          только тап по аватару и тап по имени." — Aleksandr circled a
          tall blank strip below the avatar that was opening the profile
          on tap. Cause: <article> is a flex row with no `items-start`,
          so flexbox's default `align-items: stretch` stretched this
          avatar <Link> to match the taller text column's height (its
          real box was ~250px tall against a 56px-tall visible avatar
          image) — everything below the avatar was silently part of the
          profile link. `items-start` on the row keeps every flex child
          (this Link included) sized to its own content instead. */}
      {profileHref ? (
        <Link href={profileHref} className="shrink-0 self-start transition-opacity hover:opacity-80">
          {avatarImg}
        </Link>
      ) : (
        <div className="shrink-0">{avatarImg}</div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-lg font-medium text-neutral-900 dark:text-neutral-50">
            {/* line-clamp-3, no `block` utility alongside it -- see the
                line-clamp-6 comment below on post.contentText for why:
                line-clamp's own `display: -webkit-box` is what makes
                -webkit-line-clamp actually truncate on real Safari/iOS,
                and a `block` utility on the same element would win the
                compiled `display` property and silently undo that. */}
            <Link href={href} className="line-clamp-3 hover:underline">
              {post.title}
            </Link>
          </h2>
          <span
            className={
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " +
              (post.kind === "hiring"
                ? "bg-accent/10 text-accent dark:bg-accent/20"
                : "bg-[#C830FF]/10 text-[#C830FF] dark:bg-[#C830FF]/20")
            }
          >
            {post.kind === "hiring" ? <T uk="Вакансія" en="Job" ru="Вакансия" de="Stellenanzeige" es="Vacante" fr="Offre d'emploi" pl="Oferta pracy" ptBR="Vaga" zh="职位" /> : <T uk="Фахівець" en="Talent" ru="Специалист" de="Fachkraft" es="Especialista" fr="Spécialiste" pl="Specjalista" ptBR="Especialista" zh="人才" />}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint dark:text-neutral-400">
          {profileHref ? (
            <Link href={profileHref} className="max-w-[10rem] truncate hover:underline">
              {post.author.name}
            </Link>
          ) : (
            <span className="max-w-[10rem] truncate">{post.author.name}</span>
          )}
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

        {/* Aleksandr, 2026-08-27: "подрезать отображаемый текст в фиде
            до 6 строк, остальное показывать через ... при переходе на
            страницу" — 3 lines read as too little to judge a post from
            the feed; full text still only lives on the detail page.
            NO "block" class here — line-clamp-N's own `display:
            -webkit-box` is what makes -webkit-line-clamp actually work
            on real Safari/iOS (confirmed live on Aleksandr's iPhone,
            2026-08-27: it silently no-ops there, though desktop Chrome's
            newer standards-track line-clamp support masked it). A
            `block` utility on the same element wins the display
            property in the compiled CSS and overrides -webkit-box back
            to block, which is exactly what breaks clamping on WebKit. */}
        <Link
          href={href}
          className="mt-3 line-clamp-6 text-sm text-ink transition-opacity hover:opacity-80 dark:text-neutral-400"
        >
          {post.contentText}
        </Link>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 6).map((tag) => (
              <span key={tag} className="rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                <TagLabel text={tag} />
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
