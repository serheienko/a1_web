export const runtime = "nodejs";
export const revalidate = 600; // 09.10.2026: было 60 с, профиль меняется редко

// app/u/[username]/page.tsx — public author profile page.
//
// Added 2026-08-26 per Aleksandr: "Профили показываем. Если люди завели
// себе профиль, значит готовы его показать, у нас скорее всего это
// прописано в полиси" — an explicit, indexable (not noindex) profile page,
// distinct from the still-open Talents-feed privacy question in PLAN.md's
// OPEN QUESTIONS (that one is about a feed of anonymous-by-default post
// browsing; this is a profile the account owner actively created and can
// edit/hide fields on).
//
// phone/email/dob are shown ONLY when lib/a1/user-mappers.ts already
// zeroed them out per the user's own USER_FLAG toggles (lib/a1/
// user-flags.ts) — this page just renders whatever WebProfile gives it,
// it does not re-implement that check. See user-mappers.ts before adding
// any other field that might carry PII.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { fetchUserByUsername, fetchUserRawByUsername } from "@/lib/a1/users";
import { buildEmployerTitle, buildEmployerDescription, buildEmployerPreviewDescription } from "@/lib/seo/profile-meta";
import { fetchAuthorFirstPage } from "@/lib/a1/feed";
import { LoadMore } from "@/components/load-more";
import { PostCard } from "@/components/post-card";
import {
  fetchCompanyCategories,
  fetchHobbyLabels,
  fetchWorkInterests,
  fetchWorkStylePreferences,
  WORK_STYLE_DATASET_KEYS,
} from "@/lib/a1/datasets";
import { profileHref } from "@/lib/profile-href";
import { generateAvatarBlurMeta } from "@/lib/avatar-blur";
import { T, LOCALES, type Locale } from "@/components/t";
import { ProfileView, type WorkStyleChip } from "@/components/profile-view";
import { translateWorkStyleOption, translateHobbyItem, translateWorkInterest } from "@/lib/pill-translations";
import { WORK_STYLE_PREFERENCE_SECTIONS } from "@/components/work-style-labels";
// 2026-09-02: WAS briefly routed through next/dynamic() here to try to
// dodge a suspected chunk-loading race (see PLAN.md) -- reverted, that
// attempt produced a DIFFERENT broken RSC payload (a stray "$L40"
// reference pointing at an unrelated element, not at this component)
// rather than fixing anything, so it was a regression, not a fix. Back
// to the plain import while the real cause is still being tracked down
// with the user directly (asked them to run `npm run dev` locally and
// share the actual browser error, since remote testing can't see one).
import { fetchBookCoverUrl, fetchMovieCoverUrl, fetchGameCoverUrl } from "@/lib/covers";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) return {};

  // 2026-09-15: у работодателя заголовок и описание другие -- см.
  // lib/seo/profile-meta.ts. «Работодатель» здесь = у профиля есть хотя
  // бы одна живая вакансия; отдельного флага компании в профиле нет.
  // Оба вызова ниже обёрнуты в cache(), поэтому сама страница ходит за
  // теми же данными бесплатно.
  const rawProfile = await fetchUserRawByUsername(username);
  // 14.10.2026: первая страница постов + настоящее общее число (раньше -- 12 постов и счёт по ним).
  const authorPage = rawProfile?.object === "user" ? await fetchAuthorFirstPage(rawProfile._id) : null;
  const authorPosts = authorPage?.posts ?? [];
  const openJobs = authorPage?.hiringTotal || authorPosts.filter((post) => post.kind === "hiring").length;

  const canonical = `${SITE_URL}${profileHref(profile.username)}`;

  if (openJobs > 0) {
    const employerDescription = buildEmployerDescription(profile.fullName, openJobs, profile.profileTitle || profile.bio);
    const previewDescription = buildEmployerPreviewDescription(openJobs, profile.profileTitle || profile.bio);
    return {
      title: buildEmployerTitle(profile.fullName),
      description: employerDescription,
      alternates: { canonical },
      openGraph: { title: profile.fullName, description: previewDescription, type: "profile", url: canonical },
      // 25.10.2026: большая карточка-превью (opengraph-image.tsx рядом) и в X.
      twitter: { card: "summary_large_image", title: profile.fullName, description: previewDescription },
    };
  }

  const description =
    profile.profileTitle || profile.bio.slice(0, 155) || `Профиль ${profile.fullName} в A1.`;

  return {
    title: `${profile.fullName} | A1`,
    description,
    alternates: { canonical },
    openGraph: { title: profile.fullName, description, type: "profile", url: canonical },
    twitter: { card: "summary_large_image", title: profile.fullName, description },
  };
}



// Aleksandr, 2026-08-27 (mobile app video, "Профиль отображен только
// частично") + Figma review (node-id=24338-3649, the edit-profile form's
// "Preferences" field): 14 work-style categories, each a dataset lookup.
// WORK_STYLE_DATASET_KEYS (lib/a1/datasets.ts) is the single source of
// truth for the profile-field -> dataset-field name mapping (they mostly
// match except workloadAndTaskDelegation/workloadTaskDelegation) — this
// table only adds the uk/ru section labels on top of it.
// Aleksandr, 2026-08-27 follow-up: occupation isn't free text -- the
// openapi spec (Resource.User.Occupation) pins it to exactly these 4
// values. "none" means the user hasn't set one, so it's intentionally
// left out of this table (falsy lookup -> row doesn't render at all,
// same as before).
//
// 2026-08-29: the label table itself moved to components/
// occupation-labels.ts so the onboarding step's client-side form
// (app/onboarding/profile/profile-setup-form.tsx, PLAN.md §6.15) could
// import just the labels without pulling this file's server-only data
// fetching (lib/a1/users, lib/a1/datasets) into a client bundle.
//
// 2026-08-30: this section's own 14-category label table got the same
// treatment, into components/work-style-labels.ts — the new full
// profile editor (components/profile-editor.tsx) needs these exact
// labels too, and is a client component for the same reason
// profile-setup-form.tsx is.

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) notFound();

  // Aleksandr, 2026-08-30: "могли... нажать на наши посты и чтобы наши
  // посты отображались такими типа карточками" -- reuses the exact same
  // components/post-card.tsx the feed pages render with, on ANY profile
  // (this page has never been "my profile" vs "someone else's profile"
  // -- it's the same route either way). fetchUserRawByUsername is a
  // second call to users.getByUsername (React's cache() dedups this
  // against fetchUserByUsername above within the same request -- same
  // trick lib/a1/posts.ts's own header comment documents), needed only
  // for the raw `_id` posts.search's `author` filter wants; the
  // UserHidden variant carries no id at all, so those profiles (already
  // 404'd by the !profile check above in the normal case, but
  // fetchUserByUsername and fetchUserRawByUsername can in principle
  // disagree on nothing here since both parse the same response) just
  // get an empty post list.
  const rawProfile = await fetchUserRawByUsername(username);
  const authorPage = rawProfile?.object === "user" ? await fetchAuthorFirstPage(rawProfile._id) : null;
  const authorPosts = authorPage?.posts ?? [];
  // Тот же признак работодателя, что и в generateMetadata выше.
  const openJobs = authorPage?.hiringTotal || authorPosts.filter((post) => post.kind === "hiring").length;

  // Real per-avatar blur (lib/avatar-blur.ts) instead of the generic
  // shared shimmer — same fix as components/post-card.tsx's feed
  // avatars ("аватары подгружаются не через блюр с разными цветами").
  // The full-size viewer needs the photo's real pixel size on top of
  // the blur itself, so that its placeholder can reserve exactly the
  // box the photo will land in (see components/profile-photo-viewer
  // .tsx) -- same single cached fetch either way.
  const avatarBlur = await generateAvatarBlurMeta(profile.avatarUrl);
  const avatarBlurDataUrl = avatarBlur?.blurDataUrl ?? null;

  const locationLabel = profile.location ? profile.location.display : null;

  // 2026-08-27: only fetched when at least one company actually carries a
  // category id — most profiles won't, and this is an extra network
  // round-trip to a dataset endpoint nothing else on this page needs.
  const companyCategoryIds = profile.companies.map((c) => c.category).filter((c) => c != null);
  const companyCategories = companyCategoryIds.length > 0 ? await fetchCompanyCategories() : [];
  const companyCategoryLabel = (id: number | null) =>
    id == null ? null : (companyCategories.find((c) => c.value === id)?.text ?? null);

  // Same lazy-dataset pattern as companyCategories above — only pay for
  // the dataset round-trip when this profile actually has something to
  // resolve.
  const hobbyLabels = profile.hobbies.length > 0 ? await fetchHobbyLabels() : null;

  const workInterestOptions = profile.workInterests.length > 0 ? await fetchWorkInterests() : [];
  const workInterestLabel = (id: number) => workInterestOptions.find((c) => c.value === id)?.text ?? null;

  const hasWorkStylePreferences = Object.values(profile.workStylePreferences).some((ids) => ids.length > 0);
  const workStyleDataset = hasWorkStylePreferences ? await fetchWorkStylePreferences() : null;

  // Best-effort third-party cover art for the Favorites tiles below — see
  // lib/covers.ts. Fetched in parallel (not gated behind the section's own
  // "has any favorites" check, since Promise.all over an empty array is
  // free) so three separate waterfalls don't stack up sequentially.
  const [bookCovers, movieCovers, gameCovers] = await Promise.all([
    Promise.all(profile.favoriteBooks.map((b) => fetchBookCoverUrl(b.title, b.author))),
    Promise.all(profile.favoriteMovies.map((m) => fetchMovieCoverUrl(m.title))),
    Promise.all(profile.favoriteGames.map((g) => fetchGameCoverUrl(g.title))),
  ]);


  // 24.10.2026: разметка уехала в components/profile-view.tsx (тот же вид
  // показывает пример профиля на /spivbesida/kandydatu). Здесь -- только
  // данные: подписи хобби/интересов/стиля работы на 9 языках считаются тут,
  // ровно так же, как раньше считались прямо в разметке.
  const hobbyItems =
    hobbyLabels && profile.hobbies.length > 0
      ? profile.hobbies
          .map((id) => hobbyLabels.get(id))
          .filter((v): v is { group: string; text: string } => Boolean(v))
          .map(
            ({ group, text }) =>
              Object.fromEntries(
                LOCALES.map((locale) => [locale, translateHobbyItem(group, text, locale)]),
              ) as Record<Locale, string>,
          )
      : null;

  const workInterestItems = profile.workInterests
    .map((id) => workInterestLabel(id))
    .filter((v): v is string => Boolean(v))
    .map(
      (text) =>
        Object.fromEntries(
          LOCALES.map((locale) => [locale, translateWorkInterest(text, locale)]),
        ) as Record<Locale, string>,
    );

  const workStyleChips: WorkStyleChip[] | null = workStyleDataset
    ? WORK_STYLE_PREFERENCE_SECTIONS.flatMap(({ key, ...section }) => {
        const ids = profile.workStylePreferences[key];
        if (ids.length === 0) return [];
        const datasetKey = WORK_STYLE_DATASET_KEYS[key];
        const options = workStyleDataset[datasetKey];
        const labels = ids
          .map((id) => options.find((o) => o.value === id)?.text ?? null)
          .filter((v): v is string => Boolean(v));
        if (labels.length === 0) return [];
        // Перевод значений -- см. lib/pill-translations.ts translateWorkStyleOption.
        const values = Object.fromEntries(
          LOCALES.map((locale) => [
            locale,
            labels.map((label) => translateWorkStyleOption(datasetKey, label, locale)).join(", "),
          ]),
        ) as Record<Locale, string>;
        return [{ key, section: section as Record<Locale, string>, values }];
      })
    : null;

  const posts = (
    <>
      {authorPosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* 2026-09-03 (Aleksandr, screenshot of this exact card: "тут
              остался баг с белой подгрузкой, сделай как и везде через
              блюр") -- this used to pass no avatarBlurDataUrl at all
              ("PostCard already degrades cleanly to the generic
              shimmer without one" -- turned out not true in practice,
              it read as a flat white flash instead), reasoned as an
              acceptable cost-saver since it would've meant one extra
              generateAvatarBlurDataUrl() call per post. That reasoning
              missed that every post on THIS list shares the exact same
              author (this profile), so there's nothing extra to
              compute -- avatarBlurDataUrl right above (the profile
              header's own blur) already IS every one of these posts'
              author blur too. */}
          {authorPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              avatarBlurDataUrl={avatarBlurDataUrl}
              // 2026-08-30: safe to pass on every profile, not just the
              // visitor's own -- see post-card.tsx's own comment on
              // ownerMenu for why PostOwnerMenu self-gates to nothing on
              // someone else's post.
              ownerMenu={{ redirectAfterDeleteTo: profileHref(profile.username) }}
            />
          ))}
          {/* 14.10.2026: остальные посты догружаются при прокрутке, по 30 (fetchAuthorPage). */}
          {authorPage?.hasMore && rawProfile?.object === "user" && (
            <LoadMore kind="hiring" author={rawProfile._id} initialCursor={authorPage.next} initialHasMore={authorPage.hasMore} />
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Поки що немає опублікованих дописів" en="No published posts yet" ru="Пока нет опубликованных публикаций" de="Noch keine veröffentlichten Beiträge" es="Aún no hay publicaciones" fr="Aucune publication pour le moment" pl="Brak opublikowanych postów" ptBR="Ainda não há publicações" zh="暂无已发布的帖子" />
        </p>
      )}
    </>
  );

  return (
    <ProfileView
      profile={profile}
      routeUsername={username}
      raw={
        rawProfile?.object === "user"
          ? {
              id: rawProfile._id,
              unclaimed: rawProfile.unclaimed === true,
              external: rawProfile.external === true,
              githubVerifiedLogin: rawProfile.githubVerifiedLogin ?? null,
              dribbbleVerified: rawProfile.dribbbleVerified ?? null,
              stackoverflowVerifiedId: rawProfile.stackoverflowVerifiedId ?? null,
            }
          : null
      }
      avatarBlur={avatarBlur}
      companyCategoryLabel={companyCategoryLabel}
      hobbyItems={hobbyItems}
      workInterestItems={workInterestItems}
      workStyleChips={workStyleChips}
      covers={{ books: bookCovers, movies: movieCovers, games: gameCovers }}
      openJobs={openJobs}
      openJobsList={authorPosts.filter((post) => post.kind === "hiring").map((post) => ({ slug: post.slug, title: post.title }))}
      posts={posts}
      postsCount={Math.max(authorPage?.total ?? 0, authorPosts.length)}
    />
  );
}
