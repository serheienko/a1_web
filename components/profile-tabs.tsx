// components/profile-tabs.tsx
//
// Aleksandr, 2026-08-30, correcting §6.41's first pass (which just
// appended a "Пости" section under Favorites): "должны быть просто две
// кнопки, как у нас в мобильном приложении... первая — это bio, а
// второе — посты." A small client component purely for the tab switch
// -- app/u/[username]/page.tsx stays a server component (SEO, one round
// trip per profile) and passes both tab bodies in fully server-rendered,
// already fetched; this only toggles which one is visible. `hidden`
// rather than an unmount-on-switch so nothing here needs a second
// client-side fetch or loses scroll position when switching back.
//
// 2026-08-30 follow-up: "во вкладке посты, черновики, просто помечаем
// плашечкой draft, там где у тебя сейчас... другой: Jobs... серенький
// draft, черновики, запланированные scheduled — это уже у нас решенный
// вопрос" -- §6.45 dropped the avatar-menu's "Мої пости" row (the only
// place that showed drafts/scheduled) on the theory that this tab's
// published-only posts list already covered "my posts" unified into
// one place. That left a real gap: drafts/scheduled had nowhere to go.
// This closes it, but ONLY on the visitor's own profile -- someone
// else's profile must keep showing exactly what it showed before
// (published posts only, matching the public feed). There is no
// server-side way to know "is this the visitor's own profile" here
// (app/u/[username]/page.tsx deliberately never reads the session
// itself -- see components/post-owner-menu.tsx's own comment on why,
// same ISR-vs-dynamic-rendering reasoning applies here), so this client
// component resolves it itself: /api/account/whoami for the visitor's
// own username, compared against the `profileUsername` prop (the
// profile actually being viewed) -- only on a match does it fetch
// /api/posts/mine and render its `draftsAndScheduled` cards, above the
// server-rendered published list. Both fetches are silently skipped (no
// spinner, no error state) for a signed-out visitor or someone else's
// profile -- this is a bonus for the profile's own owner, not a
// required part of loading the tab.
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LOCALES, LOCALE_CLASS, T, type Locale } from "@/components/t";
import { PostCard } from "@/components/post-card";
import type { WebPost } from "@/types/web-post";

type StringKey = "statusDraft" | "statusScheduled";

// Same labels/colors as components/my-posts-panel.tsx's own statusOf()
// -- Aleksandr pointed at that exact scheme ("это уже у нас решенный
// вопрос... в Белке тоже были мысли, как это сделать") rather than
// asking for a new one. Both draft and scheduled get the same grayish
// treatment here (he grouped them together as "другим цветом, типа
// сереньким" for both), unlike my-posts-panel.tsx's own version where
// scheduled is accent-tinted -- that file's scheme was never itself
// confirmed live, so this follows his literal wording instead of
// copying its color 1:1.
const STRINGS: Record<StringKey, Record<Locale, string>> = {
  statusDraft: { uk: "Чернетка", en: "Draft", ru: "Черновик", de: "Entwurf", es: "Borrador", fr: "Brouillon", pl: "Szkic", ptBR: "Rascunho", zh: "草稿" },
  statusScheduled: { uk: "Заплановано", en: "Scheduled", ru: "Запланировано", de: "Geplant", es: "Programado", fr: "Planifié", pl: "Zaplanowano", ptBR: "Agendado", zh: "已定时" },
};

const STATUS_BADGE_CLASS = "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";

function useActiveLocale(): Locale {
  const [lang, setLang] = useState<Locale>("uk");
  useEffect(() => {
    const root = document.documentElement;
    const active = LOCALES.find((l) => root.classList.contains(LOCALE_CLASS[l]));
    if (active) setLang(active);
  }, []);
  return lang;
}

type MinePostCard = { post: WebPost; status: "draft" | "scheduled" };

export function ProfileTabs({
  bio,
  posts,
  postsCount,
  profileUsername,
}: {
  bio: ReactNode;
  posts: ReactNode;
  postsCount: number;
  profileUsername: string;
}) {
  const [tab, setTab] = useState<"bio" | "posts">("bio");
  const lang = useActiveLocale();
  const [ownDrafts, setOwnDrafts] = useState<MinePostCard[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/whoami")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok || data.username !== profileUsername) return null;
        // Only reached when this IS the visitor's own profile.
        return fetch("/api/posts/mine").then((r) => r.json());
      })
      .then((data) => {
        if (cancelled || !data || !data.ok) return;
        setOwnDrafts(data.draftsAndScheduled as MinePostCard[]);
      })
      .catch(() => {
        // Signed out, or either call failed -- no drafts/scheduled
        // section, same as before this feature existed.
      });
    return () => {
      cancelled = true;
    };
  }, [profileUsername]);

  return (
    <div className="mt-6">
      {/* Aleksandr, 2026-08-30, screenshot of this exact pill: "сделай
          заливку кнопки полностью FFFFF 100%, а то она теряется" --
          bg-white/100 forces Tailwind's opacity-variable-based
          background color to a literal fully opaque white (bypassing
          --tw-bg-opacity entirely) on the active tab below, rather than
          relying on plain `bg-white`, in case something upstream was
          ever leaving that variable less than 1 and washing it out
          against the light-gray pill behind it. */}
      <div className="flex gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
        <button
          type="button"
          onClick={() => setTab("bio")}
          aria-pressed={tab === "bio"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "bio"
              ? "bg-white/100 text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")
          }
        >
          <T uk="Про мене" en="Bio" ru="О себе" de="Bio" es="Bio" fr="Bio" pl="Bio" ptBR="Bio" zh="简介" />
        </button>
        <button
          type="button"
          onClick={() => setTab("posts")}
          aria-pressed={tab === "posts"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "posts"
              ? "bg-white/100 text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")
          }
        >
          <T uk="Пости" en="Posts" ru="Посты" de="Beiträge" es="Publicaciones" fr="Publications" pl="Posty" ptBR="Publicações" zh="帖子" />
          {postsCount > 0 ? ` (${postsCount})` : ""}
        </button>
      </div>

      <div hidden={tab !== "bio"}>{bio}</div>
      <div hidden={tab !== "posts"}>
        {ownDrafts.length > 0 && (
          <div className="mb-4 flex flex-col gap-4">
            {ownDrafts.map(({ post, status }) => (
              <PostCard
                key={post.id}
                post={post}
                statusBadge={{ label: STRINGS[status === "draft" ? "statusDraft" : "statusScheduled"][lang], className: STATUS_BADGE_CLASS }}
              />
            ))}
          </div>
        )}
        {posts}
      </div>
    </div>
  );
}
