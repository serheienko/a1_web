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
import { fetchUserByUsername } from "@/lib/a1/users";
import {
  fetchCompanyCategories,
  fetchHobbyLabels,
  fetchWorkInterests,
  fetchWorkStylePreferences,
  WORK_STYLE_DATASET_KEYS,
} from "@/lib/a1/datasets";
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";
import { generateAvatarBlurDataUrl } from "@/lib/avatar-blur";
import { formatLanguageName } from "@/lib/format";
import { T, type Locale } from "@/components/t";
import { VoiceIntroProvider } from "@/components/voice-intro-context";
import { VoiceIntroRing } from "@/components/voice-intro-ring";
import { VoiceIntroPlayer } from "@/components/voice-intro-player";
import { OccupationIcon } from "@/components/occupation-icon";
import { OCCUPATION_LABELS } from "@/components/occupation-labels";
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

const WORK_STYLE_PREFERENCE_SECTIONS: Array<{ key: keyof typeof WORK_STYLE_DATASET_KEYS } & Record<Locale, string>> = [
  {
    key: "workEnvironment",
    uk: "Середовище роботи", en: "Work environment", ru: "Рабочая среда", de: "Arbeitsumgebung",
    es: "Entorno de trabajo", fr: "Environnement de travail", pl: "Środowisko pracy",
    ptBR: "Ambiente de trabalho", zh: "工作环境",
  },
  {
    key: "personalityType",
    uk: "Тип особистості", en: "Personality type", ru: "Тип личности", de: "Persönlichkeitstyp",
    es: "Tipo de personalidad", fr: "Type de personnalité", pl: "Typ osobowości",
    ptBR: "Tipo de personalidade", zh: "性格类型",
  },
  {
    key: "workLifeBalance",
    uk: "Баланс роботи і життя", en: "Work-life balance", ru: "Баланс работы и жизни",
    de: "Work-Life-Balance", es: "Equilibrio entre vida y trabajo", fr: "Équilibre vie pro/perso",
    pl: "Równowaga między pracą a życiem", ptBR: "Equilíbrio entre vida e trabalho", zh: "工作与生活平衡",
  },
  {
    key: "workStyle",
    uk: "Стиль роботи", en: "Work style", ru: "Стиль работы", de: "Arbeitsstil",
    es: "Estilo de trabajo", fr: "Style de travail", pl: "Styl pracy", ptBR: "Estilo de trabalho", zh: "工作风格",
  },
  {
    key: "workAvailability",
    uk: "Доступність", en: "Availability", ru: "Доступность", de: "Verfügbarkeit",
    es: "Disponibilidad", fr: "Disponibilité", pl: "Dostępność", ptBR: "Disponibilidade", zh: "可用时间",
  },
  {
    key: "projectType",
    uk: "Тип проєктів", en: "Project type", ru: "Тип проектов", de: "Projektart",
    es: "Tipo de proyecto", fr: "Type de projet", pl: "Typ projektów", ptBR: "Tipo de projeto", zh: "项目类型",
  },
  {
    key: "leadershipStyle",
    uk: "Стиль лідерства", en: "Leadership style", ru: "Стиль лидерства", de: "Führungsstil",
    es: "Estilo de liderazgo", fr: "Style de leadership", pl: "Styl przywództwa",
    ptBR: "Estilo de liderança", zh: "领导风格",
  },
  {
    key: "riskTolerance",
    uk: "Ставлення до ризику", en: "Risk tolerance", ru: "Отношение к риску", de: "Risikobereitschaft",
    es: "Tolerancia al riesgo", fr: "Tolérance au risque", pl: "Tolerancja ryzyka",
    ptBR: "Tolerância a riscos", zh: "风险承受度",
  },
  {
    key: "workloadAndTaskDelegation",
    uk: "Розподіл завдань", en: "Task delegation", ru: "Распределение задач", de: "Aufgabenverteilung",
    es: "Delegación de tareas", fr: "Délégation des tâches", pl: "Delegowanie zadań",
    ptBR: "Delegação de tarefas", zh: "任务分配",
  },
  {
    key: "decisionMakingStyle",
    uk: "Стиль прийняття рішень", en: "Decision-making style", ru: "Стиль принятия решений",
    de: "Entscheidungsstil", es: "Estilo de toma de decisiones", fr: "Style de prise de décision",
    pl: "Styl podejmowania decyzji", ptBR: "Estilo de tomada de decisão", zh: "决策风格",
  },
  {
    key: "preferredCollaborationStyle",
    uk: "Стиль співпраці", en: "Collaboration style", ru: "Стиль сотрудничества",
    de: "Zusammenarbeitsstil", es: "Estilo de colaboración", fr: "Style de collaboration",
    pl: "Styl współpracy", ptBR: "Estilo de colaboração", zh: "协作风格",
  },
  {
    key: "partnershipPreference",
    uk: "Партнерство", en: "Partnership", ru: "Партнёрство", de: "Partnerschaft",
    es: "Asociación", fr: "Partenariat", pl: "Partnerstwo", ptBR: "Parceria", zh: "合作方式",
  },
  {
    key: "preferredWorkingEnvironment",
    uk: "Бажане робоче середовище", en: "Preferred work environment", ru: "Желаемая рабочая среда",
    de: "Bevorzugte Arbeitsumgebung", es: "Entorno de trabajo preferido",
    fr: "Environnement de travail préféré", pl: "Preferowane środowisko pracy",
    ptBR: "Ambiente de trabalho preferido", zh: "理想工作环境",
  },
  {
    key: "learningStyle",
    uk: "Стиль навчання", en: "Learning style", ru: "Стиль обучения", de: "Lernstil",
    es: "Estilo de aprendizaje", fr: "Style d'apprentissage", pl: "Styl uczenia się",
    ptBR: "Estilo de aprendizagem", zh: "学习风格",
  },
];

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) notFound();

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
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pickDefaultCatAvatar(profile.username)}
              alt=""
              width={150}
              height={150}
              className="h-[72px] w-[72px] shrink-0 rounded-full object-cover sm:h-[112.5px] sm:w-[112.5px]"
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
                <OccupationIcon occupation={profile.occupation} />
                <T {...occupationLabel} />
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
    </main>
    </VoiceIntroProvider>
  );
}
