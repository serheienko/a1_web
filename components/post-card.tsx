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

import type { ReactNode } from "react";
import Image from "next/image";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import Link from "next/link";
import type { WebPost } from "@/types/web-post";
import { RelativeTime, SalaryLabel, LocationLabel } from "@/components/locale-format";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { T } from "@/components/t";
import { TagLabel } from "@/components/tag-label";
import { MyPostBadge } from "@/components/my-post-badge";
import { PostOwnerMenu } from "@/components/post-owner-menu";
import { profileHref as buildProfileHref } from "@/lib/profile-href";

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
  // 2026-08-30 (Aleksandr, own-profile "Пости" tab showing drafts/
  // scheduled posts alongside published ones): "во вкладке посты,
  // черновики, просто помечаем плашечкой draft... запланированные
  // scheduled... сереньким" -- replaces the colored Jobs/Talent pill
  // below with a small gray one when set, for a post that isn't (yet)
  // actually live. Only components/profile-tabs.tsx passes this; every
  // other caller (the public feeds, load-more) leaves it unset and gets
  // the normal colored badge exactly as before.
  statusBadge,
  // 2026-08-30 (root cause of "з чернеткою і запланованим все одно
  // траблы"): clicking a draft/scheduled card from the profile's own
  // "Пости" tab always 404'd, because the title/content Links below
  // unconditionally point at the PUBLIC post URL (`/jobs/:slug` or
  // `/talents/:slug`), which the backend only serves once a post is
  // actually published -- confirmed live by creating a scheduled test
  // post and clicking into it twice. Only components/profile-tabs.tsx
  // passes this, only for its own ownDrafts cards (draft/scheduled,
  // never published): when set, the title and content areas open the
  // post editor in place instead of navigating to a URL that doesn't
  // exist yet, mirroring components/my-posts-panel.tsx's existing (but
  // unused) setEditing(post) -> <PostEditor mode="edit"> pattern.
  // Avatar/author-name links are untouched -- the author's public
  // profile exists regardless of this post's status.
  onOpen,
  // 2026-08-30 (Aleksandr: "добавь 3 точки для редактирования и удаления
  // прямо в общ ленту в профиле, чтобы було не обов'язково переходити в
  // пост... по-ідеї можна під слово Чернетка, і вакансія") -- optional,
  // so every other caller (public feeds, load-more) is unaffected.
  // components/post-owner-menu.tsx already does its own /api/posts/mine
  // ownership check and renders nothing for a post that isn't the
  // signed-in visitor's own (same self-gating pattern as the MyPostBadge
  // above), so it's safe for BOTH profile-tab call sites to pass this
  // unconditionally: app/u/[username]/page.tsx's published-posts list is
  // shown on every profile (owner's own or someone else's) and the menu
  // simply stays invisible on a stranger's posts; components/profile-
  // tabs.tsx's own ownDrafts list only ever renders on the visitor's own
  // profile in the first place.
  ownerMenu,
}: {
  post: WebPost;
  avatarBlurDataUrl?: string | null;
  statusBadge?: { label: ReactNode; className: string } | null;
  onOpen?: () => void;
  ownerMenu?: { redirectAfterDeleteTo: string };
}) {
  // 2026-08-30, live-testing feedback ("Berlin, Germany - нужна
  // локализация", reported against the profile page but this feed card
  // renders the exact same post.location.display string): see
  // components/locale-format.tsx's LocationLabel for why only the
  // country word is localized, and only into uk.
  const locationLabel = post.location ? (
    <LocationLabel display={post.location.display} country={post.location.country} />
  ) : post.isRemote ? (
    <T uk="Віддалено" en="Remote" ru="Удалённо" de="Remote" es="Remoto" fr="À distance" pl="Zdalnie" ptBR="Remoto" zh="远程" />
  ) : (
    <T uk="Не вказано" en="Not specified" ru="Не указано" de="Nicht angegeben" es="No especificado" fr="Non précisé" pl="Nie podano" ptBR="Não especificado" zh="未指定" />
  );
  // 2026-08-30: used to be `formatSalary(post.salary)` computed once here
  // as a plain string -- now that formatSalary needs a locale (see
  // components/locale-format.tsx's own comment for why), the actual text
  // renders per-locale down in the JSX via <SalaryLabel>. This flag only
  // needs to answer "is there anything to show at all" (independent of
  // locale -- emptiness only depends on min/max being present, matching
  // formatSalary's own `single == null` check), so the "·" separator next
  // to it doesn't render on its own with nothing after it.
  const hasSalary = post.salary != null && (post.salary.min != null || post.salary.max != null);
  const href = `/${post.kind === "hiring" ? "jobs" : "talents"}/${post.slug}`;
  const avatarUrl = post.author.avatarUrl;
  // 2026-08-30: renders through lib/profile-href.ts's own escaping (see
  // that file's header comment) rather than a bare template string --
  // the exact bug it exists to prevent was found via this app's own
  // "View profile" link in components/avatar-menu.tsx, and any post
  // author's username is just as capable of containing a literal "."
  // as that account was.
  const profileHref = post.author.username ? buildProfileHref(post.author.username) : null;

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
      // Rounded-full (circle) here, NOT the rounded-square treatment
      // app/u/[username]/page.tsx uses. Aleksandr, 2026-08-29 (correcting
      // an earlier same-day change of mine): that square fix was for the
      // PROFILE page specifically, not the feed -- "в ленте все коты
      // круглые и с фоном без анимации" (feed cats are round, with the
      // fill, no animation). Feed, onboarding, and profile are three
      // different presentations of the same default cat asset and don't
      // all need to match -- don't re-generalize one context's fix to
      // another without it being confirmed for that context too.
      className="h-14 w-14 rounded-full object-cover"
    />
  );

  return (
    // Card look verified against the real Figma "Feed Preview White" frame
    // via Inspect (2026-08-26), not the Variables panel — see the note in
    // app/globals.css. Real values: bg #FFFFFF (no stroke, separated by
    // shadow alone), corner-radius 20 (rounded-card), 16px padding. Dark
    // mode keeps the pre-existing neutral-900/border treatment since no
    // dark-mode screen has been checked yet.
    //
    // `relative` here is the containing block for the title link's
    // "stretched link" ::after below — Aleksandr, 2026-08-29 (annotated
    // screenshot): everything he circled in green (badge, whitespace,
    // description, tags) should open the post on tap, while avatar/name
    // keep opening the profile exactly as before. Rather than nest a
    // second <a> around the whole card (invalid HTML — no nested
    // anchors, and would swallow the avatar/name clicks), the title
    // Link grows an absolutely-positioned `::after` sized to the full
    // card (`after:inset-0`) via this `relative` anchor. Non-positioned
    // siblings (badge span, description Link, tag spans) sit below it
    // in paint order and so click through to it; the avatar Link and
    // author-name Link are pulled back on top with their own `relative
    // z-10` so they keep going to the profile, not the post.
    <article className="relative flex items-start gap-4 rounded-card bg-card p-4 shadow-sm transition hover:shadow-md dark:border dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
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
        <Link href={profileHref} className="relative z-10 shrink-0 self-start transition-opacity hover:opacity-80">
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
            {/* 2026-08-30, live-testing feedback: "не надо чтобы заголовок
                подчеркивался линией при наведении на пост в других местах,
                линия только при наведении на сам заголовок" -- hover:underline
                used to live on this same button/Link that also carries the
                full-card `after:inset-0` overlay (see this section's own
                comment above for why that overlay exists and why it's sized
                to the whole card, not just this box). A pseudo-element's
                painted area still counts as part of its owner's box for
                :hover purposes, so hovering ANYWHERE on the card was
                triggering :hover -- and therefore the underline -- on this
                element. Moving hover:underline onto a plain nested <span>
                fixes it: that span's own box is just the title text itself
                (unaffected by the sibling-in-paint-order ::after), so it
                only goes underlined when the pointer is actually over the
                title's own glyphs. */}
            {onOpen ? (
              <button
                type="button"
                onClick={onOpen}
                className="text-left cursor-pointer line-clamp-3 after:absolute after:inset-0 after:z-0 after:content-['']"
              >
                <span className="hover:underline">{post.title}</span>
              </button>
            ) : (
              <Link
                href={href}
                className="line-clamp-3 after:absolute after:inset-0 after:z-0 after:content-['']"
              >
                <span className="hover:underline">{post.title}</span>
              </Link>
            )}
          </h2>
          {/* 2026-08-30: badge and the "•••" menu side by side in the
              top-right corner, 10px apart -- Aleksandr first had these
              stacked in a column (see the git history on this comment
              for that reasoning), then live on a draft card: "давай
              попробуем вообще вынести ··· из карточки и поставить 10 px
              рядом с бейджами в правой верхней точке". Plain `<>...</>`
              (no extra wrapper) when ownerMenu is unset, so every other
              caller keeps the exact same DOM/spacing it already had. */}
          {ownerMenu ? (
            <div className="flex shrink-0 flex-row items-center gap-[10px]">
              {statusBadge ? (
                <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + statusBadge.className}>
                  {statusBadge.label}
                </span>
              ) : (
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
              )}
              {/* 2026-08-30, live-testing feedback: "•••" не працює
                  (не вдається обрати "видалити"/"редагувати") on the
                  profile page's own Пости tab -- root-caused by static
                  review (this sandbox has no network access to the real
                  API to reproduce it live), not guessed: z-10 clears
                  this card's own title-link stretch overlay
                  (`after:z-0` on the <h2> Link/button above), but
                  components/post-owner-menu.tsx's own dropdown ALSO
                  renders a full-viewport click-outside backdrop
                  portaled to document.body at z-30 (see that file's
                  header comment). Because this div sets its own
                  non-auto z-index, it becomes the stacking-context root
                  for everything inside it (the popover's z-50 is only
                  ever compared against z-30 from OUTSIDE this div, not
                  the other way around) -- and 10 < 30, so the backdrop
                  paints above the whole bracket, menu included. The
                  menu still visibly opens (the backdrop itself is
                  transparent), but every click on "Редагувати"/
                  "Видалити" actually lands on the invisible backdrop
                  instead and just closes the menu -- exactly the
                  reported symptom. components/settings-menu.tsx hit
                  this identical pattern already (its own comment: "a
                  body-level backdrop above z-40 would out-rank that
                  whole bracket and sit on top of the panel itself,
                  swallowing clicks meant for it") and solves it by
                  keeping its containing bracket (<nav>, z-40) ABOVE its
                  own backdrop (z-30) -- z-40 here for the same reason,
                  not an arbitrary bump. */}
              <PostOwnerMenu
                postId={post.id}
                redirectAfterDeleteTo={ownerMenu.redirectAfterDeleteTo}
                className="relative z-40 shrink-0"
              />
            </div>
          ) : statusBadge ? (
            <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-medium " + statusBadge.className}>
              {statusBadge.label}
            </span>
          ) : (
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
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint dark:text-neutral-400">
          {profileHref ? (
            <Link href={profileHref} className="relative z-10 max-w-[10rem] truncate hover:underline">
              {post.author.name}
            </Link>
          ) : (
            <span className="max-w-[10rem] truncate">{post.author.name}</span>
          )}
          {/* Aleksandr, 2026-08-29: "надо куда-то добавить значок на
              карточке, типа что это мой пост" -- next to the name, not
              on the avatar, since the avatar is exactly what he was
              (reasonably) confused by; see components/my-post-badge.tsx
              for why the two can legitimately show different cats for
              the same account.
              Aleksandr, 2026-08-30: "в наших постах у нас в профиле не
              показывай иконку что это наш пост, нет смысла, только в
              общем фиде" -- pointless on a profile page (every post
              there is either obviously yours -- it's your own profile --
              or, on someone else's profile, never yours at all), so gate
              it on the same `ownerMenu` signal that already tells this
              component "we're being rendered on a profile page" (see
              that prop's own comment below). */}
          {!ownerMenu && <MyPostBadge postId={post.id} />}
          <span aria-hidden="true">·</span>
          <span>{locationLabel}</span>
          {hasSalary && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                <SalaryLabel salary={post.salary!} />
              </span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>
            <RelativeTime date={post.publishedAt} />
          </span>
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
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-left cursor-pointer mt-3 line-clamp-6 text-sm text-ink transition-opacity hover:opacity-80 dark:text-neutral-400"
          >
            {post.contentText}
          </button>
        ) : (
          <Link
            href={href}
            className="mt-3 line-clamp-6 text-sm text-ink transition-opacity hover:opacity-80 dark:text-neutral-400"
          >
            {post.contentText}
          </Link>
        )}

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
