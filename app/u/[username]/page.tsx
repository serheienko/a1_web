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
import { pickDefaultCatAvatar } from "@/lib/avatars";
import { formatLanguageName } from "@/lib/format";
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

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await fetchUserByUsername(username);
  if (!profile) notFound();

  const locationLabel = profile.location ? profile.location.display : null;

  return (
    <VoiceIntroProvider url={profile.voiceIntroUrl}>
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      {/* Avatar sized off Instagram's own profile page as reference
          (Aleksandr, 2026-08-26): ~96px on mobile, 150px on desktop —
          noticeably bigger than the post-card/post-detail byline avatar,
          since this IS the page, not a passing mention of the author. */}
      <div className="flex items-center gap-4 sm:gap-8">
        <VoiceIntroRing>
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={150}
              height={150}
              className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-[150px] sm:w-[150px]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pickDefaultCatAvatar(profile.username)}
              alt=""
              width={150}
              height={150}
              className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-[150px] sm:w-[150px]"
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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
        {locationLabel && <span>{locationLabel}</span>}
        {profile.expertise && (
          <>
            {locationLabel && <span aria-hidden="true">·</span>}
            <span>{profile.expertise}</span>
          </>
        )}
      </div>

      {profile.bio && <p className="mt-6 whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{profile.bio}</p>}

      {(profile.phone || profile.email || profile.dob) && (
        <div className="mt-6 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
          {profile.phone && <div>Телефон: {profile.phone}</div>}
          {profile.email && <div>Email: {profile.email}</div>}
          {profile.dob && <div>Дата рождения: {profile.dob}</div>}
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
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              {link.title || link.url}
            </a>
          ))}
        </div>
      )}

      {profile.companies.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Опыт работы</h2>
          <div className="mt-3 flex flex-col gap-4">
            {profile.companies.map((company, i) => (
              <div key={`${company.name}-${i}`}>
                <div className="font-medium text-neutral-900 dark:text-neutral-50">{company.name}</div>
                {company.positionDescription && (
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">{company.positionDescription}</div>
                )}
                {company.description && <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{company.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {profile.education.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Образование</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
            {profile.education.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.skills.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Навыки</h2>
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
          <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Языки</h2>
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
    </main>
    </VoiceIntroProvider>
  );
}
