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

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { fetchUserByUsername } from "@/lib/a1/users";
import {
  fetchCompanyCategories,
  fetchHobbyLabels,
  fetchWorkInterests,
  fetchWorkStylePreferences,
  WORK_STYLE_DATASET_KEYS,
} from "@/lib/a1/datasets";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { formatLanguageName } from "@/lib/format";
import { T } from "@/components/t";
import { VoiceIntroProvider } from "@/components/voice-intro-context";
import { VoiceIntroRing } from "@/components/voice-intro-ring";
import { VoiceIntroPlayer } from "@/components/voice-intro-player";

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
    alternates: { canonical: `${SITE_URL}/u/${profile.username}` },
    openGraph: { title: profile.fullName, description, type: "profile", url: `${SITE_URL}/u/${profile.username}` },
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
          className="rounded-md bg-white px-3 py-1.5 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {item}
        </span>
      ))}
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
// Aleksandr, 2026-08-27 follow-up: occupation isn't free text — the
// openapi spec (Resource.User.Occupation) pins it to exactly these 4
// values. "none" means the user hasn't set one, so it's intentionally
// left out of this table (falsy lookup -> row doesn't render at all,
// same as before). He's also asked for the app's 3 animated cat icons
// here (one per real value) — not added yet, see the TODO comment below
// the lookup; need the actual asset files/URLs from him first.
const OCCUPATION_LABELS: Record<string, { uk: string; ru: string }> = {
  entrepreneur: { uk: "Підприємець", ru: "Предприниматель" },
  professional: { uk: "Спеціаліст", ru: "Специалист" },
  freelancer: { uk: "Фрілансер", ru: "Фрилансер" },
};

const WORK_STYLE_PREFERENCE_SECTIONS: Array<{
  key: keyof typeof WORK_STYLE_DATASET_KEYS;
  uk: string;
  ru: string;
}> = [
  { key: "workEnvironment", uk: "Середовище роботи", ru: "Рабочая среда" },
  { key: "personalityType", uk: "Тип особистості", ru: "Тип личности" },
  { key: "workLifeBalance", uk: "Баланс роботи і життя", ru: "Баланс работы и жизни" },
  { key: "workStyle", uk: "Стиль роботи", ru: "Стиль работы" },
  { key: "workAvailability", uk: "Доступність", ru: "Доступность" },
  { key: "projectType", uk: "Тип проєктів", ru: "Тип проектов" },
  { key: "leadershipStyle", uk: "Стиль лідерства", ru: "Стиль лидерства" },
  { key: "riskTolerance", uk: "Ставлення до ризику", ru: "Отношение к риску" },
  { key: "workloadAndTaskDelegation", uk: "Розподіл завдань", ru: "Распределение задач" },
  { key: "decisionMakingStyle", uk: "Стиль прийняття рішень", ru: "Стиль принятия решений" },
  { key: "preferredCollaborationStyle", uk: "Стиль співпраці", ru: "Стиль сотрудничества" },
  { key: "partnershipPreference", uk: "Партнерство", ru: "Партнёрство" },
  { key: "preferredWorkingEnvironment", uk: "Бажане робоче середовище", ru: "Желаемая рабочая среда" },
  { key: "learningStyle", uk: "Стиль навчання", ru: "Стиль обучения" },
];

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) notFound();

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
        left-heavy visible content reads as shifted left. `w-fit` fixes
        this at the root: the box shrinks to whatever its widest actual
        row needs (measured live: ~392px here, close to the ~426px he
        estimated off his Figma screenshot) and centers THAT, so the
        visible content's own center lines up with the tabs' center
        instead of a phantom 672px box's center. `max-w-2xl` stays as a
        ceiling so unusually long content (unusual bio, many tags) can't
        blow this out past the original width. Mobile is untouched —
        `w-full` below max-w-2xl, `sm:w-fit` only kicks in at the
        desktop breakpoint. */}
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:w-fit sm:py-16">
      {/* Avatar sized off Instagram's own profile page as reference
          (Aleksandr, 2026-08-26): originally ~96px mobile / 150px
          desktop. Aleksandr, 2026-08-27, after seeing the voice-intro
          ring live: "оно какое-то очень большое... давай его в два раза
          уменьшим" — halved to ~48px mobile / 75px desktop. The ring SVG
          (components/voice-intro-ring.tsx) scales with this box
          automatically (its viewBox is relative, not fixed pixels), so
          nothing there needed to change — only the badge's own fixed
          sizing did. */}
      <div className="flex items-center gap-4 sm:gap-8">
        <VoiceIntroRing>
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={150}
              height={150}
              className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-[75px] sm:w-[75px]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pickDefaultCatAvatar(profile.username)}
              alt=""
              width={150}
              height={150}
              className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-[75px] sm:w-[75px]"
            />
          )}
        </VoiceIntroRing>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl dark:text-neutral-50">{profile.fullName}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">@{profile.username}</p>
        </div>
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
                {/* TODO(Aleksandr): swap in the animated cat icon for this
                    occupation once we have the 3 asset files/URLs — one
                    per entrepreneur/professional/freelancer. */}
                <T uk={occupationLabel.uk} ru={occupationLabel.ru} />
              </span>
            )}
            {locationLabel && (
              <>
                {occupationLabel && <span aria-hidden="true">·</span>}
                <span>{locationLabel}</span>
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

      {profile.bio && <p className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{profile.bio}</p>}

      {(profile.phone || profile.email || profile.dob) && (
        <div className="mt-6 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          {profile.phone && <div><T uk="Телефон" ru="Телефон" />: {profile.phone}</div>}
          {profile.email && <div>Email: {profile.email}</div>}
          {profile.dob && <div><T uk="Дата народження" ru="Дата рождения" />: {profile.dob}</div>}
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
              className="rounded-md bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {link.title || link.url}
            </a>
          ))}
        </div>
      )}

      {profile.companies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Досвід роботи" ru="Опыт работы" /></h2>
          <div className="mt-3 flex flex-col gap-4">
            {profile.companies.map((company, i) => {
              // Aleksandr, 2026-08-27 (mobile app video): the app's
              // company card shows a category chip ("IT"), team size
              // ("2-10"), founding year, and a clickable website — all of
              // this was already sitting in WebProfileCompany (mostly
              // unused) except category, which needed the dataset lookup
              // above. One line, so meta stays out of the way when a
              // company genuinely has none of these set.
              const meta = [
                companyCategoryLabel(company.category),
                company.employeesCount != null ? `${company.employeesCount}` : null,
                company.establishedYear != null ? `${company.establishedYear}` : null,
              ].filter((v): v is string => v != null);
              return (
                <div key={`${company.name}-${i}`}>
                  <div className="font-medium text-neutral-900 dark:text-neutral-50">{company.name}</div>
                  {company.positionDescription && (
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">{company.positionDescription}</div>
                  )}
                  {company.description && <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{company.description}</div>}
                  {meta.length > 0 && (
                    <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{meta.join(" · ")}</div>
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
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Освіта" ru="Образование" /></h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            {profile.education.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Навички" ru="Навыки" /></h2>
          <div className="mt-3 flex flex-col gap-2">
            {profile.skills.map((skill) => (
              <div key={skill.value} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm text-neutral-700 dark:text-neutral-300">{skill.value}</span>
                {levelBar(skill.level, 100)}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.languages.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Мови" ru="Языки" /></h2>
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
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Хобі" ru="Хобби" /></h2>
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
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Робочі інтереси" ru="Рабочие интересы" /></h2>
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
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Переваги в роботі" ru="Предпочтения в работе" /></h2>
          <div className="mt-4 flex flex-col gap-4">
            {WORK_STYLE_PREFERENCE_SECTIONS.map(({ key, uk, ru }) => {
              const ids = profile.workStylePreferences[key];
              if (ids.length === 0) return null;
              const options = workStyleDataset[WORK_STYLE_DATASET_KEYS[key]];
              const labels = ids
                .map((id) => options.find((o) => o.value === id)?.text ?? null)
                .filter((v): v is string => Boolean(v));
              if (labels.length === 0) return null;
              return (
                <div key={key}>
                  <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk={uk} ru={ru} /></h3>
                  <div className="mt-1.5">{pillList(labels)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(profile.favoriteBooks.length > 0 || profile.favoriteMovies.length > 0 || profile.favoriteGames.length > 0) && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"><T uk="Улюблене" ru="Любимое" /></h2>
          <div className="mt-3 flex flex-col gap-4">
            {profile.favoriteBooks.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Книги" ru="Книги" /></h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {profile.favoriteBooks.map((book, i) => (
                    <li key={i}>{book.author ? `${book.title} — ${book.author}` : book.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.favoriteMovies.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Фільми" ru="Фильмы" /></h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {profile.favoriteMovies.map((movie, i) => (
                    <li key={i}>{movie.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {profile.favoriteGames.length > 0 && (
              <div>
                <h3 className="text-sm text-neutral-500 dark:text-neutral-400"><T uk="Ігри" ru="Игры" /></h3>
                <ul className="mt-1.5 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {profile.favoriteGames.map((game, i) => (
                    <li key={i}>{game.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
    </VoiceIntroProvider>
  );
}
