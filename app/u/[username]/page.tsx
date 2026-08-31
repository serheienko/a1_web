export const runtime = "nodejs";
export const revalidate = 60;

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

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { fetchUserByUsername, fetchUserRawByUsername } from "@/lib/a1/users";
import { fetchPostsByAuthor } from "@/lib/a1/feed";
import { PostCard } from "@/components/post-card";
import { ProfileTabs } from "@/components/profile-tabs";
import {
  fetchCompanyCategories,
  fetchHobbyLabels,
  fetchWorkInterests,
  fetchWorkStylePreferences,
  WORK_STYLE_DATASET_KEYS,
} from "@/lib/a1/datasets";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { profileHref } from "@/lib/profile-href";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { formatLanguageName } from "@/lib/format";
import { LocationLabel } from "@/components/locale-format";
import { T, type Locale } from "@/components/t";
import { VoiceIntroProvider } from "@/components/voice-intro-context";
import { VoiceIntroRing } from "@/components/voice-intro-ring";
import { VoiceIntroPlayer } from "@/components/voice-intro-player";
import { OccupationIcon } from "@/components/occupation-icon";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
import { WORK_STYLE_PREFERENCE_SECTIONS } from "@/components/work-style-labels";
import { EditProfileButton } from "@/components/edit-profile-button";
import { AddContactButton } from "@/components/add-contact-button";
import { AvatarEditButton } from "@/components/avatar-edit-button";
import { MarqueeName } from "@/components/marquee-name";
import { fetchBookCoverUrl, fetchMovieCoverUrl, fetchGameCoverUrl, type CoverImage } from "@/lib/covers";

const SITE_URL = "https://jobs.a1appp.com";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) return {};

  const description =
    profile.profileTitle || profile.bio.slice(0, 155) || `Профиль ${profile.fullName} в A1.`;

  return {
    title: `${profile.fullName} | A1`,
    description,
    alternates: { canonical: `${SITE_URL}${profileHref(profile.username)}` },
    openGraph: { title: profile.fullName, description, type: "profile", url: `${SITE_URL}${profileHref(profile.username)}` },
  };
}

function levelBar(level: number, max: number) {
  const pct = Math.max(0, Math.min(100, (level / max) * 100));
  return (
    <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Same white pill used for profile.links (Aleksandr, 2026-08-27: "Сделай
// заливку этих штук, табов полностью FFFFFF 100%") — reused here so
// hobbies/work-interests/work-style tags read as the same visual
// language instead of introducing a second tag style.
function pillList(items: string[]) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full bg-white px-3 py-1.5 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// Aleksandr, 2026-08-28: "УЛЮБЛЕНЕ давай отобразим таким UI как вприложении?
// Типа такие квадратные картинки (такие же как в апке)" — square cover
// tile matching the app's own Books/Movies/Games picker (Figma node
// reviewed 2026-08-28). cover comes from lib/covers.ts's best-effort
// third-party lookups; null falls back to a plain tinted square.
//
// 2026-08-28 follow-up: titles moved below the tile instead of overlaid
// on it (bottom-anchored + gradient scrim), because a long single-word
// title like "Bloodborne" either overflowed the tile or looked cramped
// wrapping over the artwork ("с длинными названиями как-то не оч
// выглядит... может обложки увеличить, или ставить название под
// ними?"). Caption-below-cover, App-Store/Music-grid style: the full
// cover shows uncropped by a scrim, and the title gets its own row to
// wrap onto (line-clamp-2 as a safety net for the rare very long book
// title) instead of fighting the image for contrast. Covers render
// through next/image (capped quality so Vercel's optimizer keeps each
// file well under the ~100-150KB target) with a real per-image blurred
// placeholder from lib/covers.ts, generated from the actual cover's own
// pixels via sharp — not the generic shared shimmer used elsewhere (see
// lib/blur-placeholder.ts).
function favoriteTile(title: string, subtitle: string | null, cover: CoverImage | null, itemKey: string) {
  return (
    <div key={itemKey} className="flex flex-col gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
        {cover && (
          <Image
            src={cover.url}
            alt=""
            fill
            quality={60}
            sizes="(min-width: 640px) 200px, 33vw"
            className="object-cover"
            placeholder={cover.blurDataUrl ? "blur" : "empty"}
            blurDataURL={cover.blurDataUrl ?? undefined}
          />
        )}
      </div>
      <div>
        <div className="line-clamp-2 text-sm font-medium leading-snug text-neutral-800 dark:text-neutral-200">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
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
  const authorPosts = rawProfile?.object === "user" ? await fetchPostsByAuthor(rawProfile._id) : [];

  // Real per-avatar blur (lib/avatar-blur.ts) instead of the generic
  // shared shimmer — same fix as components/post-card.tsx's feed
  // avatars ("аватары подгружаются не через блюр с разными цветами").
  const avatarBlurDataUrl = await generateAvatarBlurDataUrl(profile.avatarUrl);

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

  return (
    <VoiceIntroProvider url={profile.voiceIntroUrl}>
    {/* Aleksandr, 2026-08-28: first tried dropping `mx-auto` to left-align
        this against the nav logo — he corrected that: "НЕ к левому
        краю... по центру страницы, как ориентир - 2 верхних таба" (NOT
        to the left edge — centered on the page, using the two top tabs
        as the reference point). Went back to `mx-auto`, which IS
        mathematically centered on the same axis as the nav's tab pill
        (verified live: both resolve to the exact same center X) — but
        he came back with a photo of his own Figma measurements showing
        it still read as left-shifted to him, and he was right: a fixed
        672px (`max-w-2xl`) box being centered isn't the same as this
        PAGE'S CONTENT looking centered, because every row here (avatar+
        name, tag pills, skill bars, language bars) is left-aligned text
        that's narrower than 672px — so the visible "mass" of the block
        sits in the box's left portion while the box's own right portion
        is invisible padding, and a centered invisible box with
        left-heavy visible content reads as shifted left.

        2026-08-28 follow-up: `w-fit` (shrink to whatever the widest row
        needs) fixed it THEN, but it's fragile — it recentres around
        whichever row happens to be widest, and it silently broke again
        the moment the Favorites section below grew a multi-column tile
        grid (games can have 8 covers): that grid's own shrink-to-fit
        "max-content" width doesn't respect wrapping, so the browser
        measured it as if all tiles sat on one line, ballooned back up
        toward the 672px `max-w-2xl` ceiling, and every other narrower
        row (name, skills, bio) was left-heavy inside that wide box all
        over again — "Опять съехал блок влево". A fixed width sidesteps
        the whole shrink-to-fit dance instead of chasing it: ~420px
        matches both his Figma measurement (~426px) and the box's own
        previous natural width (~392px), and no future row — no matter
        how wide its own content wants to be — can ever hijack the
        container's width again, since the container no longer measures
        its children to decide its own size. Mobile is untouched —
        `w-full` below max-w-2xl, `sm:w-[420px]` only kicks in at the
        desktop breakpoint. */}
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:w-[420px] sm:py-16">
      {/* Avatar sized off Instagram's own profile page as reference
          (Aleksandr, 2026-08-26): originally ~96px mobile / 150px
          desktop. Aleksandr, 2026-08-27, after seeing the voice-intro
          ring live: "оно какое-то очень большое... давай его в два раза
          уменьшим" — halved to ~48px mobile / 75px desktop. Aleksandr,
          2026-08-28: "Увеличь на 50% аватар в профиле" — back up 50% from
          that halved size, to ~72px mobile / 112.5px desktop (still well
          under the original 96/150). The ring SVG
          (components/voice-intro-ring.tsx) scales with this box
          automatically (its viewBox is relative, not fixed pixels), so
          nothing there needed to change — only the badge's own fixed
          sizing did. */}
      <div className="flex items-center gap-4 sm:gap-8">
        {/* 2026-08-30, live-testing feedback: "Возле аватара тоже додай
            таку штуку для редагування, щоб можна було швидко поміняти" —
            a small pencil badge pinned to the avatar's own corner,
            opening components/avatar-edit-button.tsx's own lightweight
            modal (separate from the full profile editor). `relative` on
            this wrapper (not on VoiceIntroRing itself, whose own layout
            this shouldn't touch) is what lets the badge position against
            the avatar specifically. */}
        <div className="relative shrink-0">
          <VoiceIntroRing>
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={150}
              height={150}
              placeholder="blur"
              blurDataURL={avatarBlurDataUrl ?? BLUR_DATA_URL}
              className="h-[72px] w-[72px] shrink-0 rounded-full object-cover sm:h-[112.5px] sm:w-[112.5px]"
              // 2026-08-31 (live report: "сломалось отображение аватаров"):
              // see app/jobs/[slug]/page.tsx's identical comment -- same
              // /api/media proxy, same Vercel Image Optimizer quota fix.
              // (The Favorites cover art just above stays on the optimizer
              // -- those are third-party OpenLibrary/TMDB/RAWG images that
              // genuinely benefit from it and aren't the quota driver.)
              unoptimized
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pickDefaultCatAvatar(profile.username)}
              alt=""
              width={150}
              height={150}
              // Rounded-full (circle), matching the real-photo branch
              // above. Aleksandr, 2026-08-29: reverted an earlier same-
              // day square-crop change here -- "профиль должен быть без
              // квадрата, там анимированные коти без фона которые
              // говорят про роль пользователя" (the profile's own
              // default-cat presentation is a separate thing, distinct
              // from the feed's and onboarding's, and was already right
              // before that square-crop change). See components/
              // post-card.tsx's PLAN.md §6.35 for the matching feed-side
              // revert of the same over-generalized fix.
              className="h-[72px] w-[72px] shrink-0 rounded-full object-cover sm:h-[112.5px] sm:w-[112.5px]"
            />
          )}
          </VoiceIntroRing>
          <AvatarEditButton username={profile.username} className="absolute bottom-0 right-0" />
        </div>
        <div className="min-w-0">
          <MarqueeName text={profile.fullName} className="text-xl font-semibold text-neutral-900 sm:text-2xl dark:text-neutral-50" />
          <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">@{profile.username}</p>
        </div>
        {/* Aleksandr, 2026-08-30 (2 screenshots of this exact header):
            "Само редактирование кнопкой думаю можно добавить в вот
            справа от Al Ex к правому краю" -- pinned to the far right of
            this row (ml-auto), not next to the name text itself, so it
            stays put regardless of how long the display name is. Renders
            nothing at all for anyone but the profile's own owner -- see
            components/edit-profile-button.tsx's own whoami-gating
            comment, same pattern components/profile-tabs.tsx already
            uses for its own owner-only drafts section. */}
        <EditProfileButton username={profile.username} className="ml-auto shrink-0 self-start" />
        {/* 2026-08-31: "давай где-то что-то накидаешь... одну кнопку
            пока, типа вот на профилях: добавить в контакты" — first-pass
            placement, right where EditProfileButton sits for the profile
            owner (the two are mutually exclusive: one profile only ever
            shows one of them). Rough sketch per his own framing, likely
            to move once he's seen it live. */}
        <AddContactButton
          username={profile.username}
          profileUserId={rawProfile?.object === "user" ? rawProfile._id : null}
          className="ml-auto shrink-0 self-start"
        />
      </div>

      {/* Fuller player element — speed + scrubbing — for the same clip
          the ring plays, per Aleksandr's 2026-08-27 follow-up asking for
          both. Shares the ring's audio state via VoiceIntroProvider so
          only one of them is ever actually playing. */}
      {profile.voiceIntroUrl && <VoiceIntroPlayer />}

      {profile.profileTitle && <p className="mt-4 text-base text-neutral-700 dark:text-neutral-300">{profile.profileTitle}</p>}

      {(() => {
        const occupationLabel = OCCUPATION_LABELS[profile.occupation] ?? null;
        return (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
            {occupationLabel && (
              <span className="inline-flex items-center gap-1.5">
                <OccupationIcon occupation={profile.occupation} background={false} />
                <T {...occupationLabel} />
              </span>
            )}
            {locationLabel && (
              <>
                {occupationLabel && <span aria-hidden="true">·</span>}
                <span>
                  <LocationLabel display={profile.location!.display} country={profile.location!.country} />
                </span>
              </>
            )}
            {profile.expertise && (
              <>
                {(occupationLabel || locationLabel) && <span aria-hidden="true">·</span>}
                <span>{profile.expertise}</span>
              </>
            )}
          </div>
        );
      })()}

      {/* Aleksandr, 2026-08-31: "убери карту из профиля совсем, должна
          быть только в постах" -- the profile map from the previous
          message was reverted; LocationMap now only renders on the job
          post detail page (app/jobs/[slug]/page.tsx). */}

      {/* Aleksandr, 2026-08-30: "должны быть просто две кнопки...
          первая -- это bio, а второе -- посты" -- ProfileTabs
          (components/profile-tabs.tsx) is the client-side tab
          switch; everything below was already fetched/rendered
          server-side either way, this only decides which half is
          visible. */}
      <ProfileTabs
        bio={
          <>
      {profile.bio && <p className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{profile.bio}</p>}

      {(profile.phone || profile.email || profile.dob) && (
        <div className="mt-6 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          {profile.phone && <div><T uk="Телефон" en="Phone" ru="Телефон" de="Telefon" es="Teléfono" fr="Téléphone" pl="Telefon" ptBR="Telefone" zh="电话" />: {profile.phone}</div>}
          {profile.email && <div>Email: {profile.email}</div>}
          {profile.dob && <div><T uk="Дата народження" en="Date of birth" ru="Дата рождения" de="Geburtsdatum" es="Fecha de nacimiento" fr="Date de naissance" pl="Data urodzenia" ptBR="Data de nascimento" zh="出生日期" />: {profile.dob}</div>}
        </div>
      )}

      {profile.links.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {profile.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {link.title || link.url}
            </a>
          ))}
        </div>
      )}

      {profile.companies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Досвід роботи" en="Work experience" ru="Опыт работы" de="Berufserfahrung" es="Experiencia laboral" fr="Expérience professionnelle" pl="Doświadczenie zawodowe" ptBR="Experiência profissional" zh="工作经验" /></h2>
          <div className="mt-3 flex flex-col gap-4">
            {profile.companies.map((company, i) => {
              // Aleksandr, 2026-08-27 (mobile app video): the app's
              // company card shows a category chip ("IT"), team size
              // ("2-10"), founding year, and a clickable website — all of
              // this was already sitting in WebProfileCompany (mostly
              // unused) except category, which needed the dataset lookup
              // above.
              //
              // 2026-08-28 fix: this used to just join raw values with
              // " · ", which rendered as the unreadable "IT · 10 · 0" —
              // Aleksandr: "IT - 10 - 0 это что?" The "10" was the bare
              // employeesCount with no unit (needs a translated suffix to
              // read as a headcount, not a mystery number), and the
              // trailing "0" was establishedYear defaulting to 0 when a
              // company has no founding year set (0 isn't a real year —
              // same "unset" treatment as null, just filtered out here
              // instead of at the schema level since other establishedYear
              // readers might still want to see the raw 0).
              const metaParts: ReactNode[] = [];
              const categoryLabel = companyCategoryLabel(company.category);
              if (categoryLabel) metaParts.push(<span key="category">{categoryLabel}</span>);
              if (company.employeesCount != null && company.employeesCount > 0) {
                metaParts.push(
                  <span key="employees">
                    {company.employeesCount}{" "}
                    <T uk="співробітників" en="employees" ru="сотрудников" de="Mitarbeiter" es="empleados" fr="employés" pl="pracowników" ptBR="funcionários" zh="名员工" />
                  </span>,
                );
              }
              if (company.establishedYear != null && company.establishedYear > 0) {
                metaParts.push(<span key="year">{company.establishedYear}</span>);
              }
              return (
                <div key={`${company.name}-${i}`}>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">{company.name}</div>
                  {company.positionDescription && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">{company.positionDescription}</div>
                  )}
                  {company.description && <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{company.description}</div>}
                  {metaParts.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {metaParts.map((part, idx) => (
                        <span key={idx} className="flex items-center gap-1.5">
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          {part}
                        </span>
                      ))}
                    </div>
                  )}
                  {company.link && (
                    <a
                      href={company.link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-1 inline-block text-sm text-accent hover:underline"
                    >
                      {company.link.title || company.link.url}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {profile.education.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Освіта" en="Education" ru="Образование" de="Ausbildung" es="Educación" fr="Formation" pl="Wykształcenie" ptBR="Formação" zh="教育背景" /></h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            {profile.education.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Навички" en="Skills" ru="Навыки" de="Fähigkeiten" es="Habilidades" fr="Compétences" pl="Umiejętności" ptBR="Habilidades" zh="技能" /></h2>
          <div className="mt-3 flex flex-col gap-2">
            {profile.skills.map((skill) => (
              <div key={skill.value} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-neutral-700 sm:w-40 dark:text-neutral-300">{skill.value}</span>
                {levelBar(skill.level, 100)}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.languages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Мови" en="Languages" ru="Языки" de="Sprachen" es="Idiomas" fr="Langues" pl="Języki" ptBR="Idiomas" zh="语言" /></h2>
          <div className="mt-3 flex flex-col gap-2">
            {profile.languages.map((lang) => (
              <div key={lang.value} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-sm text-neutral-700 sm:w-40 dark:text-neutral-300">{formatLanguageName(lang.value)}</span>
                {levelBar(lang.level, 4)}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Aleksandr, 2026-08-27, screen recordings: "Профиль отображен
          только частично. Много полей пропущенно." — hobbies/work
          interests/work-style preferences/favorite books,movies,games
          below, matched against Figma node-id=24338-3649 per his
          follow-up ("зайти, посмотреть и сопоставить"). All four raw
          fields already existed on WebProfile from that earlier pass;
          this is only the missing JSX. */}
      {hobbyLabels && profile.hobbies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Хобі" en="Hobbies" ru="Хобби" de="Hobbys" es="Aficiones" fr="Loisirs" pl="Hobby" ptBR="Hobbies" zh="爱好" /></h2>
          <div className="mt-3">
            {pillList(
              profile.hobbies
                .map((id) => hobbyLabels.get(id))
                .filter((v): v is string => Boolean(v)),
            )}
          </div>
        </section>
      )}

      {profile.workInterests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Робочі інтереси" en="Work interests" ru="Рабочие интересы" de="Berufliche Interessen" es="Intereses profesionales" fr="Intérêts professionnels" pl="Zainteresowania zawodowe" ptBR="Interesses profissionais" zh="工作兴趣" /></h2>
          <div className="mt-3">
            {pillList(
              profile.workInterests
                .map((id) => workInterestLabel(id))
                .filter((v): v is string => Boolean(v)),
            )}
          </div>
        </section>
      )}

      {workStyleDataset && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Переваги в роботі" en="Work preferences" ru="Предпочтения в работе" de="Arbeitspräferenzen" es="Preferencias laborales" fr="Préférences de travail" pl="Preferencje zawodowe" ptBR="Preferências de trabalho" zh="工作偏好" /></h2>
          <div className="mt-4 flex flex-col gap-4">
            {WORK_STYLE_PREFERENCE_SECTIONS.map(({ key, ...section }) => {
              const ids = profile.workStylePreferences[key];
              if (ids.length === 0) return null;
              const options = workStyleDataset[WORK_STYLE_DATASET_KEYS[key]];
              const labels = ids
                .map((id) => options.find((o) => o.value === id)?.text ?? null)
                .filter((v): v is string => Boolean(v));
              if (labels.length === 0) return null;
              return (
                <div key={key}>
                  <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T {...section} /></h3>
                  <div className="mt-1.5">{pillList(labels)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(profile.favoriteBooks.length > 0 || profile.favoriteMovies.length > 0 || profile.favoriteGames.length > 0) && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Улюблене" en="Favorites" ru="Любимое" de="Favoriten" es="Favoritos" fr="Favoris" pl="Ulubione" ptBR="Favoritos" zh="最爱" /></h2>
          <div className="mt-3 flex flex-col gap-6">
            {profile.favoriteBooks.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Книги" en="Books" ru="Книги" de="Bücher" es="Libros" fr="Livres" pl="Książki" ptBR="Livros" zh="书籍" /></h3>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {profile.favoriteBooks.map((book, i) =>
                    favoriteTile(book.title, book.author || null, bookCovers[i] ?? null, `book-${i}`),
                  )}
                </div>
              </div>
            )}
            {profile.favoriteMovies.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Фільми" en="Movies" ru="Фильмы" de="Filme" es="Películas" fr="Films" pl="Filmy" ptBR="Filmes" zh="电影" /></h3>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {profile.favoriteMovies.map((movie, i) =>
                    favoriteTile(movie.title, null, movieCovers[i] ?? null, `movie-${i}`),
                  )}
                </div>
              </div>
            )}
            {profile.favoriteGames.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Ігри" en="Games" ru="Игры" de="Spiele" es="Juegos" fr="Jeux" pl="Gry" ptBR="Jogos" zh="游戏" /></h3>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {profile.favoriteGames.map((game, i) =>
                    favoriteTile(game.title, null, gameCovers[i] ?? null, `game-${i}`),
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
          </>
        }
        posts={
          <>
      {authorPosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* No per-author avatar blur here (unlike the main feed pages
              and this page's own header above) -- would mean one extra
              generateAvatarBlurDataUrl() call per post, and PostCard
              already degrades cleanly to the generic shimmer without
              one. Revisit if this section ever needs to look as
              polished as the feed itself. */}
          {authorPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              // 2026-08-30: safe to pass on every profile, not just the
              // visitor's own -- see post-card.tsx's own comment on
              // ownerMenu for why PostOwnerMenu self-gates to nothing on
              // someone else's post.
              ownerMenu={{ redirectAfterDeleteTo: profileHref(profile.username) }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          <T uk="Поки що немає опублікованих постів" en="No published posts yet" ru="Пока нет опубликованных постов" de="Noch keine veröffentlichten Beiträge" es="Aún no hay publicaciones" fr="Aucune publication pour le moment" pl="Brak opublikowanych postów" ptBR="Ainda não há publicações" zh="暂无已发布的帖子" />
        </p>
      )}
          </>
        }
        postsCount={authorPosts.length}
        profileUsername={profile.username}
      />
    </main>
    </VoiceIntroProvider>
  );
}
