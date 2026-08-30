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
        // Aleksandr, 2026-08-30 (screen recording): reloading a profile
        // right after this shipped crashed the whole page -- root cause,
        // confirmed by inspection rather than reproduced directly (this
        // sandbox can't hit the live API): a tab that already had
        // /api/posts/mine's OLD response cached, or a request that raced
        // a rolling deploy, gets back `{ ok: true, posts }` with no
        // `draftsAndScheduled` field at all (it didn't exist before this
        // feature). `data.ok` alone doesn't guarantee that field's
        // shape -- setOwnDrafts(undefined) then crashed on the very next
        // render's `ownDrafts.length`/`ownDrafts.map`, with no
        // profile-specific error boundary to catch it (app/error.tsx is
        // the global fallback, hence the unrelated "не вдалося
        // завантажити вакансії" copy in what was actually a profile-page
        // crash). Validating the shape here, not just `data.ok`, means
        // any unexpected response degrades to "no drafts/scheduled
        // shown" -- same as before this feature existed -- instead of
        // taking the whole page down.
        if (Array.isArray(data.draftsAndScheduled)) {
          // 2026-08-30 follow-up (Aleksandr, live: opening/reloading a
          // profile with a draft crashed with "Не вдалося завантажити
          // профіль" again even after the Array.isArray guard above --
          // reproduced live, console showed "TypeError: e.getTime is
          // not a function" from lib/format.ts's formatRelativeTime(),
          // called by PostCard with `post.publishedAt`. Root cause:
          // WebPost's `publishedAt`/`updatedAt` are typed as `Date`,
          // which holds for `posts` (server-rendered, passed down as a
          // prop -- Next's RSC payload keeps real Date instances across
          // that boundary), but NOT for this array -- it crossed a
          // plain `fetch().json()` from a CLIENT component, and
          // `JSON.stringify` on the API route turned those Dates into
          // ISO strings with nothing on this end to revive them.
          // `ownDrafts` is also rendered into the DOM even while the
          // "Про мене" tab is active (this whole section only gets
          // `hidden`, not unmounted -- see this component's own header
          // comment on why), so the crash could happen right after
          // opening the profile, before ever touching the "Пости" tab,
          // matching every "просто открыл профиль и упало" report so
          // far. Reviving both fields back into real Date objects here
          // keeps this array honoring the same WebPost contract the
          // server-rendered `posts` prop already does, instead of
          // quietly handing PostCard a string where its type says Date.
          const revived = (data.draftsAndScheduled as MinePostCard[]).map((card) => ({
            ...card,
            post: {
              ...card.post,
              publishedAt: new Date(card.post.publishedAt),
              updatedAt: card.post.updatedAt ? new Date(card.post.updatedAt) : null,
            },
          }));
          setOwnDrafts(revived);
        }
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
      {/* Aleksandr, 2026-08-30: "сделай заливку кнопки полностью FFFFF
          100%, а то она теряется" -- first pass (bg-white/100) was
          already, measurably, pure #FFFFFF (confirmed by sampling the
          live screenshot's pixels: 255,255,255 exactly) -- the real
          complaint wasn't opacity, it was that white-on-nearly-white
          (bg-neutral-100 container, ~245,245,245) barely reads as
          "highlighted" at all. He then pointed at site-nav.tsx's own
          Вакансії/Фахівці switcher as the exact effect he wants copied:
          a plain WHITE outer pill with the active tab tinted
          `bg-accent/15 text-accent` (light blue), not a
          gray-container-with-white-tab scheme -- copied byte-for-byte
          from that component below (container: `bg-white
          dark:bg-neutral-900`; active button: `bg-accent/15
          text-accent`) instead of inventing a new treatment here. */}
      <div className="flex gap-1 rounded-full bg-white p-1 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setTab("bio")}
          aria-pressed={tab === "bio"}
          className={
            "flex-1 rounded-full py-2 text-sm font-medium transition " +
            (tab === "bio"
              ? "bg-accent/15 text-accent"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
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
              ? "bg-accent/15 text-accent"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50")
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
